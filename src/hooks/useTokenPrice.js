import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { presaleAbi } from "../lib/contractConfig";
import { useSiteContent } from "./useSiteContent";

export function useTokenPrice() {
  const { sale } = useSiteContent();
  const address = sale?.contractAddress;
  const enabled = Boolean(address);
  const price = useReadContract({
    address,
    abi: presaleAbi,
    functionName: "getCurrentPrice",
    query: { enabled },
  });
  const remaining = useReadContract({
    address,
    abi: presaleAbi,
    functionName: "tokensRemaining",
    query: { enabled },
  });
  const sold = useReadContract({
    address,
    abi: presaleAbi,
    functionName: "tokensSold",
    query: { enabled },
  });
  const paused = useReadContract({
    address,
    abi: presaleAbi,
    functionName: "paused",
    query: { enabled },
  });

  return {
    priceUsd: Number(sale?.priceUsd || 0),
    priceInr: Number(sale?.priceInr || 0),
    nativeUsdRate: Number(sale?.nativeUsdRate || 0),
    chainPriceEth: price.data ? formatEther(price.data) : sale?.chainPriceEth || "",
    tokensRemaining: remaining.data ? Number(formatEther(remaining.data)) : null,
    tokensSold: sold.data ? Number(formatEther(sold.data)) : Number(sale?.chainTokensSold || sale?.tokensSold || 0),
    paused: typeof paused.data === "boolean" ? paused.data : Boolean(sale?.paused || sale?.chainPaused),
    sale,
  };
}
