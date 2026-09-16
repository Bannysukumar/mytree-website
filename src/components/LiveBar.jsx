import { formatNumber, formatUsd } from "../lib/format";
import { useTokenPrice } from "../hooks/useTokenPrice";

export default function LiveBar() {
  const price = useTokenPrice();
  return (
    <div className="border-b border-white/10 bg-[#111827] text-sm">
      <div className="page flex flex-wrap items-center justify-between gap-3 py-2">
        <p className="font-medium text-foam">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
          {price.paused ? "Presale is paused" : "Presale is open on BNB Smart Chain"}
        </p>
        <div className="flex items-center gap-4">
          <p className="text-slate-300">
            {price.priceInr ? `₹${formatNumber(price.priceInr, Number(price.priceInr) % 1 === 0 ? 0 : 2)} per mytree` : "Price set in admin"}
            {price.priceUsd ? ` · ${formatUsd(price.priceUsd)} USDT` : ""} · USDT only
          </p>
          <a href="#buy" className="inline-flex min-h-11 items-center rounded-md bg-leaf px-4 text-sm font-semibold text-ink">Buy now</a>
        </div>
      </div>
    </div>
  );
}
