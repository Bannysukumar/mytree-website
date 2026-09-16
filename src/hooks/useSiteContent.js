import { createContext, createElement, useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import seedContent from "../../public/seed/content.json";
import { db, firebaseReady } from "../lib/firebase";
import { sortByOrder } from "../lib/format";

function fromSeed(content, source) {
  return {
    loading: false,
    source,
    hero: content.hero,
    contact: content.contact,
    legal: content.legal,
    referralCopy: content.referralCopy,
    brand: content.brand || null,
    banners: sortByOrder(content.banners || []),
    tracks: sortByOrder(content.tracks || []),
    poga: sortByOrder(content.poga || []),
    tokenomics: content.tokenomics,
    team: sortByOrder(content.team || []),
    posts: sortByOrder(content.posts || []),
    testimonials: sortByOrder(content.testimonials || []),
    tiers: sortByOrder(content.tiers || []),
    simulatorTasks: sortByOrder(content.simulatorTasks || []),
    sale: content.sale,
    referral: content.referral,
    stats: {},
  };
}

const ContentContext = createContext(null);

function withIds(snap) {
  return sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export function SiteContentProvider({ children }) {
  const [state, setState] = useState(() => fromSeed(seedContent, firebaseReady ? "firestore" : "seed"));

  useEffect(() => {
    if (!firebaseReady || !db) {
      fetch("/seed/content.json")
        .then((r) => r.json())
        .then((content) => {
          setState({
            loading: false,
            source: "seed",
            hero: content.hero,
            contact: content.contact,
            legal: content.legal,
            referralCopy: content.referralCopy,
            brand: content.brand || null,
            banners: sortByOrder(content.banners || []),
            tracks: sortByOrder(content.tracks),
            poga: sortByOrder(content.poga),
            tokenomics: content.tokenomics,
            team: sortByOrder(content.team),
            posts: sortByOrder(content.posts),
            testimonials: sortByOrder(content.testimonials),
            tiers: sortByOrder(content.tiers),
            simulatorTasks: sortByOrder(content.simulatorTasks),
            sale: content.sale,
            referral: content.referral,
            stats: {},
          });
        })
        .catch(() => setState((s) => ({ ...s, loading: false, error: "Could not load content." })));
      return undefined;
    }

    const partial = { source: "firestore" };
    let remaining = 18;
    const publish = (patch) => {
      Object.assign(partial, patch);
      remaining -= 1;
      setState((prev) => ({ ...prev, ...patch, source: "firestore", loading: remaining > 0 }));
    };

    const unsubs = [
      onSnapshot(doc(db, "site", "hero"), (s) => publish({ hero: s.data() || null })),
      onSnapshot(doc(db, "site", "contact"), (s) => publish({ contact: s.data() || null })),
      onSnapshot(doc(db, "site", "legal"), (s) => publish({ legal: s.data() || null })),
      onSnapshot(doc(db, "site", "referralCopy"), (s) => publish({ referralCopy: s.data() || null })),
      onSnapshot(doc(db, "site", "brand"), (s) => publish({ brand: s.data() || null })),
      onSnapshot(collection(db, "banners"), (s) => publish({ banners: withIds(s) })),
      onSnapshot(collection(db, "tracks"), (s) => publish({ tracks: withIds(s) })),
      onSnapshot(collection(db, "poga"), (s) => publish({ poga: withIds(s) })),
      onSnapshot(collection(db, "team"), (s) => publish({ team: withIds(s) })),
      onSnapshot(collection(db, "posts"), (s) => publish({ posts: withIds(s) })),
      onSnapshot(collection(db, "testimonials"), (s) => publish({ testimonials: withIds(s) })),
      onSnapshot(collection(db, "tiers"), (s) => publish({ tiers: withIds(s) })),
      onSnapshot(collection(db, "simulatorTasks"), (s) => publish({ simulatorTasks: withIds(s) })),
      onSnapshot(doc(db, "tokenomics", "current"), (s) => publish({ tokenomics: s.data() || null })),
      onSnapshot(doc(db, "config", "sale"), (s) => publish({ sale: s.data() || null })),
      onSnapshot(doc(db, "config", "referral"), (s) => publish({ referral: s.data() || null })),
      onSnapshot(doc(db, "config", "dashboard"), (s) => publish({ dashboard: s.data() || null })),
      onSnapshot(doc(db, "stats", "public"), (s) => publish({ stats: s.data() || {} })),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  return createElement(ContentContext.Provider, { value: state }, children);
}

export function useSiteContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return value;
}
