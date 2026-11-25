/**
 * Request classification for the /go click log. Nothing here is stored except
 * the coarse device type and the referrer HOST (never the full UA or URL).
 */

/** Bots, crawlers, link-preview fetchers (iMessage/Slack/Instagram unfurls) and CLI tools. */
const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|Slackbot|Discordbot|WhatsApp|TelegramBot|Twitterbot|LinkedInBot|preview|curl|wget|python-requests|HeadlessChrome/i;

/** True for bots and preview fetchers. A missing user agent is treated as a bot. */
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOT_UA_PATTERN.test(userAgent);
}

/** True for browser / Next.js prefetches, which aren't real clicks. */
export function isPrefetch(headers: Headers): boolean {
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`;
  return /prefetch/i.test(purpose) || headers.has("next-router-prefetch");
}

export type DeviceType = "mobile" | "tablet" | "desktop";

/** Coarse device type from the UA. Only this label is stored, never the UA itself. */
export function getDeviceType(userAgent: string | null): DeviceType {
  const ua = userAgent ?? "";
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

/** Host only (e.g. "l.instagram.com"); never the path or query. */
export function getReferrerHost(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const host = new URL(referer).host.toLowerCase();
    return host ? host.slice(0, 255) : null;
  } catch {
    return null;
  }
}

/** Two-letter country from Vercel's geo header, or null. */
export function getCountry(headers: Headers): string | null {
  const country = headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(country) ? country : null;
}
