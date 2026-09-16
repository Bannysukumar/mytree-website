import { useEffect, useState } from "react";
import { getAddress, isAddress } from "viem";

export default function ReferralSignup({ activate, busy, error, sponsor = "", locked = false, ownAddress = "" }) {
  const [wallet, setWallet] = useState(sponsor);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isAddress(sponsor)) setWallet(getAddress(sponsor));
  }, [sponsor]);

  const value = wallet.trim();
  const valid = isAddress(value);
  const self = valid && ownAddress && getAddress(value).toLowerCase() === ownAddress.toLowerCase();
  const message = !value
    ? "Sponsor wallet address is required."
    : !valid
      ? "Sponsor wallet address must be a valid wallet address."
      : self
        ? "You cannot use your own wallet as the sponsor."
        : "Valid sponsor wallet.";

  async function submit(event) {
    event.preventDefault();
    if (!valid || self) {
      setLocalError(message);
      return;
    }
    setLocalError("");
    await activate(getAddress(value));
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
        Sponsor wallet
        <input
          value={wallet}
          readOnly={locked}
          onChange={(e) => setWallet(e.target.value)}
          aria-invalid={!valid || self}
          placeholder="0x…"
          className={`mt-1 w-full break-all rounded-md border bg-ink px-3 py-3 text-sm ${valid && !self ? "border-mint/40" : "border-clay/60"}`}
        />
      </label>
      <p className={`text-sm ${valid && !self ? "text-mint" : "text-clay"}`} role="status">{message}</p>
      <button type="submit" disabled={busy || !valid || self} className="min-h-11 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Waiting for signature…" : "Confirm sponsor"}
      </button>
      {(localError || error) && <p className="text-sm text-clay" role="alert">{localError || error}</p>}
    </form>
  );
}
