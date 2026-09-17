import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "uwgea32-firebase-adminsdk-fbsvc-bd56d9738f.json";
initializeApp({
  credential: cert(JSON.parse(readFileSync(credPath, "utf8"))),
  projectId: process.env.FIREBASE_PROJECT_ID || "uwgea32",
});
const db = getFirestore();
const content = JSON.parse(readFileSync(new URL("../public/seed/content.json", import.meta.url), "utf8"));

await db.collection("site").doc("hero").set(content.hero);
await db.collection("site").doc("contact").set(content.contact);
await db.collection("site").doc("legal").set(content.legal);

async function setMany(name, rows) {
  for (const row of rows) {
    const { id, ...data } = row;
    await db.collection(name).doc(id).set(data);
  }
}

await setMany("tracks", content.tracks);
await setMany("team", content.team);
await setMany("banners", content.banners);
await setMany("testimonials", content.testimonials);
await setMany("posts", content.posts);

const keep = new Set(content.tracks.map((row) => row.id));
const existing = await db.collection("tracks").get();
for (const doc of existing.docs) {
  if (!keep.has(doc.id)) await doc.ref.delete();
}

console.log("Published tree copy. Sale and referral config were not changed.");
