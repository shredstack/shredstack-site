import Link from "next/link";
import type { Partner, PartnerRelationship } from "@/data/partners";

interface AffiliateDisclosureProps {
  /** "multi": a page with several brands (or brands in general). "single": one brand's page. */
  variant: "multi" | "single";
  /** Required for the "single" variant so the relationship can be named accurately. */
  partner?: Partner;
  className?: string;
}

function singleBrandText(name: string, relationship: PartnerRelationship): string {
  switch (relationship) {
    case "affiliate":
      return `I'm a ${name} affiliate. If you buy through my link I earn a commission at no extra cost to you.`;
    case "ambassador":
      return `I'm a ${name} ambassador. If you buy through my link I may earn a commission at no extra cost to you.`;
    case "sponsored":
      return `${name} paid me to feature them here. If you buy through my link I may also earn a commission at no extra cost to you.`;
    case "gifted":
      return `${name} sent me this for free. If you buy through my link I may also earn a commission at no extra cost to you.`;
  }
}

const MULTI_TEXT =
  "I'm an affiliate for the brands on this page. If you buy through my links, I earn a small commission at no extra cost to you. I only partner with brands I genuinely believe in, and I'll always tell you whether we own it, have tried it, or just want it.";

/**
 * FTC disclosure. Must render ABOVE the first affiliate link on any page that
 * has one, in readable body-size text (not a footer-only or click-to-see note).
 */
export function AffiliateDisclosure({ variant, partner, className = "" }: AffiliateDisclosureProps) {
  const text =
    variant === "single" && partner ? singleBrandText(partner.name, partner.relationship) : MULTI_TEXT;

  return (
    <aside
      aria-label="Affiliate disclosure"
      className={`rounded-lg border border-surface-600 bg-surface-800/70 px-4 py-3 text-sm leading-relaxed text-surface-300 ${className}`}
    >
      <strong className="font-semibold text-white">Heads up:</strong> {text}{" "}
      <Link href="/disclosure" className="text-accent-400 underline hover:text-accent-300">
        Full disclosure
      </Link>
    </aside>
  );
}
