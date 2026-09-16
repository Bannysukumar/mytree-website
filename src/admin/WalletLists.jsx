import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useWriteContract } from "wagmi";
import { db } from "../lib/firebase";
import { audit } from "../lib/adminApi";
import { presaleAbi } from "../lib/contractConfig";
import { useSiteContent } from "../hooks/useSiteContent";
import { Toast } from "./ui";

export default function WalletLists({ user }) {
  const { sale } = useSiteContent();
  const [lists, setLists] = useState({ blacklist: [], whitelist: [] });
  const [address, setAddress] = useState("");
  const [which, setWhich] = useState("blacklist");
  const [message, setMessage] = useState("");
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    const unsubs = ["blacklist", "whitelist"].map((id) =>
      onSnapshot(doc(db, "walletLists", id), (snap) => {
        setLists((prev) => ({ ...prev, [id]: snap.data()?.addresses || [] }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  async function add() {
    const wallet = address.trim().toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
      setMessage("Enter a valid wallet address.");
      return;
    }
    const next = Array.from(new Set([...(lists[which] || []), wallet]));
    await setDoc(doc(db, "walletLists", which), { addresses: next }, { merge: true });
    await audit(user, `wallet:${which}`, wallet, `added ${wallet}`);
    setAddress("");
    setMessage("Wallet added to the list.");
  }

  async function sync() {
    if (!sale?.contractAddress) {
      setMessage("Set the presale address first.");
      return;
    }
    const fn = which === "blacklist" ? "setBlacklist" : "setWhitelist";
    await writeContractAsync({
      address: sale.contractAddress,
      abi: presaleAbi,
      functionName: fn,
      args: [lists[which], true],
    });
    setMessage("Submitted to the contract from the owner wallet.");
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Wallet lists</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/60">Flag suspicious referral wallets here, then push the list on-chain. A blacklisted buyer cannot purchase. A blacklisted referrer earns nothing.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {["blacklist", "whitelist"].map((id) => (
          <button key={id} type="button" onClick={() => setWhich(id)} className={`rounded-full px-3 py-1 text-sm ${which === id ? "bg-leaf text-ink" : "bg-white/5"}`}>{id}</button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" aria-label="Wallet address" aria-invalid={Boolean(message && message.includes("valid"))} className="min-h-11 flex-1 rounded-control border border-white/10 bg-ink px-3 text-sm aria-[invalid=true]:border-clay" />
        <button type="button" onClick={add} className="min-h-11 rounded-control bg-leaf px-4 text-sm font-semibold text-ink">Add</button>
        <button type="button" onClick={() => { setAddress(""); setMessage(""); }} className="min-h-11 rounded-control border border-white/15 px-4 text-sm">Clear</button>
        <button type="button" onClick={sync} className="min-h-11 rounded-control border border-white/15 px-4 text-sm">Push on-chain</button>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {(lists[which] || []).map((item) => <li key={item} className="rounded-xl bg-white/5 px-3 py-2 font-mono">{item}</li>)}
      </ul>
      {message && <p className={`mt-3 text-sm ${message.includes("valid") || message.includes("first") ? "text-clay" : "text-mint"}`} role="alert">{message}</p>}
      <Toast message={message} />
    </div>
  );
}
