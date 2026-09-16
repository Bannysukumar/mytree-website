import { useState } from "react";
import { useConnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { LogOut, Wallet } from "lucide-react";
import { shortAddress } from "../lib/format";
import { walletConnectEnabled } from "../lib/wagmi";
import { useWallet } from "../hooks/useWallet";
import { markDashboardRedirect } from "../lib/dashRedirect";
import { prepareWalletReturn } from "../lib/wagmi";

function AccountChip({ onDisconnect }) {
  const { address, chain, balance } = useWallet();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="chip-in min-h-11 rounded-control border border-mint/30 bg-pine px-3 py-2 text-left text-sm" aria-expanded={open} aria-label="Connected wallet">
        <span className="block font-medium text-foam">{shortAddress(address)}</span>
        <span className="block text-[11px] text-white/60">
          {chain?.name || "Network"} · {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "—"}
        </span>
      </button>
      {open && (
        <button
          type="button"
          onClick={() => {
            onDisconnect();
            setOpen(false);
          }}
          className="absolute right-0 z-20 mt-2 flex items-center gap-2 rounded-xl bg-pine px-3 py-2 text-sm text-foam shadow-card"
        >
          <LogOut size={14} /> Disconnect
        </button>
      )}
    </div>
  );
}

function ModalButton() {
  const { open } = useWeb3Modal();
  const { isConnected, disconnect } = useWallet();
  if (isConnected) return <AccountChip onDisconnect={disconnect} />;
  return (
      <button type="button" onClick={async () => { await prepareWalletReturn({ persist: true }); markDashboardRedirect(); open(); }} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-leaf px-4 py-2.5 text-sm font-semibold text-ink transition-opacity duration-200 hover:opacity-90">
      <Wallet size={16} /> Connect Wallet
    </button>
  );
}

function InjectedButton() {
  const { isConnected, disconnect } = useWallet();
  const { connect, connectors, isPending } = useConnect();
  const [open, setOpen] = useState(false);
  if (isConnected) return <AccountChip onDisconnect={disconnect} />;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-leaf px-4 py-2.5 text-sm font-semibold text-ink transition-opacity duration-200 hover:opacity-90">
        <Wallet size={16} /> Connect Wallet
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl bg-pine p-4 text-sm shadow-card">
          <p className="text-white/70">Browser wallets on this device. Add a WalletConnect project id for the QR code and mobile deep links.</p>
          <div className="mt-3 space-y-2">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={async () => {
                  await prepareWalletReturn({ persist: true });
                  markDashboardRedirect();
                  connect({ connector });
                  setOpen(false);
                }}
                className="block w-full rounded-xl bg-white/5 px-3 py-2 text-left text-foam"
              >
                {connector.name}
              </button>
            ))}
          </div>
          <button type="button" className="mt-3 text-xs text-white/50" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default function ConnectButton() {
  if (walletConnectEnabled) return <ModalButton />;
  return <InjectedButton />;
}
