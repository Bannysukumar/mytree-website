import { Building2, Camera, Leaf, MapPin, ShieldCheck, TreeDeciduous } from "lucide-react";
import { Section } from "./ui";

const features = [
  { icon: MapPin, title: "Geo-tag the tree", body: "Save the exact spot when you plant. The pin stays with the record so the next visit starts from the same ground." },
  { icon: Camera, title: "Name it from a photo", body: "A picture is enough to start a species note. Stewards can correct the name before the record is treated as verified." },
  { icon: TreeDeciduous, title: "Keep a living profile", body: "Add later photos, a height note, and a care reminder. A tagged tree is a timeline, not a single planting-day post." },
  { icon: ShieldCheck, title: "Protect the count", body: "A dead sapling comes off the public tally. The point of the ledger is a tree that is still there." },
];

const steps = [
  { title: "Name the place", body: "A town, a campus, or a GPS pin. Sun, soil, and water decide what should be planted there." },
  { title: "Choose the purpose", body: "Shade, fruit, medicine, a street edge, or a classroom grove. The plan follows the purpose." },
  { title: "Plant with a layout", body: "Species, spacing, and a first-season care note come before the photograph." },
  { title: "Tag it on Mytree", body: "Register the tree, share the record, and come back when the monsoon has tested it." },
];

export default function ForestGuide() {
  return (
    <>
      <Section id="forest" eyebrow="Digital forest" title="Plant it. Tag it. Keep the record." intro="Every public page starts from the tree, not from a slogan. The wallet sale funds the work. The record is the tree itself.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="glass rounded-card p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-control bg-mint/15 text-mint" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-xl text-foam">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.body}</p>
              </article>
            );
          })}
        </div>
      </Section>
      <Section id="guide" eyebrow="Planting guide" title="From an empty patch to a tagged tree.">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-card border border-mint/20 bg-moss p-5">
              <p className="font-display text-3xl text-mint">{index + 1}</p>
              <h3 className="mt-3 font-display text-xl text-foam">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section id="institutions" eyebrow="Schools and campuses" title="A campus can keep its own forest." intro="Institutions use the same record: a map of trees, a class that walks them, and a public profile that does not disappear after the planting day.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Building2, title: "Campus map", body: "Each tree on the grounds gets a pin, a name, and a photo the school can show." },
            { icon: Leaf, title: "A living class", body: "Students return to the same trees to measure, water, and correct the species note." },
            { icon: ShieldCheck, title: "Shared credit", body: "Participation is counted by verified records, not by how many people held a sapling in one photograph." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="glass rounded-card p-6">
                <Icon className="text-mint" size={22} aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl text-foam">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.body}</p>
              </article>
            );
          })}
        </div>
      </Section>
    </>
  );
}
