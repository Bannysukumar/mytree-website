import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function audit(user, action, target, summary) {
  await addDoc(collection(db, "auditLog"), {
    actorEmail: user.email || "",
    actorUid: user.uid,
    action,
    target,
    summary: String(summary || "").slice(0, 500),
    createdAt: serverTimestamp(),
  });
}

export async function saveDoc(user, collectionName, id, data, action) {
  await setDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  await audit(user, action || `update:${collectionName}`, `${collectionName}/${id}`, data.title || data.name || id);
}

export async function removeDoc(user, collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
  await audit(user, `delete:${collectionName}`, `${collectionName}/${id}`, id);
}

export function newId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
