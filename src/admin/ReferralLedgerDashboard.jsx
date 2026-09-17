import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, firebaseReady } from "../lib/firebase";
import { formatNumber, shortAddress } from "../lib/format";
import { DataTable, StatusBadge } from "./ui";

export default function ReferralLedgerDashboard() {
  const [rows, setRows] = useState([]);
  const [leaders, setLeaders] = useState([]);
  useEffect(() => {
    if (!firebaseReady) return undefined;
    const unsub = onSnapshot(query(collection(db, "referralLedger"), orderBy("createdAt", "desc"), limit(40)), (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(query(collection(db, "users"), orderBy("lifetimeBonus", "desc"), limit(10)), (snap) => {
      setLeaders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsub();
      unsubUsers();
    };
  }, []);
  return (
    <div>
      <h1 className="font-display text-h2 text-foam">Referral ledger</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">Each row is referral income accrued on a confirmed USDT purchase. A confirmed purchase with no row means the sponsor had not already bought, so that share was not paid to anyone. Claimable means the tokens are still in the contract until that wallet claims. A claim sends only $MYTREE.</p>
      <h2 className="mt-6 text-sm uppercase tracking-wider text-white/40">Top referrers</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {leaders.map((user) => (
          <li key={user.id} className="flex justify-between rounded-xl bg-white/5 px-3 py-2">
            <span>{shortAddress(user.wallet || user.id)}</span>
            <span className="text-mint">{formatNumber(user.lifetimeBonus || 0, 2)} · {user.referralCount || 0} referrals</span>
          </li>
        ))}
      </ul>
      <DataTable
        rows={rows}
        searchKeys={["role", "earnerId", "buyerId", "status"]}
        columns={[
          { key: "role", label: "Role" },
          { key: "earnerId", label: "Earner", render: (row) => shortAddress(row.earnerId) },
          { key: "buyerId", label: "Buyer", render: (row) => shortAddress(row.buyerId) },
          { key: "amountDisplay", label: "Tokens", render: (row) => formatNumber(row.amountDisplay || 0, 2) },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
        ]}
      />
    </div>
  );
}
