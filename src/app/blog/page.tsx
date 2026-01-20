import type { Metadata } from "next";
import Link from "next/link";
import { db, blogPosts, type BlogPost } from "@/db";
import { desc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Blog",
  description: "Technical articles, tutorials, and thoughts from Sarah Dorich.",
};

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const posts = await db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));
    return posts;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default async function BlogPage() {
  const allPosts = await getBlogPosts();
  const publishedPosts = allPosts.filter(post => post.published);
  const upcomingPosts = allPosts.filter(post => !post.published);

  return (
    <div className="py-16">
      <div className="section-container">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-gradient-rainbow">Blog</span>
          </h1>
          <p className="text-xl text-surface-300">
            Technical articles, tutorials, and thoughts on building software.
          </p>
        </div>

        {/* Published Posts */}
        {publishedPosts.length > 0 ? (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6">Latest Posts</h2>
            <div className="space-y-6">
              {publishedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block"
                >
                  <article className="card p-6 relative overflow-hidden group hover:border-primary-500/50 transition-all">
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-${post.color}`} />
                    <div className="flex items-center gap-3 mb-3">
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
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-surface-400">{post.excerpt}</p>
                    <span className="inline-flex items-center text-primary-400 mt-4 text-sm font-medium">
                      Read more
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          /* Coming Soon Notice */
          <div className="mb-12 p-6 card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-indigo via-rainbow-cyan to-rainbow-teal" />
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Blog coming soon!</h3>
                <p className="text-surface-400 mt-1">
                  I&apos;m working on some posts about building with AI, data engineering,
                  and my side projects. Check back soon!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Posts Preview */}
        {upcomingPosts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Upcoming Posts</h2>
            <div className="space-y-6">
              {upcomingPosts.map((post) => (
                <article
                  key={post.slug}
                  className="card p-6 relative overflow-hidden opacity-75"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-${post.color}`} />
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-surface-700/50 text-surface-400 rounded-full border border-surface-600">
                      Coming Soon
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
                  <h3 className="text-xl font-semibold text-surface-300 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-surface-500">{post.excerpt}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Newsletter CTA */}
        <div className="mt-16 p-8 bg-gradient-to-r from-rainbow-indigo via-primary-600 to-rainbow-cyan rounded-xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-surface-900/50" />
          <div className="relative z-10">
            <h3 className="text-xl font-semibold text-white mb-2">
              Stay in the loop
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

        {/* Discreet admin link */}
        <div className="mt-12 text-center">
          <Link
            href="/admin/blog"
            className="text-surface-500 hover:text-surface-300 text-xs transition-colors"
          >
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}
