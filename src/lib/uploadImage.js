import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadSiteImage(file) {
  const safe = String(file.name || "image").replace(/[^\w.-]+/g, "-").slice(0, 80);
  const path = `site/${Date.now()}-${safe}`;
  const stored = await uploadBytes(ref(storage, path), file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(stored.ref);
}
