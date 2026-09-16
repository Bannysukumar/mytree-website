/**
 * Grants the first admin by writing adminEmails/{email}.
 * Usage: node scripts/bootstrap-admin.mjs you@example.org
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email.includes("@")) {
  console.error("Usage: node scripts/bootstrap-admin.mjs you@example.org");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID || "uwgea32";
let credential;
try {
  credential = cert(JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || "serviceAccount.json", "utf8")));
} catch {
  credential = applicationDefault();
}

initializeApp({ credential, projectId });
await getFirestore().collection("adminEmails").doc(email).set({
  email,
  createdAt: FieldValue.serverTimestamp(),
});
console.log("Admin allow-listed:", email);
