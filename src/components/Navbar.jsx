import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import BrandMark from "./BrandMark";
import ConnectButton from "./ConnectButton";
import { useWallet } from "../hooks/useWallet";

const links = [
  ["Forest", "/#forest"],
  ["Guide", "/#guide"],
  ["Tracks", "/#tracks"],
  ["Buy", "/#buy"],
  ["Donate", "/#donate"],
  ["Documents", "/documents"],
  ["Refer", "/#referral"],
  ["Stories", "/#stories"],
  ["Contact", "/#contact"],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [bar, setBar] = useState({ x: 0, scale: 0 });
  const navRef = useRef(null);
  const { isConnected } = useWallet();
  const { pathname } = useLocation();
  const onHome = pathname === "/";
  const onDocuments = pathname === "/documents";

  function place(node) {
    const nav = navRef.current;
    if (!nav || !node) return;
    const parent = nav.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    setBar({ x: box.left - parent.left, scale: box.width });
  }

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      const current = [...document.querySelectorAll("[data-nav]")].find((node) => {
        const href = node.getAttribute("href") || node.getAttribute("to") || "";
        if (onDocuments) return href === "/documents";
        return href === hash || href === `/${hash}`;
      });
      if (current) place(current);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [onHome, onDocuments]);

  function NavItem({ label, href }) {
    const className = `rounded-md px-2.5 py-2 text-sm transition-colors duration-200 ${
      href === "/documents" && onDocuments ? "text-foam" : "text-slate-300 hover:text-foam"
    }`;
    if (href === "/documents") {
      return (
        <Link to="/documents" data-nav href="/documents" onMouseEnter={(event) => place(event.currentTarget)} className={className}>
          {label}
        </Link>
      );
    }
    return (
      <a href={href} data-nav onMouseEnter={(event) => place(event.currentTarget)} className={className}>
        {label}
      </a>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/80 backdrop-blur-md">
      <div className="page flex h-16 items-center justify-between gap-4">
        <a href={onHome ? "#top" : "/"} className="text-foam">
          <BrandMark />
        </a>
        <nav ref={navRef} className="relative hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map(([label, href]) => (
            <NavItem key={href} label={label} href={href} />
          ))}
          <span className="nav-indicator" style={{ transform: `translateX(${bar.x}px) scaleX(${bar.scale})` }} aria-hidden="true" />
        </nav>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Link to="/dashboard" className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/5 sm:inline">
              Dashboard
            </Link>
          )}
          <ConnectButton />
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 lg:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="space-y-1 border-t border-white/10 px-5 py-3 lg:hidden">
          {links.map(([label, href]) => (
            href === "/documents" ? (
              <Link key={href} to="/documents" onClick={() => setOpen(false)} className="block min-h-11 rounded-md px-2 py-2 text-slate-200">
                {label}
              </Link>
            ) : (
              <a key={href} href={href} onClick={() => setOpen(false)} className="block min-h-11 rounded-md px-2 py-2 text-slate-200">
                {label}
              </a>
            )
          ))}
          {isConnected && (
            <Link to="/dashboard" onClick={() => setOpen(false)} className="block min-h-11 rounded-md px-2 py-2 text-mint">
              Dashboard
            </Link>
          )}
          <Link to="/admin" onClick={() => setOpen(false)} className="block min-h-11 rounded-md px-2 py-2 text-sm text-slate-400">
            Admin
          </Link>
        </div>
      )}
    </header>
  );
}
