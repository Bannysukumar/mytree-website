import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import seedDocuments from "../../public/seed/documents.json";
import { db, firebaseReady } from "../lib/firebase";
import { sortByOrder } from "../lib/format";

function withIds(snap) {
  return sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export function useDocuments() {
  const [rows, setRows] = useState(() => sortByOrder(seedDocuments));
  const [loading, setLoading] = useState(firebaseReady);

  useEffect(() => {
    if (!firebaseReady || !db) {
      fetch("/seed/documents.json")
        .then((r) => r.json())
        .then((data) => {
          setRows(sortByOrder(data));
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return undefined;
    }
    return onSnapshot(collection(db, "documents"), (snap) => {
      setRows(snap.empty ? sortByOrder(seedDocuments) : withIds(snap));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  return { documents: rows, loading, visible: rows.filter((row) => row.hidden !== true) };
}
