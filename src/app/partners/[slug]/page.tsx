import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EXPERIENCE_LABELS,
  PARTNER_CATEGORIES,
  RELATIONSHIP_LABELS,
  getActivePartners,
  type Partner,
} from "@/data/partners";
import { PLACEMENTS } from "@/lib/affiliate/placements";
import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { DiscountCode } from "@/components/affiliate/DiscountCode";
import { ExperienceBadge } from "@/components/affiliate/ExperienceBadge";
import { ImageCredit, PartnerVisual } from "@/components/affiliate/PartnerCard";

// Only active (and, in production, written) partners get a page; everything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return getActivePartners().map((p) => ({ slug: p.slug }));
}

function findPartner(slug: string): Partner | undefined {
  return getActivePartners().find((p) => p.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const partner = findPartner(slug);
  if (!partner) return { title: "Partner Not Found" };

  return {
    title: `${partner.name} | Partners`,
    description: partner.tagline,
    openGraph: {
      title: partner.name,
      description: partner.tagline,
      ...(partner.heroImage && {
        images: [{ url: partner.heroImage.src, alt: partner.heroImage.alt }],
      }),
    },
  };
}

function formatExpiry(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function BulletList({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold text-white mb-4">{heading}</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-surface-300">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function PartnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const partner = findPartner(slug);
  if (!partner) notFound();

  const category = PARTNER_CATEGORIES[partner.category];
  const experience = EXPERIENCE_LABELS[partner.experience];
  const closing = partner.closingCta ?? { heading: `Check out ${partner.name}` };
  const shopLabel = `Shop ${partner.name}`;

  return (
    <div>
      {/* 1. Hero */}
      <section className="py-12 md:py-16 bg-surface-900">
        <div className="section-container">
          <Link
            href="/partners"
            className="inline-flex items-center text-surface-400 hover:text-primary-400 mb-8 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All partners
          </Link>

          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/30">
                  {RELATIONSHIP_LABELS[partner.relationship]}
                </span>
                <ExperienceBadge experience={partner.experience} />
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-surface-700/50 text-surface-300 border border-surface-600">
                  <span aria-hidden="true">{category.emoji}</span>
                  {category.label}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">{partner.name}</h1>
              <p className="mt-4 text-xl text-surface-300">{partner.tagline}</p>

              <AffiliateDisclosure variant="single" partner={partner} className="mt-6" />

              <div className="mt-6">
                <AffiliateLink partner={partner.slug} src={PLACEMENTS.brandHero} className="btn-primary">
                  {shopLabel}
                </AffiliateLink>
              </div>
            </div>

            <div>
              <PartnerVisual
                partner={partner}
                className="aspect-[4/3] w-full rounded-xl border border-surface-700"
                emojiClassName="text-8xl"
              />
              {(partner.heroImage ?? partner.logo) && <ImageCredit image={(partner.heroImage ?? partner.logo)!} />}
            </div>
          </div>
        </div>
      </section>

      <div className="section-container py-12">
      <div className="max-w-4xl space-y-12">
        {/* 2. Discount callout */}
        {partner.discount && (
          <section className="card p-6 border-rainbow-yellow/30">
            <h2 className="text-xl font-semibold text-white mb-3">Discount code</h2>
            <DiscountCode code={partner.discount.code} />
            <p className="mt-3 text-surface-300">{partner.discount.description}</p>
            {partner.discount.expires && (
              <p className="mt-1 text-sm text-surface-400">Expires {formatExpiry(partner.discount.expires)}</p>
            )}
          </section>
        )}

        {/* 3. Our story */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Our story</h2>
          {partner.story.length > 0 ? (
            <div className="space-y-4 text-lg leading-relaxed text-surface-300">
              {partner.story.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : (
            // Only reachable in development: storyless partners 404 in production.
            <div className="rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-400/10 p-6 text-yellow-300 font-medium">
              TODO(Sarah): add your story
            </div>
          )}
        </section>

        {/* 4. Highlights + Good for */}
        {partner.highlights?.length || partner.goodFor?.length ? (
          <section className="grid gap-6 md:grid-cols-2">
            {partner.highlights?.length ? (
              <BulletList heading={experience.highlightsHeading} items={partner.highlights} />
            ) : null}
            {partner.goodFor?.length ? <BulletList heading="Good for" items={partner.goodFor} /> : null}
          </section>
        ) : null}

        {/* 5. Photo gallery */}
        {partner.gallery?.length ? (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Photos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {partner.gallery.map((image) => (
                <figure key={image.src}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-surface-700 bg-surface-800">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      loading="lazy"
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption>
                    <ImageCredit image={image} />
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {/* 6. Products */}
        {partner.products?.length ? (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Products</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {partner.products.map((product) => (
                <article key={product.key} className="card relative overflow-hidden flex flex-col">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${partner.gradient}`} />
                  {product.image && (
                    <div>
                      <div className="relative aspect-[4/3] bg-surface-800">
                        <Image
                          src={product.image.src}
                          alt={product.image.alt}
                          fill
                          loading="lazy"
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="px-6">
                        <ImageCredit image={product.image} />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    {product.label && (
                      <span className="self-start mb-3 inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-rainbow-purple/15 text-rainbow-purple border border-rainbow-purple/30">
                        {product.label}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                    <p className="mt-2 text-surface-300">{product.description}</p>
                    {product.priceNote && <p className="mt-2 text-sm text-surface-400">{product.priceNote}</p>}
                    <div className="mt-auto pt-5">
                      <AffiliateLink
                        partner={partner.slug}
                        product={product.key}
                        src={PLACEMENTS.brandProduct}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        {`Shop ${product.name}`}
                      </AffiliateLink>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      </div>

      {/* 7. Closing CTA band */}
      <section className="py-16 bg-gradient-to-r from-rainbow-indigo via-primary-600 to-rainbow-cyan relative overflow-hidden">
        <div className="absolute inset-0 bg-surface-900/30" />
        <div className="section-container text-center relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">{closing.heading}</h2>
          {closing.body && <p className="text-lg text-surface-200 mb-8 max-w-2xl mx-auto">{closing.body}</p>}
          <div className={`flex flex-wrap justify-center gap-4 ${closing.body ? "" : "mt-8"}`}>
            <AffiliateLink
              partner={partner.slug}
              src={PLACEMENTS.brandFooter}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-surface-900 font-semibold hover:bg-surface-100 transition-colors shadow-lg"
            >
              {shopLabel}
            </AffiliateLink>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border-2 border-white/80 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Questions? Ask me
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
