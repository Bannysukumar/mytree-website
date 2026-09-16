import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AdminLayout from "../admin/AdminLayout";
import AuditLog from "../admin/AuditLog";
import ContentEditor from "../admin/ContentEditor";
import DonationsDashboard from "../admin/DonationsDashboard";
import PurchasesDashboard from "../admin/PurchasesDashboard";
import ReferralConfigEditor from "../admin/ReferralConfigEditor";
import ReferralLedgerDashboard from "../admin/ReferralLedgerDashboard";
import SaleControls from "../admin/SaleControls";
import TreasuryControls from "../admin/TreasuryControls";
import WalletLists from "../admin/WalletLists";
import DashboardStudio from "../admin/DashboardStudio";
import { useSiteContent } from "../hooks/useSiteContent";
import { auth, db, firebaseReady } from "../lib/firebase";
import { Skeleton } from "../components/ui";
import { formatNumber } from "../lib/format";
import { FileText, Gift, Receipt, Settings2, Users, Wallet } from "lucide-react";
import AdminLogin from "./AdminLogin";

const tabs = ["overview", "content", "sale", "treasury", "referrals", "purchases", "donations", "ledger", "wallets", "audit", "dashboard"];

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [allowed, setAllowed] = useState(false);
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const tab = tabs.includes(tabParam) ? tabParam : "overview";
  const content = useSiteContent();

  useEffect(() => {
    if (tabParam && !tabs.includes(tabParam)) navigate("/admin", { replace: true });
  }, [tabParam, navigate]);

  function setTab(id) {
    navigate(id === "overview" ? "/admin" : `/admin/${id}`);
  }

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setUser(null);
      return undefined;
    }
    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (!next?.email) {
        setAllowed(false);
        return;
      }
      const token = await next.getIdTokenResult();
      const snap = await getDoc(doc(db, "adminEmails", next.email.toLowerCase()));
      setAllowed(Boolean(token.claims.admin || snap.exists()));
    });
  }, []);

  if (user === undefined) {
    return (
      <div className="admin-console grid gap-4 p-8 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (!user) return <AdminLogin />;
  if (!allowed) {
    return (
      <AdminLogin
        onDenied
      />
    );
  }

  return (
    <AdminLayout user={user} tab={tab} onTab={setTab} onSignOut={() => signOut(auth)}>
      {tab === "overview" && <Overview content={content} />}
      {tab === "content" && <ContentEditor user={user} content={content} />}
      {tab === "sale" && <SaleControls user={user} />}
      {tab === "treasury" && <TreasuryControls />}
      {tab === "referrals" && <ReferralConfigEditor user={user} />}
      {tab === "purchases" && <PurchasesDashboard />}
      {tab === "donations" && <DonationsDashboard />}
      {tab === "ledger" && <ReferralLedgerDashboard />}
      {tab === "wallets" && <WalletLists user={user} />}
      {tab === "audit" && <AuditLog />}
      {tab === "dashboard" && <DashboardStudio user={user} config={content.dashboard} />}
    </AdminLayout>
  );
}

function Overview({ content }) {
  const sale = content.sale || {};
  const referral = content.referral || {};
  return (
    <div>
      <p className="text-caption font-semibold uppercase text-slate-500">Admin only</p>
      <h1 className="mt-1 font-display text-h2 text-foam">Overview</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">Source: {content.source === "firestore" ? "Firestore" : "local seed"}. Contract token and USDT balances are on Treasury, not on the public site.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card label="USDT price" value={`$${sale.priceUsd || "—"}`} tone="mint" note="Published buy price" />
        <Card label="Tokens sold" value={formatNumber(sale.chainTokensSold || sale.tokensSold || 0)} tone="info" note={sale.paused ? "Sale marked paused" : "Sale open in the UI"} />
        <Card label="Claimable referral" value={`${referral.referrerBonusPercentage || 0}% / ${referral.additionalLevels?.[0]?.percentage ?? 0}%`} tone="sand" note="Direct / upstream, tokens only" />
        <Card label="INR donations" value={formatNumber(content.stats?.fundsRaisedInr || 0)} tone="leaf" note="Does not buy tokens" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["/admin/sale", "Sale", "Price, limits, and contract address", Settings2, "text-mint"],
          ["/admin/treasury", "Treasury", "Token and USDT balances", Wallet, "text-info"],
          ["/admin/referrals", "Referrals", "10% and 5% claimable rates", Users, "text-sand"],
          ["/admin/purchases", "Purchases", "Confirmed USDT buys", Receipt, "text-mint"],
          ["/admin/donations", "Donations", "INR gifts only", Gift, "text-sand"],
          ["/admin/content", "Content", "Tracks, stories, and legal copy", FileText, "text-info"],
        ].map(([href, label, note, Icon, color]) => (
          <Link key={href} to={href} className="admin-panel flex items-center gap-3 p-4 transition hover:border-mint/40">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-control bg-white/5 ${color}`}><Icon size={18} aria-hidden="true" /></span>
            <span>
              <span className="block font-medium text-foam">{label}</span>
              <span className="block text-sm text-slate-400">{note}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Card({ label, value, tone = "mint", note }) {
  const bar = { mint: "bg-mint", info: "bg-info", sand: "bg-sand", leaf: "bg-leaf" }[tone] || "bg-mint";
  return (
    <div className="admin-panel overflow-hidden p-0">
      <div className={`h-1 ${bar}`} />
      <div className="p-4">
        <p className="stat-label">{label}</p>
        <p className="mt-2 font-display text-3xl tabular-nums text-foam">{value}</p>
        {note && <p className="mt-2 text-sm text-slate-400">{note}</p>}
      </div>
    </div>
  );
}
