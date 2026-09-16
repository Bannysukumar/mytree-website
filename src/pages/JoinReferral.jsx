import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAddress, isAddress } from "viem";
import ConnectButton from "../components/ConnectButton";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useReferralCode } from "../hooks/useReferralCode";
import { useWallet } from "../hooks/useWallet";
import { shortAddress } from "../lib/format";
import { clearJoinReturn, markJoinReturn } from "../lib/dashRedirect";
import { prepareWalletReturn } from "../lib/wagmi";

function sponsorState(value, ownAddress) {
  const raw = String(value || "").trim();
  if (!raw) return { ok: false, message: "Sponsor wallet address is required." };
  if (!isAddress(raw)) return { ok: false, message: "Sponsor wallet address must be a valid wallet address." };
  const sponsor = getAddress(raw);
  if (ownAddress && sponsor.toLowerCase() === ownAddress.toLowerCase()) {
    return { ok: false, message: "You cannot use your own wallet as the sponsor." };
  }
  return { ok: true, sponsor, message: "Valid sponsor wallet." };
}

export default function JoinReferral() {
  const navigate = useNavigate();
  const { address, isConnected } = useWallet();
  const { activate, busy, error, referrerWallet } = useReferralCode();
  const [params] = useSearchParams();
  const fromLink = params.get("ref") || "";
  const [sponsor, setSponsor] = useState(() => (isAddress(fromLink) ? getAddress(fromLink) : ""));
  const [notice, setNotice] = useState("");
  const check = sponsorState(sponsor, address);

  useEffect(() => {
    if (isAddress(fromLink)) setSponsor(getAddress(fromLink));
  }, [fromLink]);

  useEffect(() => {
    if (!sponsor && isAddress(referrerWallet || "")) setSponsor(getAddress(referrerWallet));
  }, [referrerWallet, sponsor]);

  useEffect(() => {
    markJoinReturn();
    prepareWalletReturn();
  }, [fromLink]);

  async function confirm(event) {
    event.preventDefault();
    if (!isConnected) {
      setNotice("Connect your wallet first.");
      return;
    }
    if (!check.ok) {
      setNotice(check.message);
      return;
    }
    setNotice("");
    const saved = await activate(check.sponsor);
    if (!saved) return;
    clearJoinReturn();
    navigate("/dashboard/referral");
  }

  return (
    <>
      <Navbar />
      <main id="main" className="page py-10">
        <section className="mx-auto max-w-xl rounded-card border border-white/10 bg-moss p-6 shadow-card md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">Referral</p>
          <h1 className="mt-2 font-display text-3xl text-foam">Join with a sponsor</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">Your wallet and the sponsor wallet are shown here. The sponsor must be a valid wallet address before you can continue.</p>

          <form onSubmit={confirm} className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your wallet</p>
              {isConnected ? (
                <p className="mt-2 break-all rounded-control border border-white/10 bg-ink px-4 py-3 font-medium text-foam">{address}</p>
              ) : (
                <div className="mt-2 space-y-3">
                  <p className="text-sm text-slate-300">Connect a wallet to show your address.</p>
                  <ConnectButton />
                </div>
              )}
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sponsor wallet</span>
              <input
                value={sponsor}
                onChange={(e) => setSponsor(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                aria-invalid={!check.ok}
                aria-describedby="sponsor-status"
                placeholder="0x…"
                className={`mt-2 w-full rounded-control border bg-ink px-4 py-3 text-sm text-foam outline-none ${check.ok ? "border-mint/40" : "border-clay/60"}`}
              />
              <p id="sponsor-status" className={`mt-2 text-sm ${check.ok ? "text-mint" : "text-clay"}`} role="status">{check.message}</p>
              {check.ok && <p className="mt-1 text-xs text-slate-400">Shown as {shortAddress(check.sponsor)}</p>}
            </label>

            <button type="submit" disabled={!isConnected || !check.ok || busy} className="flex min-h-11 w-full items-center justify-center rounded-control bg-leaf px-4 py-3 font-semibold text-ink disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40">
              {busy ? "Waiting for wallet…" : "Confirm sponsor"}
            </button>
            {(notice || error) && <p className="text-sm text-clay" role="alert">{notice || error}</p>}
          </form>

          <p className="mt-5 text-sm text-slate-400">Stay on this page after connecting. The dashboard opens only after Confirm sponsor is approved in the wallet.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
