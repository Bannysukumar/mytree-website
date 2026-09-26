import { Download, Eye, FileText, Image as ImageIcon } from "lucide-react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { LoadingBlock, Section } from "../components/ui";
import { useDocuments } from "../hooks/useDocuments";
import { fileKind } from "../lib/uploadImage";

function isImage(doc) {
  return fileKind(doc) === "image";
}

export default function Documents() {
  const { visible, loading } = useDocuments();

  return (
    <>
      <Navbar />
      <main id="main">
        <Section
          id="documents"
          eyebrow="Company records"
          title="Documents you can open and check."
          intro="Certificate of incorporation, PAN, memorandum, and articles of Vasudha Ecological Restoration Council. Hidden files stay off this page."
        >
          {loading && <LoadingBlock />}
          {!loading && visible.length === 0 && (
            <p className="rounded-card border border-white/10 bg-moss p-6 text-slate-300">No documents are public yet.</p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {visible.map((doc) => (
              <article key={doc.id} className="glass overflow-hidden rounded-card">
                {isImage(doc) && doc.fileUrl && (
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                    <img src={doc.fileUrl} alt={doc.title} className="h-56 w-full object-cover object-top" />
                  </a>
                )}
                {!isImage(doc) && (
                  <div className="flex h-40 items-center justify-center bg-mint/10 text-mint">
                    <FileText size={40} aria-hidden="true" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-caption uppercase text-mint">{isImage(doc) ? "Image" : "PDF"}</p>
                  <h3 className="mt-2 font-display text-xl text-foam">{doc.title}</h3>
                  {doc.description && <p className="mt-2 text-sm leading-relaxed text-slate-300">{doc.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-leaf px-4 text-sm font-semibold text-ink">
                      {isImage(doc) ? <ImageIcon size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                      View
                    </a>
                    <a href={doc.fileUrl} download className="inline-flex min-h-11 items-center gap-2 rounded-control border border-white/20 px-4 text-sm font-semibold text-foam hover:bg-white/5">
                      <Download size={16} aria-hidden="true" />
                      Download
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
