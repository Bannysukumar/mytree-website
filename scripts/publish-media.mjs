import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const keyPath = process.argv[2];
initializeApp({
  credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))),
  projectId: "uwgea32",
});
const db = getFirestore();
const content = JSON.parse(readFileSync(new URL("../public/seed/content.json", import.meta.url), "utf8"));

await db.collection("site").doc("brand").set(content.brand, { merge: true });
await db.collection("site").doc("contact").set({
  headline: content.contact.headline,
  newsletterPlaceholder: content.contact.newsletterPlaceholder,
  newsletterButton: content.contact.newsletterButton,
  links: content.contact.links,
}, { merge: true });
for (const banner of content.banners) {
  const { id, ...data } = banner;
  await db.collection("banners").doc(id).set(data, { merge: true });
}
const hero = await db.collection("site").doc("hero").get();
const slides = (hero.data()?.slides || content.hero.slides).map((slide) => {
  const seeded = content.hero.slides.find((item) => item.id === slide.id);
  return { ...slide, imageUrl: slide.imageUrl || seeded?.imageUrl || "" };
});
await db.collection("site").doc("hero").set({ slides }, { merge: true });
for (const row of [...content.tracks, ...content.team, ...content.posts, ...content.testimonials]) {
  const name = content.tracks.some((item) => item.id === row.id)
    ? "tracks"
    : content.team.some((item) => item.id === row.id)
      ? "team"
      : content.posts.some((item) => item.id === row.id)
        ? "posts"
        : "testimonials";
  if (row.imageUrl) await db.collection(name).doc(row.id).set({ imageUrl: row.imageUrl }, { merge: true });
}
await db.collection("config").doc("sale").set({
  timerEnabled: true,
  timerEndsAt: content.sale.timerEndsAt,
  timerLabel: content.sale.timerLabel,
  timerEndedText: content.sale.timerEndedText,
}, { merge: true });
console.log("Published logo, banners, images, and presale timer");
