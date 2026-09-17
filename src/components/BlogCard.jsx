import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function BlogCard({ post }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="glass overflow-hidden p-0">
      {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" className="h-48 w-full object-cover" onError={(event) => { event.currentTarget.remove(); }} />}
      <div className="p-4">
      <p className="text-xs uppercase tracking-wider text-white/40">{post.publishedAt} · {post.author}</p>
      <h3 className="mt-2 font-display text-3xl text-foam">{post.title}</h3>
      <p className="mt-3 text-white/70">{post.excerpt}</p>
      {open && (
        <div className="prose-invert mt-4 space-y-3 text-sm leading-relaxed text-white/75">
          <ReactMarkdown>{post.body || ""}</ReactMarkdown>
        </div>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-4 text-sm text-mint">
        {open ? "Close" : "Read"}
      </button>
      </div>
    </article>
  );
}
