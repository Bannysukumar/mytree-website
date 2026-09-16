import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui";

export function Page({ eyebrow = "Admin", title, intro, children }) {
  return (
    <div>
      <p className="text-caption font-semibold uppercase text-slate-500">{eyebrow}</p>
      <h1 className="mt-1 font-display text-h2 text-foam">{title}</h1>
      {intro && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{intro}</p>}
      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}

export function Toast({ message }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!message) return undefined;
    setShown(message);
    const timer = setTimeout(() => setShown(""), 4200);
    return () => clearTimeout(timer);
  }, [message]);
  if (!shown) return null;
  return (
    <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-card border border-mint/30 bg-moss px-4 py-3 text-sm text-foam shadow-card">
      {shown}
    </div>
  );
}

export function SaveBar({ dirty, onSave, onCancel, label = "Save" }) {
  if (!dirty) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onSave} className="min-h-11 rounded-control bg-leaf px-4 text-sm font-semibold text-ink">{label}</button>
      <button type="button" onClick={onCancel} className="min-h-11 rounded-control border border-white/15 px-4 text-sm">Cancel</button>
    </div>
  );
}

export function StatusBadge({ status }) {
  const value = String(status || "unknown");
  const tone = value === "confirmed" || value === "success" || value === "paid" ? "success"
    : value === "failed" ? "danger"
      : value === "pending" || value === "confirming" ? "warning"
        : "neutral";
  return <Badge tone={tone}>{value}</Badge>;
}

export function DataTable({ rows = [], columns, searchKeys = [] }) {
  const [queryText, setQueryText] = useState("");
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const [page, setPage] = useState(0);
  const size = 10;
  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    let next = rows;
    if (needle && searchKeys.length) {
      next = next.filter((row) => searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(needle)));
    }
    if (sort.key) {
      next = [...next].sort((a, b) => {
        const cmp = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), undefined, { numeric: true });
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return next;
  }, [rows, queryText, sort, searchKeys]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const view = filtered.slice(page * size, page * size + size);

  function toggle(key) {
    setPage(0);
    setSort((current) => current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  }

  return (
    <div className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
        <input
          value={queryText}
          onChange={(event) => { setQueryText(event.target.value); setPage(0); }}
          placeholder="Filter rows"
          aria-label="Filter rows"
          className="min-h-11 w-full max-w-xs px-3 text-sm"
        />
        <p className="text-xs tabular-nums text-slate-400">{filtered.length} rows</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[640px] text-left text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button type="button" className="inline-flex min-h-11 items-center gap-1 text-left text-caption uppercase text-slate-400" onClick={() => toggle(column.key)}>
                    {column.label}
                    <span aria-hidden="true">{sort.key === column.key ? (sort.dir === "asc" ? "↑" : "↓") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr key={row.id} className="odd:bg-white/[0.02]">
                {columns.map((column) => (
                  <td key={column.key} className="tabular-nums">{column.render ? column.render(row) : row[column.key] ?? "—"}</td>
                ))}
              </tr>
            ))}
            {!view.length && (
              <tr><td colSpan={columns.length} className="py-8 text-center text-slate-400">No matching rows.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((n) => n - 1)} className="min-h-11 rounded-control border border-white/15 px-3 text-sm disabled:opacity-40">Previous</button>
        <p className="text-xs tabular-nums text-slate-400">{page + 1} / {pages}</p>
        <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((n) => n + 1)} className="min-h-11 rounded-control border border-white/15 px-3 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
