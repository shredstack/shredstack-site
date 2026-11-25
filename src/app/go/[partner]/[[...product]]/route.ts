import { after, type NextRequest } from "next/server";
import { getPartner, type Partner } from "@/data/partners";
import { sanitizePlacement } from "@/lib/affiliate/placements";
import { getCountry, getDeviceType, getReferrerHost, isBot, isPrefetch } from "@/lib/affiliate/bots";

/**
 * /go/<partner>[/<product>]?src=<placement>
 *
 * 302 to the partner's affiliate URL, then count the click AFTER the response
 * is sent. The redirect never waits on, or fails because of, the database.
 */
export const dynamic = "force-dynamic";

const REDIRECT_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { ...REDIRECT_HEADERS, Location: location },
  });
}

/** Resolve the destination. Returns the URL exactly as issued unless UTMs are appended. */
function resolveTarget(partner: Partner, productKey: string | null, placement: string): string {
  if (partner.status === "ended") return partner.websiteUrl;

  const product = productKey ? partner.products?.find((p) => p.key === productKey) : undefined;
  const base = product?.affiliateUrl ?? partner.affiliateUrl;

  if (!partner.appendUtm) return base;

  // Append only; URL.searchParams.set keeps every existing param (especially `ref`).
  const url = new URL(base);
  url.searchParams.set("utm_source", "shredstack");
  url.searchParams.set("utm_medium", "affiliate");
  url.searchParams.set("utm_campaign", placement);
  return url.toString();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partner: string; product?: string[] }> }
) {
  const { partner: partnerSlug, product: productSegments } = await params;
  const partner = getPartner(partnerSlug);

  if (!partner) {
    return redirect(new URL("/partners", request.url).toString());
  }

  // Only a single product segment is meaningful; anything else falls back to the partner URL.
  const requestedProduct = productSegments?.length === 1 ? productSegments[0] : null;
  const knownProduct = requestedProduct
    ? partner.products?.find((p) => p.key === requestedProduct)?.key ?? null
    : null;

  const placement = sanitizePlacement(request.nextUrl.searchParams.get("src"));
  const target = resolveTarget(partner, knownProduct, placement);

  const headers = request.headers;
  const userAgent = headers.get("user-agent");

  if (!isBot(userAgent) && !isPrefetch(headers)) {
    // Capture only the coarse fields we store; nothing else leaves this scope.
    const click = {
      partnerSlug: partner.slug,
      productKey: knownProduct,
      placement,
      referrerHost: getReferrerHost(headers.get("referer")),
      country: getCountry(headers),
      deviceType: getDeviceType(userAgent),
    };

    after(async () => {
      try {
        // Imported lazily so a DB/config problem can never affect the redirect.
        const { db, affiliateClicks } = await import("@/db");
        await db.insert(affiliateClicks).values(click);
      } catch (error) {
        console.error("Failed to log affiliate click:", error);
      }
    });
  }

  return redirect(target);
}
