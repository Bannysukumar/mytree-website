/**
 * Wipes Firestore collections and Auth users in uwgea32 using a service account.
 * Does not delete the Firebase project itself.
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyFile) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON.");
  process.exit(1);
}

initializeApp({
  credential: cert(JSON.parse(readFileSync(keyFile, "utf8"))),
  projectId: process.env.FIREBASE_PROJECT_ID || "uwgea32",
});

const db = getFirestore();
const collections = await db.listCollections();
console.log(`Firestore collections: ${collections.map((c) => c.id).join(", ") || "(none)"}`);
for (const col of collections) {
  console.log(`Deleting ${col.id}...`);
  await db.recursiveDelete(col);
}
console.log("Firestore wiped.");

const auth = getAuth();
let pageToken;
let deletedUsers = 0;
do {
  const page = await auth.listUsers(1000, pageToken);
  if (page.users.length) {
    await auth.deleteUsers(page.users.map((user) => user.uid));
    deletedUsers += page.users.length;
  }
  pageToken = page.pageToken;
} while (pageToken);
console.log(`Auth users deleted: ${deletedUsers}`);
