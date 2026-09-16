import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db, firebaseReady } from "../lib/firebase";

const empty = {
  loading: true,
  config: null,
  winners: [],
  ownership: [],
};

export function useDashboardConfig(wallet) {
  const [state, setState] = useState(empty);

  useEffect(() => {
    if (!firebaseReady || !db) {
      fetch("/seed/dashboard.json")
        .then((r) => r.json())
        .then((config) => setState({ loading: false, config, winners: [], ownership: [] }))
        .catch(() => setState({ loading: false, config: null, winners: [], ownership: [] }));
      return undefined;
    }
    const unsubs = [
      onSnapshot(
        doc(db, "config", "dashboard"),
        async (snap) => {
          if (snap.exists()) {
            setState((prev) => ({ ...prev, loading: false, config: snap.data() }));
            return;
          }
          const fallback = await fetch("/seed/dashboard.json").then((r) => r.json()).catch(() => null);
          setState((prev) => ({ ...prev, loading: false, config: fallback }));
        },
        () => setState((prev) => ({ ...prev, loading: false }))
      ),
      onSnapshot(collection(db, "leaderboardWinners"), (snap) => {
        setState((prev) => ({
          ...prev,
          winners: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }));
      }, () => {}),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    if (!firebaseReady || !db || !wallet) return undefined;
    return onSnapshot(collection(db, "ownership"), (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((row) => String(row.wallet || "").toLowerCase() === wallet.toLowerCase());
      setState((prev) => ({ ...prev, ownership: rows }));
    }, () => {});
  }, [wallet]);

  return state;
}
