import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getActivePartners } from "@/data/partners";
import { SITE_URL } from "@/lib/site";

// Regenerate at most hourly so new blog posts show up without a deploy.
export const revalidate = 3600;

async function getBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    // Imported lazily so a missing/unreachable DB can't break the static entries.
    const { db, blogPosts } = await import("@/db");
    const posts = await db
      .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
      .from(blogPosts)
      .where(eq(blogPosts.published, true));
    return posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      ...(post.updatedAt ? { lastModified: post.updatedAt } : {}),
    }));
  } catch (error) {
    console.error("sitemap: failed to load blog posts; serving static entries only", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["/", "/about", "/projects", "/blog", "/partners", "/disclosure", "/hyrox"];
  const partnerPaths = getActivePartners()
    .filter((p) => p.story.length > 0)
    .map((p) => `/partners/${p.slug}`);

  const staticEntries = [...staticPaths, ...partnerPaths].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));

  return [...staticEntries, ...(await getBlogEntries())];
}
