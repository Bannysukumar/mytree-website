import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, firebaseReady } from "../lib/firebase";
import { formatInr } from "../lib/format";
import { DataTable, StatusBadge } from "./ui";

export default function DonationsDashboard() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!firebaseReady) return undefined;
    const q = query(collection(db, "donations"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);
  return (
    <div>
      <h1 className="font-display text-h2 text-foam">Donations</h1>
      <p className="mt-2 text-sm text-slate-400">INR only. A paid row never issued $MYTREE and never paid a referral.</p>
      <div className="mt-6">
        <DataTable
          rows={rows}
          searchKeys={["status", "name", "email", "purpose", "paymentId", "orderId"]}
          columns={[
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "amountInr", label: "Amount", render: (row) => formatInr(row.amountInr) },
            { key: "name", label: "Donor", render: (row) => <span>{row.name || "—"}<span className="block text-xs text-slate-400">{row.email}</span></span> },
            { key: "purpose", label: "Purpose" },
            { key: "paymentId", label: "Payment", render: (row) => <span className="text-slate-400">{row.paymentId || row.orderId || "—"}</span> },
          ]}
        />
      </div>
    </div>
  );
}
