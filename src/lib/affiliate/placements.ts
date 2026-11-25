/**
 * Placement ids: the `?src=` value on /go links, so the click log can answer
 * "which page / button drove this click?".
 *
 * This list documents the ids the site itself uses. It is NOT a whitelist:
 * any value matching PLACEMENT_PATTERN is stored as-is, so ad-hoc share links
 * like /go/ridge-ramps?src=ig-story work without code changes.
 */
export const PLACEMENTS = {
  partnersHub: "partners-hub",
  brandHero: "brand-hero",
  brandProduct: "brand-product",
  brandFooter: "brand-footer",
  home: "home",
  links: "links",
  /** Prefix; full id is `blog-<post-slug>` (see blogPlacement). */
  blogPrefix: "blog-",
  share: "share",
  /** Stored when a /go link has no `src` (e.g. a link texted to a friend). */
  direct: "direct",
  /** Stored when `src` is present but invalid. */
  unknown: "unknown",
} as const;

export const PLACEMENT_PATTERN = /^[a-z0-9-]{1,64}$/;

/** Normalize a raw `?src=` value for storage. */
export function sanitizePlacement(raw: string | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return PLACEMENTS.direct;
  return PLACEMENT_PATTERN.test(raw) ? raw : PLACEMENTS.unknown;
}

/** `blog-<post-slug>`, coerced to the allowed character set and length. */
export function blogPlacement(postSlug: string): string {
  const cleaned = postSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${PLACEMENTS.blogPrefix}${cleaned || "post"}`.slice(0, 64);
}
