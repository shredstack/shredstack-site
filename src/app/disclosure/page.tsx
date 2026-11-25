import type { Metadata } from "next";
import Link from "next/link";
import { RELATIONSHIP_LABELS, getActivePartners, getCurrentRelationships } from "@/data/partners";
import { ExperienceBadge } from "@/components/affiliate/ExperienceBadge";

// Bump when the policy text below changes (not when partners change; that list is generated).
const LAST_UPDATED = "2026-11-25";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description: "How affiliate links work on ShredStack, which brands I partner with, and what we log.",
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-surface-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function DisclosurePage() {
  const relationships = getCurrentRelationships();
  const withPages = new Set(getActivePartners().filter((p) => p.story.length > 0).map((p) => p.slug));

  return (
    <div className="py-16">
      <div className="section-container max-w-3xl">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-gradient-rainbow">Affiliate Disclosure</span>
          </h1>
          <p className="text-surface-400">Last updated: {formatDate(LAST_UPDATED)}</p>
        </header>

        <div className="space-y-10">
          <Section title="What an affiliate link is">
            <p>
              Some links on ShredStack are affiliate links. If you click one and buy something, the brand
              pays me a small commission. It costs you nothing extra: you pay the same price either way.
            </p>
            <p>
              Affiliate links on this site go through a short <code className="text-primary-300">/go/</code>{" "}
              link (for example, <code className="text-primary-300">shredstack.net/go/brand-name</code>)
              that sends you straight to the brand&apos;s site. Every page with affiliate links says so
              near the top, before the first link.
            </p>
          </Section>

          <Section title="Current relationships">
            {relationships.length === 0 ? (
              <p>I don&apos;t have any brand partnerships right now.</p>
            ) : (
              <ul className="space-y-3">
                {relationships.map((partner) => (
                  <li
                    key={partner.slug}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-surface-700 bg-surface-800/50 px-4 py-3"
                  >
                    {withPages.has(partner.slug) ? (
                      <Link
                        href={`/partners/${partner.slug}`}
                        className="font-semibold text-white hover:text-accent-400 transition-colors"
                      >
                        {partner.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-white">{partner.name}</span>
                    )}
                    <span className="text-sm text-surface-400">{RELATIONSHIP_LABELS[partner.relationship]}</span>
                    <ExperienceBadge experience={partner.experience} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="My standard">
            <p>
              I only partner with brands I genuinely believe in. Every brand page says whether we own the
              product, have tried it, or just have it on our wish list, and I only write reviews of things
              we actually own. Brands don&apos;t review or approve what I write.
            </p>
          </Section>

          <Section title="Social media">
            <p>
              When I share an affiliate link on social media, I say so at the start of the caption (for
              example, &ldquo;#ad&rdquo; or &ldquo;I earn a commission from this link&rdquo;), not buried in
              hashtags or behind &ldquo;more&rdquo;, and I say it out loud in videos. My{" "}
              <Link href="/links" className="text-accent-400 underline hover:text-accent-300">
                link-in-bio page
              </Link>{" "}
              carries its own disclosure too.
            </p>
          </Section>

          <Section title="What we log">
            <p>
              When you click a <code className="text-primary-300">/go/</code> link, we count the click (which
              page and link, rough country, device type). No IP addresses, no cookies, no personal info.
            </p>
            <p>
              We also count page views with Vercel Web Analytics. Vercel says it works without third-party
              cookies and isn&apos;t tied to any individual or IP address: visitors are identified by a hash
              of the request, and visitor sessions are discarded after 24 hours. It tells me which pages are
              popular and roughly where visitors come from (referring site, location, device type), never
              who you are. Before anything is sent, the site strips page addresses of everything except a
              short list of campaign and filter tags. See{" "}
              <a
                href="https://vercel.com/docs/analytics/privacy-policy"
                className="text-accent-400 underline hover:text-accent-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vercel&apos;s Web Analytics privacy page
              </a>{" "}
              for the details.
            </p>
            <p>
              Purchases and commissions are tracked by each brand&apos;s own affiliate program, not by this
              site.
            </p>
          </Section>

          <Section title="Questions?">
            <p>
              <Link href="/contact" className="text-accent-400 underline hover:text-accent-300">
                Get in touch
              </Link>{" "}
              any time.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
