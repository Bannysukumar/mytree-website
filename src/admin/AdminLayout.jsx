import { NavLink } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import {
  ClipboardList,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings2,
  Shield,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";

const groups = [
  {
    label: "Operate",
    links: [
      ["Overview", "overview", LayoutDashboard],
      ["Sale", "sale", Settings2],
      ["Treasury", "treasury", Wallet],
      ["Referrals", "referrals", Users],
    ],
  },
  {
    label: "Records",
    links: [
      ["Purchases", "purchases", Receipt],
      ["Donations", "donations", Gift],
      ["Ledger", "ledger", ClipboardList],
      ["Audit", "audit", Shield],
    ],
  },
  {
    label: "Site",
    links: [
      ["Content", "content", FileText],
      ["Wallets", "wallets", Wallet],
      ["User dashboard", "dashboard", SlidersHorizontal],
    ],
  },
];

function href(id) {
  return id === "overview" ? "/admin" : `/admin/${id}`;
}

export default function AdminLayout({ user, onSignOut, tab, onTab, children }) {
  return (
    <div id="main" className="admin-console lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="admin-side p-4">
        <div className="flex items-center justify-between gap-3 lg:block">
          <a href="/" className="block px-2 text-foam">
            <BrandMark />
            <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Admin</span>
          </a>
          <button type="button" onClick={onSignOut} className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm text-slate-300 hover:bg-white/5 lg:hidden">
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Admin sections">
          {groups.flatMap((group) => group.links).map(([label, id, Icon]) => (
            <NavLink
              key={id}
              to={href(id)}
              end={id === "overview"}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-white/10 bg-white/5 px-3 text-sm text-slate-200 aria-[current=page]:border-mint aria-[current=page]:bg-leaf aria-[current=page]:font-semibold aria-[current=page]:text-ink"
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <label className="sr-only">
          Section
          <select className="mt-1 w-full" value={tab} onChange={(e) => onTab(e.target.value)}>
            {groups.flatMap((group) => group.links).map(([label, id]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        <nav className="mt-6 hidden space-y-6 lg:block" aria-label="Admin">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.links.map(([label, id, Icon]) => (
                  <NavLink key={id} to={href(id)} end={id === "overview"} className="admin-side-link">
                    <Icon size={16} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-6 hidden border-t border-white/10 px-2 pt-4 text-xs lg:block">
          <p className="truncate text-slate-400">{user?.email}</p>
          <div className="mt-3 flex gap-3">
            <NavLink to="/" className="min-h-11 inline-flex items-center text-mint">View site</NavLink>
            <button type="button" onClick={onSignOut} className="inline-flex min-h-11 items-center gap-1 text-slate-300 hover:text-foam">
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-main min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</div>
    </div>
  );
}
