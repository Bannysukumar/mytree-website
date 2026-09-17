import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, firebaseReady } from "../lib/firebase";
import { formatNumber, shortAddress } from "../lib/format";
import { useSiteContent } from "../hooks/useSiteContent";
import { DataTable, StatusBadge } from "./ui";

export default function PurchasesDashboard() {
  const [rows, setRows] = useState([]);
  const { sale, stats } = useSiteContent();
  useEffect(() => {
    if (!firebaseReady) return undefined;
    const q = query(collection(db, "purchases"), orderBy("createdAt", "desc"), limit(40));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setRows([]));
  }, []);
  const raised = rows.filter((r) => r.status === "confirmed").length;
  return (
    <div>
      <h1 className="font-display text-h2 text-foam">Purchases</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Confirmed in this list" value={raised} />
        <Stat label="Tokens sold (public stat)" value={formatNumber(stats?.tokensSold || sale?.chainTokensSold || sale?.tokensSold || 0)} />
        <Stat label="Round remaining (display)" value={formatNumber(Math.max(0, Number(sale?.roundSupply || 0) - Number(sale?.chainTokensSold || sale?.tokensSold || 0)))} />
      </div>
      <DataTable
        rows={rows}
        searchKeys={["status", "buyer", "txHash", "tokensWhole"]}
        columns={[
          { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
          { key: "buyer", label: "Buyer", render: (row) => shortAddress(row.buyer) },
          { key: "tokensWhole", label: "Tokens", render: (row) => formatNumber(row.tokensWhole || 0, 4) },
          { key: "referralSkippedReason", label: "Referral", render: (row) => row.referralSkippedReason ? "Skipped" : row.status === "confirmed" ? "Recorded" : "Waiting" },
          { key: "txHash", label: "Tx", render: (row) => <span className="text-slate-400">{shortAddress(row.txHash)}</span> },
        ]}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="glass p-4"><p className="stat-label">{label}</p><p className="mt-1 font-display text-2xl">{value}</p></div>;
}
