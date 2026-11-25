import type { MetadataRoute } from "next";
import { getActivePartners } from "@/data/partners";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["/", "/about", "/projects", "/blog", "/partners", "/disclosure"];
  const partnerPaths = getActivePartners()
    .filter((p) => p.story.length > 0)
    .map((p) => `/partners/${p.slug}`);

  return [...staticPaths, ...partnerPaths].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
