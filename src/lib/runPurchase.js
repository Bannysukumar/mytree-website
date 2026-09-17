import { getAddress, zeroAddress } from "viem";
import { erc20Abi, presaleAbi } from "./contractConfig";
import { armBuyReturn, clearBuyReturn, clearPageReturn, herePath } from "./dashRedirect";
import { clearPendingBuy, readPendingBuy, savePendingBuy } from "./pendingBuy";
import { rememberPendingTx } from "./referralUtils";
import { prepareWalletReturn } from "./wagmi";

let walletTask = null;

export function walletBusy() {
  return Boolean(walletTask);
}

export function runExclusive(task) {
  if (walletTask) return Promise.reject(new Error("Finish the open wallet request before starting another."));
  walletTask = Promise.resolve()
    .then(task)
    .finally(() => {
      walletTask = null;
    });
  return walletTask;
}

function units(amount) {
  if (typeof amount === "bigint") return amount;
  if (typeof amount === "string" && /^\d+$/.test(amount)) return BigInt(amount);
  throw new Error("Enter a USDT amount.");
}

async function allowanceOf(publicClient, usdtAddress, buyer, saleAddress) {
  if (!publicClient) return 0n;
  return publicClient.readContract({
    address: getAddress(usdtAddress),
    abi: erc20Abi,
    functionName: "allowance",
    args: [getAddress(buyer), getAddress(saleAddress)],
  });
}

export async function runUsdtPurchase({
  writeContractAsync,
  publicClient,
  chainId,
  currentChainId,
  switchChainAsync,
  saleAddress,
  usdtAddress,
  buyer,
  amount,
  referrer,
  resume = false,
  onStatus,
  returnPath,
  displayAmount = "",
}) {
  const existing = resume ? readPendingBuy() : null;
  const back = returnPath || existing?.returnPath || herePath();
  const shown = String(displayAmount || existing?.displayAmount || "");
  armBuyReturn(back);
  await prepareWalletReturn({ persist: true, path: back });
  if (!resume) clearPendingBuy();
  if (currentChainId !== chainId && switchChainAsync) {
    onStatus?.("Approve the network switch in your wallet.");
    await switchChainAsync({ chainId });
  }
  const spend = units(amount);
  const sponsor = referrer && referrer !== zeroAddress ? getAddress(referrer) : zeroAddress;
  const pending = {
    buyer,
    saleAddress,
    usdtAddress,
    chainId,
    amount: spend.toString(),
    referrer: sponsor,
    displayAmount: shown,
    returnPath: back,
  };
  savePendingBuy({ ...pending, step: "approve" });

  let allowed = await allowanceOf(publicClient, usdtAddress, buyer, saleAddress);
  if (resume && allowed < spend) {
    onStatus?.("Waiting for the USDT approval to confirm, then the transfer will open.");
    for (let attempt = 0; attempt < 8 && allowed < spend; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      allowed = await allowanceOf(publicClient, usdtAddress, buyer, saleAddress);
    }
  }
  if (allowed < spend) {
    onStatus?.("Approve the USDT spend in your wallet. Stay on this page after approving.");
    armBuyReturn(back);
    await prepareWalletReturn({ persist: true, path: back });
    const approval = await writeContractAsync({
      address: usdtAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [getAddress(saleAddress), spend],
      chainId,
    });
    onStatus?.("USDT approval sent. The transfer opens after that response confirms.");
    if (publicClient && approval) await publicClient.waitForTransactionReceipt({ hash: approval });
  }

  savePendingBuy({ ...pending, step: "buy" });
  onStatus?.("Approve the token transfer in your wallet.");
  armBuyReturn(back);
  await prepareWalletReturn({ persist: true, path: back });
  const hash = await writeContractAsync({
    address: getAddress(saleAddress),
    abi: presaleAbi,
    functionName: "buyTokens",
    args: [spend, sponsor],
    chainId,
  });
  clearPendingBuy();
  clearBuyReturn();
  clearPageReturn();
  rememberPendingTx({ hash, buyer });
  return hash;
}
