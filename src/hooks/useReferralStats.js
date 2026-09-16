import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, firebaseReady } from "../lib/firebase";
import { useWallet } from "./useWallet";

function rowsOf(snap) {
  return snap.docs.map((d) => ({ id: d.id, wallet: d.id, ...d.data() }));
}

export function useReferralStats() {
  const { address } = useWallet();
  const [ledger, setLedger] = useState([]);
  const [direct, setDirect] = useState([]);
  const [second, setSecond] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const me = address?.toLowerCase() || "";

  useEffect(() => {
    if (!me || !firebaseReady || !db) return undefined;
    const q = query(collection(db, "referralLedger"), where("earnerId", "==", me));
    return onSnapshot(q, (snap) => setLedger(rowsOf(snap)), () => setLedger([]));
  }, [me]);

  useEffect(() => {
    if (!me || !firebaseReady || !db) return undefined;
    const q = query(collection(db, "users"), where("referredBy", "==", me));
    return onSnapshot(q, (snap) => setDirect(rowsOf(snap)), () => setDirect([]));
  }, [me]);

  useEffect(() => {
    if (!firebaseReady || !db) return undefined;
    const ids = direct.map((row) => row.wallet).filter(Boolean).slice(0, 10);
    if (!ids.length) {
      setSecond([]);
      return undefined;
    }
    const q = query(collection(db, "users"), where("referredBy", "in", ids));
    return onSnapshot(q, (snap) => setSecond(rowsOf(snap)), () => setSecond([]));
  }, [direct]);

  useEffect(() => {
    if (!firebaseReady || !db) return undefined;
    const ids = [...direct, ...second].map((row) => row.wallet).filter(Boolean).slice(0, 10);
    if (!ids.length) {
      setPurchases([]);
      return undefined;
    }
    const q = query(collection(db, "purchases"), where("buyer", "in", ids));
    return onSnapshot(q, (snap) => setPurchases(rowsOf(snap)), () => setPurchases([]));
  }, [direct, second]);

  const boughtBy = new Map();
  purchases.filter((row) => row.status === "confirmed").forEach((row) => {
    const buyer = String(row.buyer || "").toLowerCase();
    boughtBy.set(buyer, (boughtBy.get(buyer) || 0) + Number(row.tokensWhole || 0));
  });

  const downlines = [
    ...direct.map((row) => ({ ...row, level: 1 })),
    ...second.map((row) => ({ ...row, level: 2 })),
  ].map((row) => {
    const wallet = String(row.wallet || row.id).toLowerCase();
    const tokens = boughtBy.get(wallet) || 0;
    const bought = tokens > 0 || Number(row.purchaseCount || 0) > 0;
    return { ...row, wallet, bought, tokens };
  });

  const earned = ledger.reduce((sum, row) => sum + Number(row.amountDisplay || 0), 0);
  return {
    ledger,
    downlines,
    referralCount: downlines.length,
    totalBonus: earned,
  };
}
