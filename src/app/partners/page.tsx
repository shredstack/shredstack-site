import type { Metadata } from "next";
import { Suspense } from "react";
import { getActivePartners, getFeaturedPartners, getPartnersByCategory } from "@/data/partners";
import { PLACEMENTS } from "@/lib/affiliate/placements";
import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";
import { PartnerCard } from "@/components/affiliate/PartnerCard";
import {
  AllCategorySections,
  PartnerCategoryFilter,
  type CategoryGroup,
} from "@/components/affiliate/PartnerCategoryFilter";

const DESCRIPTION =
  "Brands my family and I believe in: some we own, some are on order, some we've tried, some are on our wish list. I'll always tell you which.";

const ogImage = getFeaturedPartners().find((p) => p.heroImage)?.heroImage;

export const metadata: Metadata = {
  title: "Brands I Support",
  description: DESCRIPTION,
  openGraph: {
    title: "Brands I Support",
    description: DESCRIPTION,
    images: [ogImage ? { url: ogImage.src, alt: ogImage.alt } : { url: "/shredstack_logo.png", alt: "ShredStack" }],
  },
};

export default function PartnersPage() {
  const active = getActivePartners();
  const groups = getPartnersByCategory();
  const src = PLACEMENTS.partnersHub;

  let body: React.ReactNode;
  if (active.length === 0) {
    body = <p className="text-surface-400">No partners right now. Check back soon.</p>;
  } else if (active.length === 1) {
    body = <PartnerCard partner={active[0]} src={src} wide />;
  } else if (groups.length === 1) {
    body = (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {active.map((p) => (
          <PartnerCard key={p.slug} partner={p} src={src} />
        ))}
      </div>
    );
  } else {
    const categoryGroups: CategoryGroup[] = groups.map((g) => ({
      key: g.category,
      label: g.meta.label,
      emoji: g.meta.emoji,
      count: g.partners.length,
      content: (
        <section aria-labelledby={`category-${g.category}`}>
          <h2 id={`category-${g.category}`} className="text-2xl font-bold text-white mb-6">
            <span aria-hidden="true" className="mr-2">
              {g.meta.emoji}
            </span>
            {g.meta.label}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {g.partners.map((p) => (
              <PartnerCard key={p.slug} partner={p} src={src} />
            ))}
          </div>
        </section>
      ),
    }));
    body = (
      <Suspense fallback={<AllCategorySections groups={categoryGroups} />}>
        <PartnerCategoryFilter groups={categoryGroups} />
      </Suspense>
    );
  }

  return (
    <div className="py-16">
      <div className="section-container">
        <header className="max-w-3xl mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-gradient-rainbow">Brands I Support</span>
          </h1>
          <p className="text-xl text-surface-300">{DESCRIPTION}</p>
        </header>

        {active.length > 0 && <AffiliateDisclosure variant="multi" className="max-w-3xl mb-10" />}

        {body}
      </div>
    </div>
  );
}
