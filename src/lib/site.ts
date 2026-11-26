/** Canonical public origin, used for metadataBase, robots.txt and sitemap.xml. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shredstack.net").replace(/\/+$/, "");

/** Google Search Console HTML-tag verification token (public; it's in the page source).
 * Empty string = no tag rendered. Get it from Search Console → Add property → URL prefix
 * → https://shredstack.net → "HTML tag" method; copy only the content="..." value. */
export const GOOGLE_SITE_VERIFICATION = "AKDrrpoMGZsQpvv-c_nDWKfQ7WT0npPe3dtMBtrasIU";
