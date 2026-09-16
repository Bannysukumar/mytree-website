import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import WalletRedirect from "./components/WalletRedirect";
import { readJoinReturn, readPageReturn } from "./lib/dashRedirect";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import JoinReferral from "./pages/JoinReferral";

function HomeEntry() {
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const back = readPageReturn() || readJoinReturn();
  if (back) return <Navigate to={back} replace />;
  if (ref) return <Navigate to={`/join?ref=${encodeURIComponent(ref)}`} replace />;
  return <Home />;
}

export default function App() {
  const location = useLocation();
  const shell = location.pathname.startsWith("/admin") ? "admin" : location.pathname.startsWith("/dashboard") ? "dashboard" : "public";
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <WalletRedirect />
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
