import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import BrandMark from "./BrandMark";
import { db, firebaseReady, functions } from "../lib/firebase";
import { explorerAddress, shortAddress } from "../lib/format";
import { useSiteContent } from "../hooks/useSiteContent";

const field = "mt-1 w-full rounded-md border border-white/15 bg-[#0b1220] px-3 py-2 text-sm text-foam outline-none focus:border-mint";
const siteLinks = [
  ["Tracks", "#tracks"],
  ["Supply", "#tokenomics"],
  ["Buy", "#buy"],
  ["Donate", "#donate"],
  ["Stories", "#stories"],
  ["Journal", "#journal"],
];

function SocialMark({ label }) {
  const key = String(label || "").toLowerCase();
  if (key.includes("inst")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (key.includes("you")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
        <path d="M22 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6zM10 15.5v-6.5l5.2 3.25L10 15.5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M17.6 3H20.4L13.8 10.4L21.5 21H15.5L10.9 14.7L5.7 21H2.9L9.9 13.1L2.5 3H8.6L12.8 8.8L17.6 3ZM16.6 19.2H18.3L7.5 4.7H5.7L16.6 19.2Z" />
    </svg>
  );
}

export default function Footer() {
  const { contact, legal, brand, sale } = useSiteContent();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!firebaseReady || !db) {
      setNote("Preview mode — configure Firebase to store messages.");
      return;
    }
    try {
      if (functions) await httpsCallable(functions, "notifyContact")(form);
      else await addDoc(collection(db, "contactSubmissions"), { ...form, createdAt: serverTimestamp() });
      setNote("Received.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setNote(err.message || "Could not send.");
    }
  }

  async function subscribe(event) {
    event.preventDefault();
    if (!firebaseReady || !db) {
      setNote("Newsletter signup needs Firebase.");
      return;
    }
    await addDoc(collection(db, "newsletter"), { email, createdAt: serverTimestamp() });
    setEmail("");
    setNote("You are on the list.");
  }

  return (
    <footer id="contact" className="border-t border-white/10 bg-[#111827]">
      <div className="page grid gap-8 py-8 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <BrandMark />
          <p className="mt-3 text-sm leading-6 text-slate-300">{contact?.headline || "Write to the stewards."}</p>
          <div className="mt-3 flex gap-2">
            {(contact?.socials || []).map((social) => (
              <a key={social.label} href={social.href} aria-label={social.label} title={social.label} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white hover:bg-leaf hover:text-ink">
                <SocialMark label={social.label} />
              </a>
            ))}
          </div>
        </div>
        <nav className="lg:col-span-2" aria-label="Footer">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site</p>
          <ul className="mt-2 columns-2 gap-x-4 text-sm lg:columns-1">
            {siteLinks.map(([label, href]) => (
              <li key={href}><a href={href} className="inline-flex py-1 text-slate-200 hover:text-mint">{label}</a></li>
            ))}
          </ul>
        </nav>
        <div className="space-y-2 text-sm lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</p>
          {contact?.email && <a className="flex items-center gap-2 text-slate-200 hover:text-mint" href={`mailto:${contact.email}`}><Mail size={14} aria-hidden="true" />{contact.email}</a>}
          {contact?.phone && <a className="flex items-center gap-2 text-slate-200 hover:text-mint" href={`tel:${contact.phone}`}><Phone size={14} aria-hidden="true" />{contact.phone}</a>}
          {contact?.address && <p className="flex items-start gap-2 text-slate-300"><MapPin size={14} className="mt-1 shrink-0" aria-hidden="true" />{contact.address}</p>}
        </div>
        <form onSubmit={submit} className="space-y-2 rounded-lg border border-white/10 bg-[#0b1220] p-3 lg:col-span-4">
          <p className="text-sm font-semibold">Message</p>
          <input required aria-label="Name" placeholder="Name" value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
          <input required aria-label="Email" type="email" placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field} />
          <textarea required aria-label="Message" placeholder="Message" value={form.message} onChange={(e) => set("message", e.target.value)} className={`${field} h-16`} />
          <button className="h-10 rounded-md bg-leaf px-4 text-sm font-semibold text-ink" type="submit">Send</button>
        </form>
      </div>
      <div className="border-t border-white/10">
        <div className="page flex flex-col gap-3 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={subscribe} className="flex w-full max-w-sm gap-2">
            <label className="sr-only" htmlFor="newsletter">Newsletter email</label>
            <input id="newsletter" type="email" required placeholder={contact?.newsletterPlaceholder || "Email"} value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 flex-1 rounded-md border border-white/15 bg-[#0b1220] px-3" />
            <button className="h-9 rounded-md border border-white/15 px-3 text-foam" type="submit">{contact?.newsletterButton || "Join"}</button>
          </form>
          <div className="flex items-center gap-3">
            <span>{brand?.name || "Mytree"}</span>
            <Link to="/admin" className="hover:text-mint">Admin</Link>
          </div>
        </div>
        <p className="page pb-2 text-xs leading-5 text-slate-500">{legal?.footer}</p>
        {sale?.contractAddress && (
          <p className="page pb-4 text-xs leading-5 text-slate-500">
            BNB Smart Chain ·{" "}
            <a className="text-mint underline" href={explorerAddress(sale.explorerUrl || "https://bscscan.com", sale.contractAddress)} target="_blank" rel="noreferrer">Presale {shortAddress(sale.contractAddress)}</a>
            {sale.tokenAddress && (
              <>
                {" · "}
                <a className="text-mint underline" href={explorerAddress(sale.explorerUrl || "https://bscscan.com", sale.tokenAddress)} target="_blank" rel="noreferrer">mytree {shortAddress(sale.tokenAddress)}</a>
              </>
            )}
            {" · "}USDT only
          </p>
        )}
        {note && <p className="px-5 pb-3 text-sm text-mint" role="status">{note}</p>}
      </div>
    </footer>
  );
}
