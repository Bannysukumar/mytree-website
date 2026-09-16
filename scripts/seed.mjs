/**
 * Uploads public/seed/content.json into Firestore.
 * Auth: GOOGLE_APPLICATION_CREDENTIALS or ./serviceAccount.json
 * Project: FIREBASE_PROJECT_ID or .firebaserc default.
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID || "uwgea32";
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "serviceAccount.json";

let credential;
try {
  credential = cert(JSON.parse(readFileSync(credPath, "utf8")));
} catch {
  credential = applicationDefault();
}

initializeApp({ credential, projectId });
const db = getFirestore();
const content = JSON.parse(readFileSync(new URL("../public/seed/content.json", import.meta.url), "utf8"));

async function setMany(collectionName, rows) {
  for (const row of rows) {
    const { id, ...data } = row;
    await db.collection(collectionName).doc(id).set(data, { merge: true });
  }
}

await db.collection("site").doc("hero").set(content.hero);
await db.collection("site").doc("contact").set(content.contact);
await db.collection("site").doc("legal").set(content.legal);
await db.collection("site").doc("referralCopy").set(content.referralCopy);
await db.collection("site").doc("brand").set(content.brand || {});
await setMany("banners", content.banners || []);
await setMany("tracks", content.tracks);
await setMany("poga", content.poga);
await db.collection("tokenomics").doc("current").set(content.tokenomics);
await setMany("team", content.team);
await setMany("posts", content.posts);
await setMany("testimonials", content.testimonials);
await setMany("tiers", content.tiers);
await setMany("simulatorTasks", content.simulatorTasks);
await db.collection("config").doc("sale").set(content.sale);
await db.collection("config").doc("referral").set(content.referral);
const dashboard = JSON.parse(readFileSync(new URL("../public/seed/dashboard.json", import.meta.url), "utf8"));
await db.collection("config").doc("dashboard").set(dashboard);
await db.collection("stats").doc("public").set({ fundsRaisedInr: 0, tokensSold: 0, purchaseCount: 0, donationCount: 0 }, { merge: true });

console.log("Seeded Firestore content for", projectId);
