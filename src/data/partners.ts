/**
 * Affiliate partners: the single place to add or edit a brand OR a category.
 *
 * Adding brand #2: append an entry to `partners` below and drop its photos in
 * /public/partners/<slug>/. Adding a category: add one line to
 * PARTNER_CATEGORIES. No component code changes needed for either.
 *
 * Honesty rules (see claude_instructions/affiliate_partners_spec.md §4):
 * - `experience` must reflect reality. Only "own" may say "we use / we love ours".
 * - `story`/`highlights` are my words, never the brand's product copy.
 * - Brand-supplied images need permission and `credit: "Photo: <Brand>"`.
 * - `affiliateUrl` is the EXACT link the program issued. This file is the only
 *   place affiliate URLs live; everything else links through /go/<slug>.
 */

export interface CategoryMeta {
  label: string;
  emoji: string;
  order: number;
}

export const PARTNER_CATEGORIES = {
  "family-backyard": { label: "Family & Backyard", emoji: "🏡", order: 10 },
  "training":        { label: "Training",          emoji: "🏋️", order: 20 },
  "recovery":        { label: "Recovery",          emoji: "🧊", order: 30 },
  "water-sports":    { label: "Water Sports",      emoji: "🏄‍♀️", order: 40 },
  "outdoors":        { label: "Outdoors",          emoji: "🏔️", order: 50 },
  "food-nutrition":  { label: "Food & Nutrition",  emoji: "🥗", order: 60 },
  "home":            { label: "Home",              emoji: "🛋️", order: 70 },
  "tech":            { label: "Tech",              emoji: "💻", order: 80 },
  "other":           { label: "Other Favorites",   emoji: "⭐", order: 999 },
} as const satisfies Record<string, CategoryMeta>;

export type PartnerCategory = keyof typeof PARTNER_CATEGORIES;
export type PartnerRelationship = "affiliate" | "ambassador" | "sponsored" | "gifted";
export type PartnerStatus = "active" | "paused" | "ended";
/** Honest statement of our first-hand experience. Drives badges + copy (§4.4). */
export type PartnerExperience = "own" | "tried" | "wishlist";

export const EXPERIENCE_LABELS: Record<PartnerExperience, { badge: string; highlightsHeading: string }> = {
  own:      { badge: "We own this",       highlightsHeading: "How we use it" },
  tried:    { badge: "We've tried it",    highlightsHeading: "What stood out" },
  wishlist: { badge: "On our wish list",  highlightsHeading: "Why it's on our list" },
};

export const RELATIONSHIP_LABELS: Record<PartnerRelationship, string> = {
  affiliate: "Affiliate",
  ambassador: "Ambassador",
  sponsored: "Sponsored",
  gifted: "Gifted",
};

export interface PartnerImage {
  src: string;        // under /public/partners/<slug>/...
  alt: string;        // descriptive, required
  caption?: string;
  credit?: string;    // e.g. "Photo: RIDGE Ramps". REQUIRED for brand-supplied images, rendered under the image
}

export interface PartnerProduct {
  key: string;                // url-safe, used in /go/[partner]/[product]
  name: string;
  description: string;        // my words, not the brand's product copy
  label?: string;             // e.g. "The one we're eyeing"
  affiliateUrl?: string;      // product deep link incl. ref param. Only set once verified (§10). Else falls back to partner link
  image?: PartnerImage;
  priceNote?: string;         // e.g. "From $3,095 (Nov 2026)". Always dated; omit if unsure
}

export interface Partner {
  slug: string;               // "ridge-ramps": used in /partners/[slug] and /go/[slug]
  name: string;               // "RIDGE Ramps"
  tagline: string;            // one-liner for cards
  emoji: string;              // fallback visual when no logo/hero
  category: PartnerCategory;
  relationship: PartnerRelationship;
  experience: PartnerExperience;
  status: PartnerStatus;      // "ended" → /go redirects to websiteUrl (no ref), hidden from /partners
  featured: boolean;          // shown on homepage + top of /links
  affiliateUrl: string;       // EXACT link from the affiliate program
  websiteUrl: string;         // plain brand URL (fallback when ended)
  dashboardUrl?: string;      // affiliate dashboard, admin page only
  discount?: { code: string; description: string; expires?: string }; // only if the brand gives me one
  logo?: PartnerImage;
  heroImage?: PartnerImage;
  gallery?: PartnerImage[];
  story: string[];            // paragraphs, first person, honest, consistent with `experience`
  highlights?: string[];      // bullets; heading comes from EXPERIENCE_LABELS
  goodFor?: string[];
  products?: PartnerProduct[];
  closingCta?: { heading: string; body?: string }; // default: { heading: `Check out ${name}` }
  usingSince?: string;        // "2025-06". Only when experience === "own"
  gradient: string;           // tailwind gradient classes (full literal names), matches ProjectCard look
  appendUtm?: boolean;        // default false; see spec §7
}

export const partners: Partner[] = [
  {
    slug: "ridge-ramps",
    name: "RIDGE Ramps",
    tagline: "Backyard skate ramp kits from a local Utah company.",
    emoji: "🛹",
    category: "family-backyard",
    relationship: "affiliate",
    experience: "wishlist",
    status: "active",
    featured: true,
    affiliateUrl: "https://ridgeramps.com?ref=2BgM2",
    websiteUrl: "https://ridgeramps.com",
    story: [
      "My kids tried a RIDGE Ramps half pipe at a friend's house and fell in love. They haven't stopped talking about it since, and a half pipe of our own is now at the very top of their wish list.",
      "We don't own one yet, so this isn't a review. It's why I'm backing them: RIDGE Ramps is a local Utah company that builds its ramp kits in-house, ships them with pre-drilled parts and instructions, and is refreshingly upfront about how it prices them.",
      "If you've got skate-obsessed kids too (or you're a grown-up who misses skating), take a look. And if we end up building one, I'll share the whole build here.",
    ],
    highlights: [
      "Local: designed and built in Utah",
      "Kits ship with pre-drilled parts and instructions",
      "Transparent pricing: they explain exactly how their kits are priced",
      "Sizes from a 12\" kicker up to full half pipes",
    ],
    goodFor: [
      "Kids who are hooked on skating",
      "Families with some backyard space",
    ],
    products: [
      {
        key: "half-pipe",
        name: "Half Pipe Ramp Kits",
        label: "The one we're eyeing",
        description: "The half pipe is the one my kids fell for at our friend's house. It's the big one on our list.",
        priceNote: "36\" Half Pipe from $3,095 (Nov 2026)",
        // no affiliateUrl until product deep links are verified (§10); falls back to partner link
      },
    ],
    closingCta: { heading: "Have a skater at home?", body: "See RIDGE Ramps' full lineup of ramps." },
    gradient: "from-rainbow-orange to-rainbow-yellow",
    appendUtm: false,
  },
];

const isProduction = process.env.NODE_ENV === "production";

/** A partner whose page is ready to show. In development, storyless partners are
 * shown (with a TODO box) so pages can be drafted; in production they're hidden. */
function isPublishable(partner: Partner): boolean {
  return partner.status === "active" && (partner.story.length > 0 || !isProduction);
}

export function getActivePartners(): Partner[] {
  return partners.filter(isPublishable);
}

/** Featured partners with a written story (homepage + top of /links). */
export function getFeaturedPartners(): Partner[] {
  return getActivePartners().filter((p) => p.featured && p.story.length > 0);
}

/** Any partner by slug, regardless of status. /go uses this so old links keep working. */
export function getPartner(slug: string): Partner | undefined {
  return partners.find((p) => p.slug === slug);
}

/** Active partners grouped by category, sorted by `order`; empty categories omitted. */
export function getPartnersByCategory(): {
  category: PartnerCategory;
  meta: CategoryMeta;
  partners: Partner[];
}[] {
  const active = getActivePartners();
  return (Object.keys(PARTNER_CATEGORIES) as PartnerCategory[])
    .map((category) => ({
      category,
      meta: PARTNER_CATEGORIES[category] as CategoryMeta,
      partners: active.filter((p) => p.category === category),
    }))
    .filter((group) => group.partners.length > 0)
    .sort((a, b) => a.meta.order - b.meta.order);
}

/** Partnerships that are current (not ended), for the /disclosure page. */
export function getCurrentRelationships(): Partner[] {
  return partners.filter((p) => p.status !== "ended");
}
