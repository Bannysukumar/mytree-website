import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadSiteImage(file) {
  const safe = String(file.name || "image").replace(/[^\w.-]+/g, "-").slice(0, 80);
  const path = `site/${Date.now()}-${safe}`;
  const stored = await uploadBytes(ref(storage, path), file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(stored.ref);
}

export function fileKind(file) {
  const type = String(file?.type || file?.fileType || "").toLowerCase();
  const name = String(file?.name || file?.fileUrl || "").toLowerCase();
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(name)) return "image";
  return "file";
}

export async function uploadSiteDocument(file) {
  const kind = fileKind(file);
  if (kind !== "pdf" && kind !== "image") {
    throw new Error("Upload a PDF or an image.");
  }
  const safe = String(file.name || "document").replace(/[^\w.-]+/g, "-").slice(0, 80);
  const path = `documents/${Date.now()}-${safe}`;
  const contentType = file.type || (kind === "pdf" ? "application/pdf" : "image/jpeg");
  const stored = await uploadBytes(ref(storage, path), file, { contentType });
  return { url: await getDownloadURL(stored.ref), fileType: kind };
}
