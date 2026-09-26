import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "uwgea32-firebase-adminsdk-fbsvc-bd56d9738f.json";
initializeApp({
  credential: cert(JSON.parse(readFileSync(credPath, "utf8"))),
  projectId: process.env.FIREBASE_PROJECT_ID || "uwgea32",
});
const db = getFirestore();
const rows = JSON.parse(readFileSync(new URL("../public/seed/documents.json", import.meta.url), "utf8"));

for (const row of rows) {
  const { id, ...data } = row;
  await db.collection("documents").doc(id).set(data, { merge: true });
}

console.log("Published", rows.length, "documents.");
