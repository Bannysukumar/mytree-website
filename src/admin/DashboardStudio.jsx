import { useState } from "react";
import { saveDoc, newId, audit } from "../lib/adminApi";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { SaveBar, Toast } from "./ui";

const input = "w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm";

export default function DashboardStudio({ user, config }) {
  const [draft, setDraft] = useState(null);
  const [section, setSection] = useState("nav");
  const [message, setMessage] = useState("");
  const current = draft || config || {};

  function patch(partial) {
    setDraft({ ...current, ...partial });
  }

  async function save() {
    await saveDoc(user, "config", "dashboard", current, "update:dashboard");
    setMessage("Dashboard settings saved. The live dashboard updates from this document.");
    setDraft(current);
  }

  const sections = ["nav", "milestones", "ranks", "buyback", "pricing", "currencies", "promos", "leaderboard", "products", "claim", "copy"];

  return (
    <div>
      <h1 className="font-display text-3xl">User dashboard</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/60">These settings drive /dashboard. Hidden menu items disappear without a frontend redeploy.</p>
      <div className="admin-tabs mt-4 flex flex-wrap gap-2 text-sm">
        {sections.map((id) => (
          <button key={id} type="button" data-active={section === id} onClick={() => setSection(id)} className="rounded-md">{id}</button>
        ))}
      </div>
      <div className="mt-6 max-w-3xl space-y-3">
        {section === "nav" && (current.nav || []).map((item, index) => (
          <div key={item.id} className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 p-3 md:grid-cols-4">
            <input className={input} value={item.label} onChange={(e) => patch({ nav: editAt(current.nav, index, { label: e.target.value }) })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.visible !== false} onChange={(e) => patch({ nav: editAt(current.nav, index, { visible: e.target.checked }) })} /> Visible</label>
            <input className={input} placeholder="Badge" value={item.badge || ""} onChange={(e) => patch({ nav: editAt(current.nav, index, { badge: e.target.value }) })} />
            <p className="self-center text-xs text-white/40">{item.id}</p>
          </div>
        ))}
        {section === "milestones" && (
          <ListEditor
            rows={current.milestones || []}
            blank={{ id: newId("m"), spendUsd: 0, purchaseCount: 1, rewardTokens: 0, badge: "" }}
            fields={[["spendUsd", "Spend USD", "number"], ["purchaseCount", "Purchases", "number"], ["rewardTokens", "Reward tokens", "number"], ["badge", "Badge"]]}
            onChange={(milestones) => patch({ milestones })}
          />
        )}
        {section === "ranks" && (
          <ListEditor
            rows={current.ranks || []}
            blank={{ id: newId("rank"), name: "", icon: "", spendUsd: 0 }}
            fields={[["name", "Name"], ["icon", "Lucide name or image URL"], ["spendUsd", "Spend to reach", "number"]]}
            onChange={(ranks) => patch({ ranks })}
          />
        )}
        {section === "buyback" && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(current.buyback?.enabled)} onChange={(e) => patch({ buyback: { ...current.buyback, enabled: e.target.checked } })} /> Enable buyback</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(current.buyback?.beta)} onChange={(e) => patch({ buyback: { ...current.buyback, beta: e.target.checked } })} /> Mark beta</label>
            <input className={input} type="number" value={current.buyback?.rateUsd ?? ""} onChange={(e) => patch({ buyback: { ...current.buyback, rateUsd: Number(e.target.value) } })} placeholder="USD per token" />
            <textarea className={`${input} h-24`} value={current.buyback?.disclaimer || ""} onChange={(e) => patch({ buyback: { ...current.buyback, disclaimer: e.target.value } })} />
          </div>
        )}
        {section === "pricing" && (
          <div className="space-y-3">
            <input className={input} value={current.salePanel?.batchLabel || ""} onChange={(e) => patch({ salePanel: { ...current.salePanel, batchLabel: e.target.value } })} placeholder="Batch label" />
            <input className={input} type="number" value={current.salePanel?.nextStagePriceUsd ?? ""} onChange={(e) => patch({ salePanel: { ...current.salePanel, nextStagePriceUsd: Number(e.target.value) } })} placeholder="Next stage price USD" />
            <ListEditor
              rows={current.stages || []}
              blank={{ id: newId("stage"), label: "", priceUsd: 0, triggerTokensSold: 0, triggerDate: "" }}
              fields={[["label", "Label"], ["priceUsd", "Price USD", "number"], ["triggerTokensSold", "Tokens sold trigger", "number"], ["triggerDate", "Or date (ISO)"]]}
              onChange={(stages) => patch({ stages })}
            />
          </div>
        )}
        {section === "currencies" && (
          <ListEditor
            rows={current.currencies || []}
            blank={{ id: newId("cur"), symbol: "", kind: "display", min: 1, usdRate: 1, enabled: true, featured: false, icon: "" }}
            fields={[["symbol", "Symbol"], ["kind", "native / token / display"], ["min", "Minimum", "number"], ["usdRate", "USD rate", "number"], ["icon", "Icon"], ["featured", "Featured true/false"]]}
            onChange={(currencies) => patch({ currencies })}
          />
        )}
        {section === "promos" && (
          <ListEditor
            rows={current.promoCodes || []}
            blank={{ code: "NEWCODE", active: true, type: "bonus", value: 5, expiresAt: "", usageCap: 0, used: 0 }}
            fields={[["code", "Code"], ["type", "price or bonus"], ["value", "Percent", "number"], ["expiresAt", "Expiry ISO"], ["usageCap", "Usage cap", "number"], ["used", "Used", "number"], ["active", "Active true/false"]]}
            onChange={(promoCodes) => patch({ promoCodes })}
          />
        )}
        {section === "leaderboard" && (
          <div className="space-y-3">
            <input className={input} type="number" value={current.leaderboard?.poolAmount ?? ""} onChange={(e) => patch({ leaderboard: { ...current.leaderboard, poolAmount: Number(e.target.value) } })} placeholder="Pool amount" />
            <input className={input} value={current.leaderboard?.resetLabel || ""} onChange={(e) => patch({ leaderboard: { ...current.leaderboard, resetLabel: e.target.value } })} placeholder="Reset label" />
            <input className={input} value={current.leaderboard?.resetAt || ""} onChange={(e) => patch({ leaderboard: { ...current.leaderboard, resetAt: e.target.value } })} placeholder="Reset at ISO" />
            <input className={input} value={current.leaderboard?.criteria || ""} onChange={(e) => patch({ leaderboard: { ...current.leaderboard, criteria: e.target.value } })} placeholder="purchaseVolume or spendUsd" />
            <ListEditor
              rows={current.leaderboard?.prizes || []}
              blank={{ rank: 1, amount: 0 }}
              fields={[["rank", "Rank", "number"], ["amount", "Prize", "number"]]}
              onChange={(prizes) => patch({ leaderboard: { ...current.leaderboard, prizes } })}
            />
          </div>
        )}
        {section === "products" && (
          <ListEditor
            rows={current.products || []}
            blank={{ id: newId("product"), name: "", description: "", image: "", priceUsd: 0 }}
            fields={[["name", "Name"], ["description", "Description"], ["image", "Image URL"], ["priceUsd", "Price USD", "number"]]}
            onChange={(products) => patch({ products })}
          />
        )}
        {section === "claim" && (
          <div className="space-y-3">
            <input className={input} value={current.claim?.title || ""} onChange={(e) => patch({ claim: { ...current.claim, title: e.target.value } })} placeholder="Title" />
            <input className={input} value={current.claim?.unlockAt || ""} onChange={(e) => patch({ claim: { ...current.claim, unlockAt: e.target.value } })} placeholder="Unlock ISO date" />
            <textarea className={`${input} h-24`} value={current.claim?.condition || ""} onChange={(e) => patch({ claim: { ...current.claim, condition: e.target.value } })} />
            <input className={input} type="number" value={current.claim?.amount ?? 0} onChange={(e) => patch({ claim: { ...current.claim, amount: Number(e.target.value) } })} />
          </div>
        )}
        {section === "copy" && (
          <div className="space-y-2">
            {Object.entries(current.copy || {}).map(([key, value]) => (
              <label key={key} className="block text-xs text-white/40">
                {key}
                <input className={`${input} mt-1`} value={value} onChange={(e) => patch({ copy: { ...current.copy, [key]: e.target.value } })} />
              </label>
            ))}
          </div>
        )}
        <SaveBar dirty={Boolean(draft)} onSave={save} onCancel={() => { setDraft(null); setMessage(""); }} label="Save dashboard" />
        {section === "leaderboard" && <WinnerForm user={user} />}
        {message && <p className="text-sm text-mint" role="status">{message}</p>}
        <Toast message={message} />
      </div>
    </div>
  );
}

function editAt(rows, index, patch) {
  return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

function ListEditor({ rows, blank, fields, onChange }) {
  return (
    <div className="space-y-3">
      <button type="button" className="text-sm text-mint" onClick={() => onChange([...rows, blank])}>Add row</button>
      {rows.map((row, index) => (
        <div key={row.id || row.code || index} className="space-y-2 rounded-2xl border border-white/10 p-3">
          {fields.map(([key, label, type]) => (
            <label key={key} className="block text-xs text-white/40">
              {label}
              <input className={`${input} mt-1`} type={type || "text"} value={row[key] ?? ""} onChange={(e) => {
                const value = type === "number" ? Number(e.target.value) : e.target.value;
                onChange(editAt(rows, index, { [key]: value }));
              }} />
            </label>
          ))}
          <button type="button" className="text-xs text-clay" onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button>
        </div>
      ))}
    </div>
  );
}

function WinnerForm({ user }) {
  const [form, setForm] = useState({ period: "", rank: 1, wallet: "", prize: "" });
  async function add() {
    const id = newId("win");
    await setDoc(doc(db, "leaderboardWinners", id), form);
    await audit(user, "add:winner", `leaderboardWinners/${id}`, form.period);
    setForm({ period: "", rank: 1, wallet: "", prize: "" });
  }
  return (
    <div className="mt-4 space-y-2 rounded-2xl border border-white/10 p-3">
      <p className="text-sm text-white/70">Publish a past winner</p>
      {["period", "wallet", "prize"].map((key) => (
        <input key={key} className={input} placeholder={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      ))}
      <button type="button" onClick={add} className="text-sm text-mint">Add winner</button>
    </div>
  );
}
