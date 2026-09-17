import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import WalletRedirect from "./components/WalletRedirect";
import { functions } from "./lib/firebase";
import { clearPendingTx, readPendingTx } from "./lib/referralUtils";
import { readBuyReturn, readJoinReturn, readPageReturn } from "./lib/dashRedirect";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import JoinReferral from "./pages/JoinReferral";

function HomeEntry() {
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const back = readBuyReturn() || readPageReturn() || readJoinReturn();
  if (back) return <Navigate to={back} replace />;
  if (ref) return <Navigate to={`/join?ref=${encodeURIComponent(ref)}`} replace />;
  return <Home />;
}

function PurchaseReporter() {
  useEffect(() => {
    const pending = readPendingTx();
    if (!pending?.hash || !functions) return undefined;
    let stopped = false;
    async function report() {
      try {
        const recorded = await httpsCallable(functions, "registerPendingPurchase")({
          txHash: pending.hash,
          buyer: pending.buyer || "",
          referrer: pending.referrer || "",
        });
        if (!stopped && ["confirmed", "failed"].includes(recorded.data?.status)) clearPendingTx();
      } catch {
        // The scheduled checker retries if this page closes before the call finishes.
      }
    }
    report();
    return () => {
      stopped = true;
    };
  }, []);
  return null;
}

export default function App() {
  const location = useLocation();
  const shell = location.pathname.startsWith("/admin") ? "admin" : location.pathname.startsWith("/dashboard") ? "dashboard" : "public";
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <WalletRedirect />
      <PurchaseReporter />
      <div key={shell} className="reveal">
        <Routes location={location}>
          <Route path="/" element={<HomeEntry />} />
          <Route path="/join" element={<JoinReferral />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:section" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/:tab" element={<Admin />} />
        </Routes>
      </div>
    </>
  );
}
