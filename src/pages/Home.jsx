import BlogCard from "../components/BlogCard";
import BannerStrip from "../components/BannerStrip";
import DonateWidget from "../components/DonateWidget";
import ForestGuide from "../components/ForestGuide";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import LiveBar from "../components/LiveBar";
import MembershipTier from "../components/MembershipTier";
import Navbar from "../components/Navbar";
import PogaTable from "../components/PogaTable";
import ReferralExplainer from "../components/ReferralExplainer";
import Simulator from "../components/Simulator";
import TeamCard from "../components/TeamCard";
import TestimonialCard from "../components/TestimonialCard";
import TokenomicsChart from "../components/TokenomicsChart";
import Tracks from "../components/Tracks";
import WalletReturnBanner from "../components/WalletReturnBanner";
import { Section } from "../components/ui";
import { useSiteContent } from "../hooks/useSiteContent";

export default function Home() {
  const { testimonials, team, posts, tiers, banners, tracks, loading } = useSiteContent();
  const gallery = [
    ...(banners || []).filter((item) => item.enabled !== false && item.imageUrl),
    ...(tracks || []).filter((item) => item.imageUrl).map((item) => ({ id: `track-${item.id}`, imageUrl: item.imageUrl, title: item.title })),
    ...(posts || []).filter((item) => item.imageUrl).map((item) => ({ id: `post-${item.id}`, imageUrl: item.imageUrl, title: item.title })),
  ].slice(0, 8);

  return (
    <>
      <Navbar />
      <LiveBar />
      <WalletReturnBanner />
      <main id="main">
        <BannerStrip />
        <Hero />
        <ForestGuide />
        <Tracks />
        <TokenomicsChart />
        <DonateWidget />
        <ReferralExplainer />
        <Section id="stories" eyebrow="Field notes" title="Told by people who watched the recount." intro="Crew accounts from the sites, not campaign slogans.">
          <div className="grid gap-6 md:grid-cols-3">
            {!loading && (testimonials || []).map((item) => <TestimonialCard key={item.id} item={item} />)}
          </div>
        </Section>
        {gallery.length > 0 && (
        <Section id="gallery" eyebrow="On the ground" title="Work that can be seen.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {gallery.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-card border border-white/10 bg-moss">
                <img src={item.imageUrl} alt="" loading="lazy" className="h-40 w-full object-cover md:h-48" onError={(event) => { event.currentTarget.remove(); }} />
                <figcaption className="px-3 py-2 text-sm text-slate-300">{item.title}</figcaption>
              </figure>
            ))}
          </div>
        </Section>
        )}
        <Section id="team" eyebrow="Stewards" title="The people who check the count.">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {!loading && (team || []).map((person) => <TeamCard key={person.id} person={person} />)}
          </div>
        </Section>
        <Section id="journal" eyebrow="Journal" title="Notes from the field.">
          <div className="grid gap-6 md:grid-cols-2">
            {!loading && (posts || []).map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
        </Section>
        <Section id="membership" eyebrow="Stand with the work" title="Three ways to stay in the crew.">
          <div className="grid gap-6 md:grid-cols-3">
            {!loading && (tiers || []).map((tier) => <MembershipTier key={tier.id} tier={tier} featured={tier.featured} />)}
          </div>
        </Section>
        <PogaTable />
        <Simulator />
      </main>
      <Footer />
    </>
  );
}
