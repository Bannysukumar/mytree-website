import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, firebaseReady } from "../lib/firebase";
import { DataTable } from "./ui";

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!firebaseReady) return undefined;
    return onSnapshot(query(collection(db, "auditLog"), orderBy("createdAt", "desc"), limit(80)), (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);
  return (
    <div>
      <h1 className="font-display text-h2 text-foam">Audit log</h1>
      <div className="mt-6">
        <DataTable
          rows={rows}
          searchKeys={["action", "actorEmail", "target", "summary"]}
          columns={[
            { key: "action", label: "Action", render: (row) => <span className="text-mint">{row.action}</span> },
            { key: "actorEmail", label: "Actor" },
            { key: "target", label: "Target" },
            { key: "summary", label: "Summary" },
          ]}
        />
      </div>
    </div>
  );
}
