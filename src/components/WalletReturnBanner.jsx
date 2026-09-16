import { siteUrl } from "../lib/wagmi";
import { readReferralCode } from "../lib/referralUtils";

function inWalletBrowser() {
  const ua = navigator.userAgent || "";
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const branded = /MetaMask|Trust|TokenPocket|CoinbaseWallet|OKX|Bitget/i.test(ua);
  return mobile && (branded || Boolean(window.ethereum));
}

export default function WalletReturnBanner() {
  if (typeof navigator === "undefined" || !inWalletBrowser()) return null;
  const ref = readReferralCode();
  const href = ref
    ? `${siteUrl.replace(/\/$/, "")}/join?ref=${encodeURIComponent(ref)}`
    : `${siteUrl.replace(/\/$/, "")}/#buy`;
  return (
    <div className="bg-sand px-5 py-3 text-center text-sm text-ink">
      You are in a wallet browser. After signing,{" "}
      <a className="font-semibold underline" href={href}>Return to Mytree Ecosystem</a>
      {" "}if the app does not bring you back. We confirm the transaction on this site, not only inside the wallet.
    </div>
  );
}
