import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, blogPosts, type BlogPost } from "@/db";
import { eq } from "drizzle-orm";
import { getPartner } from "@/data/partners";
import { blogPlacement } from "@/lib/affiliate/placements";
import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug));
    return posts.length > 0 ? posts[0] : null;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Markdown link targets that point at an affiliate redirect: "/go/<partner>[/<product>]"
// or the "go:<partner>[/<product>]" shorthand.
const AFFILIATE_LINK_PATTERN = /\]\((?:\/go\/|go:)([^)\/?#\s]+)/g;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * For "/go/..." (or "go:...") hrefs, return the normalized "/go/..." href with
 * `src=blog-<post-slug>` appended when the link has no `src`. Returns null for
 * every other href, which is left exactly as before.
 */
function toAffiliateHref(href: string, postSlug: string): string | null {
  const raw = href.startsWith("go:") ? `/go/${href.slice(3)}` : href;
  if (!raw.startsWith("/go/")) return null;
  try {
    // Re-serializing through URL percent-encodes quotes/brackets in the path and query.
    const url = new URL(raw, "https://placeholder.invalid");
    if (!url.searchParams.has("src")) {
      url.searchParams.set("src", blogPlacement(postSlug));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Known partners linked from the post via /go/ (or go:) links. */
function getLinkedPartners(content: string) {
  const slugs = new Set(Array.from(content.matchAll(AFFILIATE_LINK_PATTERN), (m) => m[1]));
  return {
    hasAffiliateLinks: slugs.size > 0,
    partners: Array.from(slugs)
      .map((slug) => getPartner(slug))
      .filter((p): p is NonNullable<typeof p> => p !== undefined),
  };
}

// Simple markdown-like rendering for content
function renderContent(content: string, postSlug: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-white mt-8 mb-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mt-12 mb-6">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-surface-800 rounded-lg p-4 my-6 overflow-x-auto"><code class="text-sm text-surface-200 font-mono">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-surface-800 px-2 py-1 rounded text-primary-400 font-mono text-sm">$1</code>')
    // Links (affiliate /go/ links get rel="sponsored" + a placement id; others unchanged)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text: string, href: string) => {
      const affiliateHref = toAffiliateHref(href, postSlug);
      if (affiliateHref) {
        return `<a href="${escapeAttr(affiliateHref)}" class="text-primary-400 hover:text-primary-300 underline" target="_blank" rel="sponsored noopener">${text}</a>`;
      }
      return `<a href="${href}" class="text-primary-400 hover:text-primary-300 underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
    })
    // Line breaks and paragraphs
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('<h') && !p.startsWith('<pre'))
    .map(p => `<p class="text-surface-300 leading-relaxed mb-4">${p}</p>`)
    .join('');
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  // Show unpublished posts but with a notice
  const isUnpublished = !post.published;
  const affiliate = getLinkedPartners(post.content);

  return (
    <div className="py-16">
      <div className="section-container">
        <article className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Link
            href="/blog"
            className="inline-flex items-center text-surface-400 hover:text-primary-400 mb-8 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>

          {/* Unpublished Notice */}
          {isUnpublished && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                This post is a draft and not yet published.
              </p>
            </div>
          )}

          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 text-xs font-medium bg-surface-700/50 text-surface-300 rounded-full border border-surface-600">
                {formatDate(post.createdAt)}
              </span>
              <div className="flex gap-2">
                {(post.tags ?? []).map((tag, i) => (
                  <span
                    key={tag}
                    className={`tag ${i % 2 === 0 ? 'tag-primary' : 'tag-accent'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {post.title}
            </h1>
            <p className="text-xl text-surface-400">
              {post.excerpt}
            </p>
          </header>

          {/* Divider */}
          <div className={`h-1 w-24 bg-${post.color} rounded mb-12`} />

          {/* Affiliate disclosure: required above the first affiliate link */}
          {affiliate.hasAffiliateLinks && (
            <AffiliateDisclosure
              variant={affiliate.partners.length === 1 ? "single" : "multi"}
              partner={affiliate.partners.length === 1 ? affiliate.partners[0] : undefined}
              className="mb-10"
            />
          )}

          {/* Content */}
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content, post.slug) }}
          />

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-surface-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="text-surface-400 text-sm">
                  Last updated: {formatDate(post.updatedAt)}
                </p>
              </div>
              <Link
                href="/contact"
                className="btn-primary"
              >
                Get in Touch
              </Link>
            </div>
          </footer>
        </article>

        {/* Newsletter CTA */}
        <div className="max-w-3xl mx-auto mt-16 p-8 bg-gradient-to-r from-rainbow-indigo via-primary-600 to-rainbow-cyan rounded-xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-surface-900/50" />
          <div className="relative z-10">
            <h3 className="text-xl font-semibold text-white mb-2">
              Enjoyed this post?
            </h3>
            <p className="text-surface-200 mb-6">
              Get notified when new posts go live.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-surface-900 font-semibold hover:bg-surface-100 transition-colors shadow-lg"
            >
              Subscribe via Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
