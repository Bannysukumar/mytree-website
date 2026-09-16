import { getAddress, zeroAddress } from "viem";
import { erc20Abi, presaleAbi } from "./contractConfig";
import { clearPageReturn } from "./dashRedirect";
import { clearPendingBuy, savePendingBuy } from "./pendingBuy";
import { rememberPendingTx } from "./referralUtils";
import { prepareWalletReturn } from "./wagmi";

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
}) {
  await prepareWalletReturn({ persist: true });
  if (!resume) clearPendingBuy();
  if (currentChainId !== chainId && switchChainAsync) await switchChainAsync({ chainId });
  const spend = typeof amount === "bigint" ? amount : BigInt(amount);
  const sponsor = referrer && referrer !== zeroAddress ? getAddress(referrer) : zeroAddress;
  const pending = {
    buyer,
    saleAddress,
    usdtAddress,
    chainId,
    amount: spend.toString(),
    referrer: sponsor,
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
    await prepareWalletReturn({ persist: true });
    await writeContractAsync({
      address: usdtAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [getAddress(saleAddress), spend],
      chainId,
    });
  }

  savePendingBuy({ ...pending, step: "buy" });
  onStatus?.("Approve the token transfer in your wallet.");
  await prepareWalletReturn({ persist: true });
  const hash = await writeContractAsync({
    address: getAddress(saleAddress),
    abi: presaleAbi,
    functionName: "buyTokens",
    args: [spend, sponsor],
    chainId,
  });
  clearPendingBuy();
  clearPageReturn();
  rememberPendingTx({ hash, buyer });
  return hash;
}
