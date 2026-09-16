import { useState } from "react";
import { newId, removeDoc, saveDoc } from "../lib/adminApi";
import { uploadSiteImage } from "../lib/uploadImage";
import { Toast } from "./ui";

const input = "w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foam">{label}</span>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function onFile(file) {
    setBusy(true);
    setError("");
    try {
      onChange(await uploadSiteImage(file));
    } catch (err) {
      setError(err.message || "Upload failed. Paste an image URL instead.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      {value && <img src={value} alt="" className="h-24 w-40 rounded-md object-cover" />}
      <input className={input} value={value || ""} placeholder="Image URL" onChange={(e) => onChange(e.target.value)} />
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {busy && <p className="text-xs text-slate-400">Uploading…</p>}
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
}

const collections = {
  tracks: {
    label: "Tracks",
    fields: [
      ["title", "Title"],
      ["tag", "Tag"],
      ["summary", "Summary"],
      ["details", "Details", "textarea"],
      ["metric", "Metric"],
      ["accent", "Accent (mint, foam, sand)"],
      ["imageUrl", "Image", "image"],
      ["order", "Order", "number"],
    ],
  },
  poga: {
    label: "PoGA matrix",
    fields: [
      ["task", "Task"],
      ["baseReward", "Base reward", "number"],
      ["verification", "Verification", "textarea"],
      ["antiCheat", "Anti-cheat", "textarea"],
      ["order", "Order", "number"],
    ],
  },
  team: {
    label: "Team",
    fields: [
      ["name", "Name"],
      ["role", "Role"],
      ["bio", "Bio", "textarea"],
      ["imageUrl", "Photo", "image"],
      ["order", "Order", "number"],
    ],
  },
  posts: {
    label: "Blog",
    fields: [
      ["title", "Title"],
      ["excerpt", "Excerpt", "textarea"],
      ["author", "Author"],
      ["publishedAt", "Date"],
      ["body", "Markdown", "textarea"],
      ["imageUrl", "Image", "image"],
      ["order", "Order", "number"],
    ],
  },
  testimonials: {
    label: "Testimonials",
    fields: [
      ["quote", "Quote", "textarea"],
      ["name", "Name"],
      ["place", "Place"],
      ["imageUrl", "Image", "image"],
      ["order", "Order", "number"],
    ],
  },
  tiers: {
    label: "Membership",
    fields: [
      ["name", "Name"],
      ["priceLabel", "Price label"],
      ["summary", "Summary", "textarea"],
      ["cta", "CTA"],
      ["href", "Link"],
      ["benefitsText", "Benefits, one per line", "textarea"],
      ["imageUrl", "Image", "image"],
      ["order", "Order", "number"],
    ],
  },
  simulatorTasks: {
    label: "Simulator tasks",
    fields: [
      ["label", "Label"],
      ["reward", "Reward", "number"],
      ["unit", "Unit"],
      ["order", "Order", "number"],
    ],
  },
  banners: {
    label: "Banner",
    fields: [
      ["kicker", "Eyebrow"],
      ["title", "Headline"],
      ["subtitle", "Short line"],
      ["body", "Body", "textarea"],
      ["ctaLabel", "Button label"],
      ["href", "Button link"],
      ["imageUrl", "Image", "image"],
      ["enabled", "Visible"],
      ["order", "Order", "number"],
    ],
  },
};

function CollectionEditor({ user, name, rows }) {
  const spec = collections[name];
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("");

  function start(row) {
    setDraft({
      ...row,
      benefitsText: Array.isArray(row?.benefits) ? row.benefits.join("\n") : row?.benefitsText || "",
    });
  }

  async function save() {
    const id = draft.id || newId(name);
    const data = { ...draft };
    delete data.id;
    if (name === "tiers") {
      data.benefits = String(data.benefitsText || "").split("\n").map((line) => line.trim()).filter(Boolean);
      delete data.benefitsText;
    }
    if (name === "banners") data.enabled = data.enabled !== false && data.enabled !== "false";
    ["baseReward", "order", "reward"].forEach((key) => {
      if (data[key] !== undefined && data[key] !== "") data[key] = Number(data[key]);
    });
    await saveDoc(user, name, id, data, `update:${name}`);
    setStatus("Saved");
    setDraft(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        <button type="button" onClick={() => start({ order: (rows?.length || 0) + 1 })} className="mb-2 inline-flex min-h-11 items-center rounded-control bg-leaf px-4 text-sm font-semibold text-ink">Add {spec.label}</button>
        {(rows || []).map((row) => (
          <button key={row.id} type="button" onClick={() => start(row)} className="flex w-full items-center gap-3 rounded-card border border-white/10 bg-moss px-3 py-3 text-left text-sm hover:border-mint/40">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-control object-cover" />
            ) : (
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-mint/15 text-xs font-semibold uppercase text-mint">{(row.tag || row.role || spec.label || "Item").slice(0, 2)}</span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-medium text-foam">{row.title || row.name || row.task || row.label}</span>
              <span className="mt-1 block truncate text-xs text-slate-400">{row.tag || row.role || row.summary || row.excerpt || row.metric || "Open to edit"}</span>
            </span>
          </button>
        ))}
      </div>
      {draft && (
        <div className="space-y-3 rounded-2xl border border-white/10 p-4">
          {spec.fields.map(([key, label, type]) => (
            <Field key={key} label={label}>
              {type === "textarea" ? (
                <textarea className={`${input} h-28`} value={draft[key] || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
              ) : type === "image" ? (
                <ImageField value={draft[key]} onChange={(value) => setDraft({ ...draft, [key]: value })} />
              ) : key === "enabled" ? (
                <input type="checkbox" checked={draft.enabled !== false} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
              ) : (
                <input className={input} type={type || "text"} value={draft[key] ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
              )}
            </Field>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={save} className="min-h-11 rounded-control bg-leaf px-4 text-sm font-semibold text-ink">Save</button>
            <button type="button" onClick={() => { setDraft(null); setStatus(""); }} className="min-h-11 rounded-control border border-white/15 px-4 text-sm">Cancel</button>
            {draft.id && (
              <button type="button" onClick={() => removeDoc(user, name, draft.id).then(() => setDraft(null))} className="text-sm text-clay">Delete</button>
            )}
          </div>
          {status && <p className="text-xs text-mint" role="status">{status}</p>}
          <Toast message={status} />
        </div>
      )}
      {!draft && (
        <div className="rounded-card border border-mint/25 bg-mint/5 p-5">
          <p className="font-display text-xl text-foam">Nothing open</p>
          <p className="mt-2 text-sm text-slate-300">Choose a card to edit it, or add a new {spec.label.toLowerCase()} item. Changes stay local until you save.</p>
        </div>
      )}
    </div>
  );
}

export default function ContentEditor({ user, content }) {
  const [section, setSection] = useState("tracks");
  const [docDraft, setDocDraft] = useState(null);
  const [status, setStatus] = useState("");

  async function saveSingle(collectionName, id, data, action) {
    const payload = { ...data };
    delete payload.id;
    await saveDoc(user, collectionName, id, payload, action);
    setStatus("Saved. The public site updates live.");
  }

  return (
    <div>
      <h1 className="font-display text-h2 text-foam">Content</h1>
      <p className="mt-2 text-sm text-slate-400">Edit the public page. The active section is highlighted. Open an item to change its fields.</p>
      <div className="admin-tabs mt-4 flex flex-wrap gap-2 text-sm">
        {[
          ["hero", "Hero"],
          ["brand", "Logo"],
          ["banners", "Banners"],
          ["footer", "Footer"],
          ["tracks", "Tracks"],
          ["poga", "PoGA"],
          ["tokenomics", "Supply"],
          ["team", "Team"],
          ["posts", "Journal"],
          ["testimonials", "Stories"],
          ["tiers", "Membership"],
          ["simulatorTasks", "Simulator"],
          ["legal", "Legal"],
          ["referralCopy", "Referral copy"],
        ].map(([id, label]) => (
          <button key={id} type="button" data-active={section === id} onClick={() => { setSection(id); setDocDraft(null); setStatus(""); }} className="rounded-control">{label}</button>
        ))}
      </div>
      <div className="mt-6">
        {collections[section] && <CollectionEditor user={user} name={section} rows={content[section]} />}
        {section === "hero" && (
          <HeroEditor user={user} hero={docDraft || content.hero || {}} onChange={setDocDraft} onSaved={() => setStatus("Saved. The public site updates live.")} />
        )}
        {section === "brand" && (
          <BrandEditor user={user} brand={docDraft || content.brand || {}} onChange={setDocDraft} onSaved={() => setStatus("Logo updated across the site.")} />
        )}
        {section === "footer" && (
          <FooterEditor user={user} contact={content.contact || {}} legal={content.legal || {}} onSaved={() => setStatus("Footer updated.")} />
        )}
        {section === "tokenomics" && (
          <DocForm
            initial={docDraft || content.tokenomics || {}}
            onChange={setDocDraft}
            onSave={(payload) => saveSingle("tokenomics", "current", payload, "update:tokenomics")}
            listKey="allocations"
            keys={["totalSupply", "symbol", "note"]}
          />
        )}
        {section === "legal" && (
          <DocForm
            initial={docDraft || content.legal || {}}
            onChange={setDocDraft}
            onSave={(payload) => saveSingle("site", "legal", payload, "update:legal")}
            textareaKeys={["buy", "donate", "referral", "footer"]}
            keys={[]}
          />
        )}
        {section === "referralCopy" && (
          <DocForm
            initial={docDraft || content.referralCopy || {}}
            onChange={setDocDraft}
            onSave={(payload) => saveSingle("site", "referralCopy", payload, "update:referralCopy")}
            listKey="steps"
            textareaKeys={["body"]}
            keys={["eyebrow", "headline"]}
            note="Use {{referrerPct}} and {{buyerPct}}. The live percentages come from referral config, not from this text."
          />
        )}
        {status && <p className="mt-3 text-sm text-mint" role="status">{status}</p>}
        <Toast message={status} />
      </div>
    </div>
  );
}

const fieldLabels = {
  totalSupply: "Total supply",
  symbol: "Symbol",
  note: "Public note",
  eyebrow: "Eyebrow",
  headline: "Headline",
  body: "Body",
  buy: "Buy disclaimer",
  donate: "Donation disclaimer",
  referral: "Referral disclaimer",
  footer: "Footer legal line",
};

function DocForm({ initial, onChange, onSave, keys, listKey, textareaKeys = [], note }) {
  const [local, setLocal] = useState(initial);
  const [dirty, setDirty] = useState(false);
  function update(key, value) {
    const next = { ...local, [key]: value };
    setLocal(next);
    setDirty(true);
    onChange(next);
  }
  function save() {
    const payload = { ...local };
    if (payload.totalSupply) payload.totalSupply = Number(payload.totalSupply);
    if (Array.isArray(payload.allocations)) {
      payload.allocations = payload.allocations.map((row) => ({ ...row, percent: Number(row.percent || 0) }));
    }
    onChange(payload);
    onSave(payload);
    setDirty(false);
  }
  return (
    <div className="admin-panel max-w-3xl space-y-5 p-5">
      {note && <p className="text-sm text-slate-300">{note}</p>}
      {keys.map((key) => (
        <Field key={key} label={fieldLabels[key] || key}>
          <input className={input} value={local[key] ?? ""} onChange={(e) => update(key, e.target.value)} />
        </Field>
      ))}
      {textareaKeys.map((key) => (
        <Field key={key} label={fieldLabels[key] || key}>
          <textarea className={`${input} h-28`} value={local[key] ?? ""} onChange={(e) => update(key, e.target.value)} />
        </Field>
      ))}
      {listKey === "allocations" && (
        <Field label="Allocations" hint="These slices are the public supply chart. Percents should add up to 100.">
          <SliceList rows={local.allocations || []} onChange={(allocations) => update("allocations", allocations)} />
        </Field>
      )}
      {listKey === "steps" && (
        <Field label="Steps" hint="Shown as the numbered referral steps on the public page.">
          <StepList rows={local.steps || []} onChange={(steps) => update("steps", steps)} />
        </Field>
      )}
      {dirty ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="min-h-11 rounded-control bg-leaf px-4 text-sm font-semibold text-ink">Save</button>
          <button type="button" onClick={() => { setLocal(initial); setDirty(false); }} className="min-h-11 rounded-control border border-white/15 px-4 text-sm">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={save} className="min-h-11 rounded-control bg-leaf px-4 text-sm font-semibold text-ink">Save</button>
      )}
    </div>
  );
}

function SliceList({ rows, onChange }) {
  function set(index, patch) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.id || index} className="grid items-center gap-2 rounded-control border border-white/10 bg-ink/50 p-3 sm:grid-cols-[1fr_5.5rem_3rem_auto]">
          <input className={input} aria-label="Allocation name" value={row.label || ""} onChange={(e) => set(index, { label: e.target.value })} />
          <input className={input} aria-label="Percent" type="number" value={row.percent ?? ""} onChange={(e) => set(index, { percent: e.target.value })} />
          <input className="h-11 w-full cursor-pointer rounded-control border border-white/10 bg-ink" aria-label="Color" type="color" value={row.color || "#10b981"} onChange={(e) => set(index, { color: e.target.value })} />
          <button type="button" className="min-h-11 text-sm text-clay" onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button>
        </div>
      ))}
      <button type="button" className="text-sm font-medium text-mint" onClick={() => onChange([...(rows || []), { id: newId("slice"), label: "", percent: 0, color: "#10b981" }])}>Add slice</button>
    </div>
  );
}

function StepList({ rows, onChange }) {
  function set(index, patch) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.title || index} className="space-y-2 rounded-control border border-white/10 bg-ink/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption uppercase text-mint">Step {index + 1}</p>
            <button type="button" className="text-sm text-clay" onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button>
          </div>
          <input className={input} aria-label="Step title" value={row.title || ""} onChange={(e) => set(index, { title: e.target.value })} />
          <textarea className={`${input} h-20`} aria-label="Step body" value={row.body || ""} onChange={(e) => set(index, { body: e.target.value })} />
        </div>
      ))}
      <button type="button" className="text-sm font-medium text-mint" onClick={() => onChange([...(rows || []), { title: "", body: "" }])}>Add step</button>
    </div>
  );
}

function RowList({ rows, onChange, columns, addLabel }) {
  function update(index, key, value) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.id || index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          {columns.map(([key, label]) => (
            <input key={key} className={input} placeholder={label} value={row[key] || ""} onChange={(e) => update(index, key, e.target.value)} />
          ))}
          <button type="button" className="text-sm text-clay" onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button>
        </div>
      ))}
      <button type="button" className="text-sm text-mint" onClick={() => onChange([...(rows || []), { id: newId("row"), label: "", value: "", href: "" }])}>{addLabel}</button>
    </div>
  );
}

function FooterEditor({ user, contact, legal, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    headline: contact.headline || "Write to the stewards.",
    email: contact.email || "",
    phone: contact.phone || "",
    address: contact.address || "",
    newsletterPlaceholder: contact.newsletterPlaceholder || "Newsletter email",
    newsletterButton: contact.newsletterButton || "Join",
    contacts: contact.contacts || [],
    socials: contact.socials || [],
    links: contact.links || [],
    footer: legal.footer || "",
  }));
  function set(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }
  async function save() {
    await saveDoc(user, "site", "contact", {
      headline: draft.headline,
      email: draft.email,
      phone: draft.phone,
      address: draft.address,
      newsletterPlaceholder: draft.newsletterPlaceholder,
      newsletterButton: draft.newsletterButton,
      contacts: draft.contacts.filter((row) => row.label || row.value),
      socials: draft.socials.filter((row) => row.label),
      links: draft.links.filter((row) => row.label),
    }, "update:footer");
    await saveDoc(user, "site", "legal", { ...legal, footer: draft.footer }, "update:legal-footer");
    onSaved();
  }
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-400">Headline, contact lines, social links, page links, and the legal line at the bottom of the footer.</p>
      <Field label="Headline"><input className={input} value={draft.headline} onChange={(e) => set("headline", e.target.value)} /></Field>
      <Field label="Email"><input className={input} value={draft.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <Field label="Phone"><input className={input} value={draft.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
      <Field label="Address"><textarea className={`${input} h-20`} value={draft.address} onChange={(e) => set("address", e.target.value)} /></Field>
      <Field label="Extra contact lines"><RowList rows={draft.contacts} onChange={(contacts) => set("contacts", contacts)} columns={[["label", "Label"], ["value", "Value"], ["href", "Link"]]} addLabel="Add contact" /></Field>
      <Field label="Social links"><RowList rows={draft.socials} onChange={(socials) => set("socials", socials)} columns={[["label", "Label"], ["href", "URL"]]} addLabel="Add social" /></Field>
      <Field label="Footer links"><RowList rows={draft.links} onChange={(links) => set("links", links)} columns={[["label", "Label"], ["href", "URL"]]} addLabel="Add link" /></Field>
      <Field label="Newsletter placeholder"><input className={input} value={draft.newsletterPlaceholder} onChange={(e) => set("newsletterPlaceholder", e.target.value)} /></Field>
      <Field label="Newsletter button"><input className={input} value={draft.newsletterButton} onChange={(e) => set("newsletterButton", e.target.value)} /></Field>
      <Field label="Legal footer"><textarea className={`${input} h-24`} value={draft.footer} onChange={(e) => set("footer", e.target.value)} /></Field>
      <button type="button" onClick={save} className="rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-ink">Save footer</button>
    </div>
  );
}

function BrandEditor({ user, brand, onChange, onSaved }) {
  const [draft, setDraft] = useState(brand);
  function set(key, value) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
  }
  return (
    <div className="max-w-xl space-y-3">
      <p className="text-sm text-slate-400">This logo is used on the public site, the user dashboard, and the admin panel.</p>
      <Field label="Site name"><input className={input} value={draft.name || ""} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Logo"><ImageField value={draft.logoUrl || ""} onChange={(logoUrl) => set("logoUrl", logoUrl)} /></Field>
      <Field label="Alt text"><input className={input} value={draft.alt || ""} onChange={(e) => set("alt", e.target.value)} /></Field>
      <button type="button" className="rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-ink" onClick={async () => { await saveDoc(user, "site", "brand", { name: draft.name || "Mytree", logoUrl: draft.logoUrl || "", alt: draft.alt || draft.name || "Mytree" }, "update:brand"); onSaved(); }}>Save logo</button>
    </div>
  );
}

function HeroEditor({ user, hero, onChange, onSaved }) {
  const [draft, setDraft] = useState({ ...hero, slides: hero.slides || [] });
  function set(key, value) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
  }
  function updateSlide(index, patch) {
    set("slides", draft.slides.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)));
  }
  async function save() {
    await saveDoc(user, "site", "hero", { ...draft, slides: draft.slides }, "update:hero");
    onSaved();
  }
  return (
    <div className="max-w-3xl space-y-4">
      <Field label="Eyebrow"><input className={input} value={draft.eyebrow || ""} onChange={(e) => set("eyebrow", e.target.value)} /></Field>
      <Field label="Primary button"><input className={input} value={draft.primaryCta || ""} onChange={(e) => set("primaryCta", e.target.value)} /></Field>
      <Field label="Primary link"><input className={input} value={draft.primaryHref || ""} onChange={(e) => set("primaryHref", e.target.value)} /></Field>
      <Field label="Secondary button"><input className={input} value={draft.secondaryCta || ""} onChange={(e) => set("secondaryCta", e.target.value)} /></Field>
      <Field label="Secondary link"><input className={input} value={draft.secondaryHref || ""} onChange={(e) => set("secondaryHref", e.target.value)} /></Field>
      {(draft.slides || []).map((slide, index) => (
        <div key={slide.id || index} className="space-y-2 rounded-md border border-white/10 p-4">
          <div className="flex justify-between">
            <p className="text-sm font-medium">Slide {index + 1}</p>
            <button type="button" className="text-sm text-clay" onClick={() => set("slides", draft.slides.filter((_, i) => i !== index))}>Delete</button>
          </div>
          <input className={input} placeholder="Kicker" value={slide.kicker || ""} onChange={(e) => updateSlide(index, { kicker: e.target.value })} />
          <input className={input} placeholder="Headline" value={slide.headline || ""} onChange={(e) => updateSlide(index, { headline: e.target.value })} />
          <textarea className={`${input} h-20`} placeholder="Body" value={slide.body || ""} onChange={(e) => updateSlide(index, { body: e.target.value })} />
          <ImageField value={slide.imageUrl || ""} onChange={(imageUrl) => updateSlide(index, { imageUrl })} />
        </div>
      ))}
      <button type="button" className="text-sm text-mint" onClick={() => set("slides", [...(draft.slides || []), { id: newId("slide"), kicker: "", headline: "", body: "", imageUrl: "" }])}>Add slide</button>
      <button type="button" onClick={save} className="block rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-ink">Save hero</button>
    </div>
  );
}
