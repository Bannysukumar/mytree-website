// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MytreeToken
/// @notice Fixed-supply ERC-20 for the Mytree Ecosystem community token.
///         The entire 10,000,000,000 mytree supply is minted once, to the
///         treasury, at deployment. There is no further mint function.
contract MytreeToken is ERC20, Ownable {
    /// @dev 10 billion tokens, 18 decimals.
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10 ** 18;

    /// @param treasury Receives the full supply. Typically a multisig, not an EOA.
    /// @param initialOwner Contract owner (administrative). Minting is not owner-gated
    ///        because it only happens here, once.
    constructor(address treasury, address initialOwner) ERC20("mytree", "mytree") Ownable(initialOwner) {
        require(treasury != address(0), "treasury required");
        _mint(treasury, MAX_SUPPLY);
    }
}
