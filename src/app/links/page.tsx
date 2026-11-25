import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getFeaturedPartners } from "@/data/partners";
import { PLACEMENTS } from "@/lib/affiliate/placements";
import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { DiscountCode } from "@/components/affiliate/DiscountCode";
import { SOCIAL_LINKS, SocialIcon } from "@/components/SocialLinks";

export const metadata: Metadata = {
  title: "Links",
  description: "Sarah Dorich · ShredStack: brands I support, blog, Hyrox, projects and more.",
};

const SITE_LINKS = [
  { href: "/partners", label: "Brands I Support" },
  { href: "/blog", label: "Blog" },
  { href: "/hyrox", label: "Hyrox" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
];

const buttonClass =
  "flex w-full items-center justify-center rounded-xl border border-surface-600 bg-surface-800 px-5 py-4 text-center font-semibold text-white transition-colors hover:border-accent-400 hover:bg-surface-700";

export default function LinksPage() {
  const featured = getFeaturedPartners();

  return (
    <div className="min-h-screen bg-surface-900 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <Image
          src="/shredstack_logo.png"
          alt="ShredStack logo"
          width={80}
          height={80}
          priority
          className="h-20 w-20 rounded-full border-2 border-surface-700 bg-surface-800 p-2"
        />
        <h1 className="mt-4 text-xl font-bold text-white">Sarah Dorich · ShredStack</h1>
        <p className="mt-1 text-center text-sm text-surface-300">
          AI &amp; Data Engineer · CrossFit + HYROX athlete · Mom of two
        </p>

        {featured.length > 0 && (
          <p className="mt-4 rounded-lg border border-surface-600 bg-surface-800/70 px-4 py-3 text-center text-sm leading-relaxed text-surface-300">
            <strong className="font-semibold text-white">Heads up:</strong> some links below are affiliate
            links. If you buy through them I earn a small commission at no extra cost to you.{" "}
            <Link href="/disclosure" className="text-accent-400 underline hover:text-accent-300">
              Disclosure
            </Link>
          </p>
        )}

        <nav aria-label="Links" className="mt-6 flex w-full flex-col gap-3">
          {featured.map((partner) => (
            <div key={partner.slug} className="flex flex-col gap-2">
              <AffiliateLink
                partner={partner.slug}
                src={PLACEMENTS.links}
                label={`Shop ${partner.name}`}
                showIcon={false}
                className={`${buttonClass} flex-col gap-0.5 border-transparent bg-gradient-to-r ${partner.gradient} hover:border-white/60`}
              >
                <span className="text-base text-white drop-shadow">
                  <span aria-hidden="true" className="mr-2">
                    {partner.emoji}
                  </span>
                  Shop {partner.name}
                  <span aria-hidden="true" className="ml-1.5">
                    ↗
                  </span>
                </span>
                <span className="text-xs font-medium text-white/90">{partner.tagline}</span>
              </AffiliateLink>
              {partner.discount && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-surface-300">
                  <DiscountCode code={partner.discount.code} />
                  <span>{partner.discount.description}</span>
                </div>
              )}
            </div>
          ))}

          {SITE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={buttonClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 flex gap-6">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className={`text-surface-400 ${link.hoverClass} transition-colors`}
            >
              <SocialIcon link={link} className="w-7 h-7" />
            </a>
          ))}
        </div>

        <Link href="/" className="mt-8 text-xs text-surface-500 hover:text-accent-400">
          shredstack.net
        </Link>
      </div>
    </div>
  );
}
