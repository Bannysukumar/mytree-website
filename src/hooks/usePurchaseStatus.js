import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useWaitForTransactionReceipt } from "wagmi";
import { db, firebaseReady } from "../lib/firebase";
import { readPendingTx } from "../lib/referralUtils";

export function usePurchaseStatus(txHash) {
  const stored = readPendingTx();
  const hash = txHash || stored?.hash;
  const receipt = useWaitForTransactionReceipt({ hash, query: { enabled: Boolean(hash) } });
  const [record, setRecord] = useState(null);

  useEffect(() => {
    if (!firebaseReady || !db || !hash) return undefined;
    return onSnapshot(doc(db, "purchases", hash.toLowerCase()), (snap) => {
      setRecord(snap.exists() ? snap.data() : null);
    });
  }, [hash]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") receipt.refetch?.();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [receipt]);

  const chainStatus = receipt.isSuccess ? "confirmed" : receipt.isError ? "failed" : hash ? "confirming" : "";
  const status = record?.status || chainStatus || "idle";
  return { hash, status, record, receipt };
}
