// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MytreePresale
/// @notice Sells $MYTREE for BEP20 USDT. Referral bonuses accrue as $MYTREE
///         and move only when the earner calls claim. A claim never sends USDT.
///         INR is not accepted. Donations stay off this contract.
///
/// Example: A referred B, and B refers C. Referral income is paid once, on the
/// buyer's first purchase, and only to a sponsor who has already bought.
/// When C buys 100 tokens, C receives 100 immediately. If B has bought, B can
/// claim 10. If A has bought, A can claim 5 even when B's 10 is skipped.
/// Later purchases by the same buyer pay no further referral income.
///
/// Accounting split:
///   - `tokensSold` counts only tokens the buyer paid for.
///   - Referral bonuses are drawn from a separate rewards pool cap.
///
/// A wallet cannot refer itself, and the first referrer bound to a wallet sticks.
contract MytreePresale is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint8 public constant MAX_LEVELS = 5;

    IERC20 public immutable token;
    IERC20 public usdt;

    /// @notice USDT units required to buy 1 whole token (1e18 token units).
    uint256 public pricePerToken;
    uint256 public minPurchase;
    uint256 public maxPurchase;
    /// @notice Cap on tokens *sold* (not bonuses) in the current round, 18 decimals.
    uint256 public roundCap;
    uint256 public tokensSold;
    /// @notice Cumulative bonus tokens already claimed.
    uint256 public rewardsPaid;
    /// @notice Bonus tokens reserved for claims, including those already claimed.
    uint256 public rewardsAllocated;
    uint256 public rewardsPoolCap;

    /// @dev 1000 = 10%. Stored as basis points so admin percentages stay precise.
    uint16 public referrerBonusBps;
    uint16 public buyerBonusBps;
    /// @notice Total referrer depth including the direct referrer (level 1).
    uint8 public maxDepth;
    /// @notice Bonus bps for levels 2..N. Index 0 is level 2.
    uint16[] public upstreamBps;

    bool public whitelistEnabled;
    mapping(address => bool) public whitelisted;
    mapping(address => bool) public blacklisted;
    /// @notice First-touch referrer. Zero if the buyer has never used a valid code.
    mapping(address => address) public referrerOf;
    /// @notice True after a wallet's first successful purchase. Later buys do not pay referral income.
    mapping(address => bool) public hasPurchased;
    /// @notice Lifetime referral tokens accrued, including amounts already claimed.
    mapping(address => uint256) public referralEarnings;
    /// @notice Unclaimed referral tokens. `claim` sends only $MYTREE.
    mapping(address => uint256) public claimable;

    event TokensPurchased(address indexed buyer, uint256 usdtPaid, uint256 tokensReceived);
    event ReferralAccrued(address indexed earner, uint256 amount);
    event ReferralClaimed(address indexed earner, uint256 amount);
    event PriceUpdated(uint256 pricePerToken);
    event LimitsUpdated(uint256 minPurchase, uint256 maxPurchase);
    event ReferralConfigUpdated(uint256 referrerBps, uint256 buyerBps, uint8 maxDepth);
    event TokenDeposited(address indexed token, address indexed from, uint256 amount);
    event UsdtUpdated(address indexed usdt);

    error InvalidPrice();
    error LimitsOutOfRange();
    error BelowMinimum();
    error AboveMaximum();
    error RoundSoldOut();
    error RewardsCapExceeded();
    error InsufficientInventory();
    error NotWhitelisted();
    error BlacklistedBuyer();
    error ZeroAddress();
    error NothingToClaim();
    error SaleStarted();
    error WrongDecimals();
    error CapBelowAllocated();

    constructor(
        address tokenAddress,
        address initialOwner,
        uint256 initialPricePerToken,
        uint256 initialMin,
        uint256 initialMax,
        uint256 initialRoundCap,
        uint256 initialRewardsCap,
        address usdtAddress
    ) Ownable(initialOwner) {
        if (tokenAddress == address(0) || usdtAddress == address(0)) revert ZeroAddress();
        if (IERC20Metadata(tokenAddress).decimals() != 18 || IERC20Metadata(usdtAddress).decimals() != 18) {
            revert WrongDecimals();
        }
        if (initialPricePerToken == 0) revert InvalidPrice();
        if (initialMin == 0 || initialMax < initialMin) revert LimitsOutOfRange();

        token = IERC20(tokenAddress);
        usdt = IERC20(usdtAddress);
        pricePerToken = initialPricePerToken;
        minPurchase = initialMin;
        maxPurchase = initialMax;
        roundCap = initialRoundCap;
        rewardsPoolCap = initialRewardsCap;
        referrerBonusBps = 1000; // 10% to the direct referrer (B)
        buyerBonusBps = 0;
        maxDepth = 2;
        upstreamBps.push(500); // 5% to the referrer's referrer (A)
    }

    /// @notice Quote how many base tokens `value` wei will buy at the current price.
    function quoteTokens(uint256 value) public view returns (uint256) {
        if (pricePerToken == 0) return 0;
        return (value * 1e18) / pricePerToken;
    }

    function getCurrentPrice() external view returns (uint256) {
        return pricePerToken;
    }

    function tokensRemaining() external view returns (uint256) {
        if (tokensSold >= roundCap) return 0;
        return roundCap - tokensSold;
    }

    function getReferralBonuses() external view returns (uint16 referrerBps, uint16 buyerBps, uint8 depth) {
        return (referrerBonusBps, buyerBonusBps, maxDepth);
    }

    /// @notice Bind the caller's first referrer without buying. Required so a
    ///         later purchase by someone they refer can pay this wallet's upline.
    function attachReferrer(address referrer) external {
        _bindReferrer(msg.sender, referrer);
    }

    /// @notice Buy $MYTREE with USDT. The buyer receives the purchased tokens now.
    ///         Referral bonuses are credited to `claimable` and are not sent here.
    function buyTokens(uint256 usdtAmount, address referrer) external nonReentrant whenNotPaused {
        if (blacklisted[msg.sender]) revert BlacklistedBuyer();
        if (whitelistEnabled && !whitelisted[msg.sender]) revert NotWhitelisted();
        if (usdtAmount < minPurchase) revert BelowMinimum();
        if (usdtAmount > maxPurchase) revert AboveMaximum();

        uint256 purchased = quoteTokens(usdtAmount);
        if (purchased == 0) revert InvalidPrice();
        if (tokensSold + purchased > roundCap) revert RoundSoldOut();

        _bindReferrer(msg.sender, referrer);

        bool firstPurchase = !hasPurchased[msg.sender];
        address[MAX_LEVELS] memory earners;
        uint256[MAX_LEVELS] memory amounts;
        uint8 count;
        uint256 buyerBonus;
        if (firstPurchase) {
            (earners, amounts, count, buyerBonus) = _quoteBonuses(msg.sender, purchased);
        }

        uint256 bonusTotal = buyerBonus;
        for (uint8 i = 0; i < count; i++) {
            bonusTotal += amounts[i];
        }
        uint256 unclaimed = rewardsAllocated - rewardsPaid;
        if (rewardsAllocated + bonusTotal > rewardsPoolCap) revert RewardsCapExceeded();
        if (token.balanceOf(address(this)) < purchased + unclaimed + bonusTotal) revert InsufficientInventory();

        tokensSold += purchased;
        hasPurchased[msg.sender] = true;
        rewardsAllocated += bonusTotal;
        if (buyerBonus > 0) {
            claimable[msg.sender] += buyerBonus;
            referralEarnings[msg.sender] += buyerBonus;
            emit ReferralAccrued(msg.sender, buyerBonus);
        }
        for (uint8 i = 0; i < count; i++) {
            claimable[earners[i]] += amounts[i];
            referralEarnings[earners[i]] += amounts[i];
            emit ReferralAccrued(earners[i], amounts[i]);
        }

        uint256 usdtBefore = usdt.balanceOf(address(this));
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);
        if (usdt.balanceOf(address(this)) - usdtBefore < usdtAmount) revert InvalidPrice();
        token.safeTransfer(msg.sender, purchased);
        emit TokensPurchased(msg.sender, usdtAmount, purchased);
    }

    /// @notice Send only accrued $MYTREE to the caller. Does not send USDT.
    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender] = 0;
        rewardsPaid += amount;
        token.safeTransfer(msg.sender, amount);
        emit ReferralClaimed(msg.sender, amount);
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert InvalidPrice();
        pricePerToken = newPrice;
        emit PriceUpdated(newPrice);
    }

    /// @param referrerPct Referrer bonus in basis points (1000 = 10%).
    /// @param buyerPct Buyer bonus in basis points (500 = 5%).
    function setReferralBonuses(uint256 referrerPct, uint256 buyerPct) external onlyOwner {
        require(referrerPct <= 2000 && buyerPct <= 2000, "bonus too high");
        referrerBonusBps = uint16(referrerPct);
        buyerBonusBps = uint16(buyerPct);
        emit ReferralConfigUpdated(referrerPct, buyerPct, maxDepth);
    }

    /// @param bps Bonus for levels 2..N. Empty array disables upstream levels.
    /// @param depth Max referrer depth including the direct referrer. 1 = direct only.
    function setUpstreamLevels(uint16[] calldata bps, uint8 depth) external onlyOwner {
        require(depth >= 1 && depth <= MAX_LEVELS, "depth");
        require(bps.length <= MAX_LEVELS - 1, "too many levels");
        delete upstreamBps;
        for (uint256 i = 0; i < bps.length; i++) {
            require(bps[i] <= 2000, "level too high");
            upstreamBps.push(bps[i]);
        }
        maxDepth = depth;
        emit ReferralConfigUpdated(referrerBonusBps, buyerBonusBps, depth);
    }

    /// @notice Correct a wrong USDT address only before the first purchase.
    ///         After `tokensSold` is non-zero the payment token is frozen.
    function setUsdt(address next) external onlyOwner {
        if (tokensSold != 0) revert SaleStarted();
        if (next == address(0)) revert ZeroAddress();
        if (IERC20Metadata(next).decimals() != 18) revert WrongDecimals();
        usdt = IERC20(next);
        emit UsdtUpdated(next);
    }

    function setRewardsPoolCap(uint256 cap) external onlyOwner {
        if (cap < rewardsAllocated) revert CapBelowAllocated();
        rewardsPoolCap = cap;
    }

    /// @notice Disabled. Renouncing would strand USDT proceeds in this contract.
    function renounceOwnership() public pure override {
        revert("renounce disabled");
    }

    function setRoundCap(uint256 cap) external onlyOwner {
        require(cap >= tokensSold, "below sold");
        roundCap = cap;
    }

    function setLimits(uint256 min, uint256 max) external onlyOwner {
        if (min == 0 || max < min) revert LimitsOutOfRange();
        minPurchase = min;
        maxPurchase = max;
        emit LimitsUpdated(min, max);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Pull an ERC-20 into this contract. The owner must approve this contract first.
    ///         Use it for $MYTREE inventory and for BEP20 USDT.
    function depositToken(address erc20, uint256 amount) external onlyOwner {
        if (erc20 == address(0) || amount == 0) revert ZeroAddress();
        IERC20(erc20).safeTransferFrom(msg.sender, address(this), amount);
        emit TokenDeposited(erc20, msg.sender, amount);
    }

    /// @notice Send native coin held by this contract to `to`.
    function withdraw(address payable to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        (bool ok, ) = to.call{value: bal}("");
        require(ok, "withdraw failed");
    }

    /// @notice Recover unsold $MYTREE (or any ERC-20 accidentally sent here).
    function withdrawToken(address erc20, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (erc20 == address(token)) {
            uint256 unclaimed = rewardsAllocated - rewardsPaid;
            uint256 bal = token.balanceOf(address(this));
            if (bal < amount || bal - amount < unclaimed) revert InsufficientInventory();
        }
        IERC20(erc20).safeTransfer(to, amount);
    }

    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
    }

    function setWhitelist(address[] calldata accounts, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelisted[accounts[i]] = allowed;
        }
    }

    function setBlacklist(address[] calldata accounts, bool blocked) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            blacklisted[accounts[i]] = blocked;
        }
    }

    function upstreamLevelCount() external view returns (uint256) {
        return upstreamBps.length;
    }

    /// @dev Binds the first valid referrer. Ignores self-referral and cycles.
    function _bindReferrer(address buyer, address referrer) internal {
        if (referrerOf[buyer] != address(0)) return;
        if (referrer == address(0) || referrer == buyer || blacklisted[referrer]) return;
        if (_createsCycle(buyer, referrer)) return;
        referrerOf[buyer] = referrer;
    }

    function _createsCycle(address buyer, address referrer) internal view returns (bool) {
        address cursor = referrer;
        for (uint8 i = 0; i < MAX_LEVELS; i++) {
            if (cursor == buyer) return true;
            cursor = referrerOf[cursor];
            if (cursor == address(0)) return false;
        }
        return false;
    }

    function _quoteBonuses(address buyer, uint256 purchased)
        internal
        view
        returns (address[MAX_LEVELS] memory earners, uint256[MAX_LEVELS] memory amounts, uint8 count, uint256 buyerBonus)
    {
        address direct = referrerOf[buyer];
        if (direct == address(0) || direct == buyer) {
            return (earners, amounts, 0, 0);
        }

        buyerBonus = (purchased * buyerBonusBps) / BPS_DENOMINATOR;

        // A sponsor who has not bought is skipped. Their share is not paid to anyone else.
        if (!blacklisted[direct] && hasPurchased[direct]) {
            uint256 directBonus = (purchased * referrerBonusBps) / BPS_DENOMINATOR;
            if (directBonus > 0) {
                earners[count] = direct;
                amounts[count] = directBonus;
                count++;
            }
        }

        if (maxDepth <= 1) return (earners, amounts, count, buyerBonus);

        address cursor = referrerOf[direct];
        uint8 depth = 2;
        uint256 idx = 0;
        while (cursor != address(0) && depth <= maxDepth && idx < upstreamBps.length && count < MAX_LEVELS) {
            if (cursor != buyer && !blacklisted[cursor] && hasPurchased[cursor] && upstreamBps[idx] > 0) {
                uint256 bonus = (purchased * upstreamBps[idx]) / BPS_DENOMINATOR;
                if (bonus > 0) {
                    earners[count] = cursor;
                    amounts[count] = bonus;
                    count++;
                }
            }
            cursor = referrerOf[cursor];
            depth++;
            idx++;
        }
    }

    function _roleForIndex(uint8 index) internal pure returns (string memory) {
        if (index == 0) return "referrer";
        if (index == 1) return "level2";
        if (index == 2) return "level3";
        if (index == 3) return "level4";
        return "level5";
    }
}
