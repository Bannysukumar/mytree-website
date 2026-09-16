import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { formatNumber } from "../lib/format";
import { useReferralCode } from "../hooks/useReferralCode";
import { useReferralStats } from "../hooks/useReferralStats";
import { useWallet } from "../hooks/useWallet";
import ReferralSignup from "./ReferralSignup";

export default function ReferralDashboard() {
  const { address, isConnected } = useWallet();
  const { shareLink, activate, busy, error, referrerWallet } = useReferralCode();
  const stats = useReferralStats();
  const [copied, setCopied] = useState(false);
  const link = shareLink;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  if (!isConnected) {
    return (
      <div className="glass rounded-3xl p-6">
        <h3 className="font-display text-2xl text-foam">Your referral desk</h3>
        <p className="mt-2 text-sm text-white/65">Connect a wallet to generate a code, QR, and earnings total. Signing the profile message is free — it proves the code belongs to that wallet.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6">
      <h3 className="font-display text-2xl text-foam">Your referral desk</h3>
      {link && (
        <div className="mt-4">
          <p className="text-sm text-white/65">Your unique link is this wallet address.</p>
          <p className="mt-2 break-all text-sm text-mint">{link}</p>
          <button type="button" onClick={copy} className="mt-3 rounded-full border border-white/15 px-3 py-1.5 text-xs">{copied ? "Copied" : "Copy link"}</button>
        </div>
      )}
      {isConnected && <p className="mt-4 break-all text-sm text-foam"><span className="text-white/50">Your wallet </span>{address}</p>}
      {referrerWallet ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-white/50">Sponsor wallet</p>
          <p className="mt-1 break-all rounded-md border border-mint/40 bg-ink px-3 py-3 text-sm text-foam">{referrerWallet}</p>
          <p className="mt-2 text-sm text-mint">Valid sponsor wallet. This link cannot be changed.</p>
        </div>
      ) : (
        <ReferralSignup activate={activate} busy={busy} error={error} ownAddress={address || ""} />
      )}
      <ul className="mt-4 space-y-2 text-sm">
        {(stats.downlines || []).map((row) => (
          <li key={row.wallet} className="flex items-center justify-between gap-3">
            <span className="break-all text-foam">{row.wallet}</span>
            <span className={row.bought ? "text-mint" : "text-sand"}>{row.bought ? "Bought" : "Not bought"}</span>
          </li>
        ))}
        {!stats.downlines?.length && <li className="text-white/50">No downlines yet.</li>}
      </ul>
      <div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="rounded-2xl bg-white p-2">{link && <QRCodeSVG value={link} size={104} />}</div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-white/40">Referrals</dt><dd className="text-xl text-foam">{stats.referralCount}</dd></div>
          <div><dt className="text-white/40">Bonus earned</dt><dd className="text-xl text-mint">{formatNumber(stats.totalBonus, 2)}</dd></div>
        </dl>
      </div>
      {error && <p className="mt-3 text-sm text-clay">{error}</p>}
    </div>
  );
}
