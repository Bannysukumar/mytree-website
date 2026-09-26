import { useState } from "react";
import { Eye, EyeOff, FileText, Trash2 } from "lucide-react";
import { useDocuments } from "../hooks/useDocuments";
import { newId, removeDoc, saveDoc } from "../lib/adminApi";
import { fileKind, uploadSiteDocument } from "../lib/uploadImage";
import { Page, Toast } from "./ui";

const input = "w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm";

const empty = { title: "", description: "", fileUrl: "", fileType: "pdf", order: 1, hidden: false };

export default function DocumentsAdmin({ user }) {
  const { documents, loading } = useDocuments();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  function startNew() {
    setDraft({ ...empty, order: (documents?.length || 0) + 1 });
    setStatus("");
  }

  async function onFile(file) {
    if (!file) return;
    setBusy(true);
    setStatus("");
    try {
      const uploaded = await uploadSiteDocument(file);
      setDraft((prev) => ({ ...prev, fileUrl: uploaded.url, fileType: uploaded.fileType }));
    } catch (err) {
      setStatus(err.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft?.title?.trim()) {
      setStatus("Title is required.");
      return;
    }
    if (!draft.fileUrl) {
      setStatus("Upload a file or paste a URL.");
      return;
    }
    const id = draft.id || newId("doc");
    const fileType = fileKind(draft);
    await saveDoc(user, "documents", id, {
      title: draft.title.trim(),
      description: String(draft.description || "").trim(),
      fileUrl: draft.fileUrl,
      fileType,
      hidden: Boolean(draft.hidden),
      order: Number(draft.order || 0),
    }, draft.id ? "update:documents" : "create:documents");
    setStatus("Saved. The public page updates live.");
    setDraft(null);
  }

  async function toggleHidden(row) {
    await saveDoc(user, "documents", row.id, { hidden: row.hidden !== true ? true : false }, row.hidden ? "unhide:documents" : "hide:documents");
    setStatus(row.hidden ? "Visible on the public page." : "Hidden from the public page.");
  }

  async function remove(row) {
    if (!window.confirm(`Delete “${row.title}”? This removes it from the public page.`)) return;
    await removeDoc(user, "documents", row.id);
    if (draft?.id === row.id) setDraft(null);
    setStatus("Deleted.");
  }

  return (
    <Page
      title="Documents"
      intro="Add, hide, or delete files on /documents. Hidden files stay off the public page. Visitors can view what is visible."
    >
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={startNew} className="min-h-11 rounded-control bg-leaf px-4 text-sm font-semibold text-ink">Add document</button>
        <a href="/documents" className="inline-flex min-h-11 items-center rounded-control border border-white/15 px-4 text-sm text-foam hover:bg-white/5">Open public page</a>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-400">Loading…</p>}
          {(documents || []).map((row) => (
            <article key={row.id} className="flex flex-col gap-3 rounded-card border border-white/10 bg-moss p-4 sm:flex-row sm:items-center">
              {fileKind(row) === "image" && row.fileUrl ? (
                <img src={row.fileUrl} alt="" className="h-20 w-28 shrink-0 rounded-control object-cover" />
              ) : (
                <span className="inline-flex h-20 w-28 shrink-0 items-center justify-center rounded-control bg-mint/15 text-mint">
                  <FileText size={22} aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foam">{row.title}</p>
                <p className="mt-1 text-xs text-slate-400">{row.hidden ? "Hidden" : "Visible"} · {fileKind(row) === "image" ? "Image" : "PDF"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setDraft(row); setStatus(""); }} className="min-h-11 rounded-control border border-white/15 px-3 text-sm">Edit</button>
                <button type="button" onClick={() => toggleHidden(row)} className="inline-flex min-h-11 items-center gap-1 rounded-control border border-white/15 px-3 text-sm">
                  {row.hidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                  {row.hidden ? "Unhide" : "Hide"}
                </button>
                <button type="button" onClick={() => remove(row)} className="inline-flex min-h-11 items-center gap-1 text-sm text-clay">
                  <Trash2 size={14} aria-hidden="true" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        {draft && (
          <form
            className="space-y-3 rounded-card border border-white/10 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <p className="font-display text-xl text-foam">{draft.id ? "Edit document" : "New document"}</p>
            <label className="block text-sm">
              <span className="text-foam">Title</span>
              <input required className={`${input} mt-1`} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="text-foam">Description</span>
              <textarea className={`${input} mt-1 h-24`} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="text-foam">File URL</span>
              <input className={`${input} mt-1`} value={draft.fileUrl || ""} onChange={(e) => setDraft({ ...draft, fileUrl: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="text-foam">Upload PDF or image</span>
              <input className="mt-2 block w-full text-sm" type="file" accept="application/pdf,image/*" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <label className="block text-sm">
              <span className="text-foam">Order</span>
              <input className={`${input} mt-1`} type="number" value={draft.order ?? 0} onChange={(e) => setDraft({ ...draft, order: e.target.value })} />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-foam">
              <input type="checkbox" checked={Boolean(draft.hidden)} onChange={(e) => setDraft({ ...draft, hidden: e.target.checked })} />
              Hidden from the public page
            </label>
            {busy && <p className="text-xs text-slate-400">Uploading…</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="min-h-11 rounded-control bg-leaf px-4 text-sm font-semibold text-ink">Save</button>
              <button type="button" onClick={() => setDraft(null)} className="min-h-11 rounded-control border border-white/15 px-4 text-sm">Cancel</button>
            </div>
          </form>
        )}
      </div>
      <Toast message={status} />
    </Page>
  );
}
