import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Technical articles, tutorials, and thoughts from Sarah Dorich.",
};

// Placeholder blog posts - will be replaced with Supabase data in Phase 2
const posts = [
  {
    slug: "building-fuelrx",
    title: "Building FuelRx: A Custom Nutrition Tracking App",
    excerpt:
      "How I built a nutrition tracking app that uses AI to make meal logging effortless, and what I learned along the way.",
    date: "Coming Soon",
    tags: ["Next.js", "AI", "Supabase"],
    published: false,
    color: "rainbow-cyan",
  },
  {
    slug: "data-engineering-lessons",
    title: "Data Engineering Lessons from Healthcare Staffing",
    excerpt:
      "Key insights from building data pipelines and ML systems at scale in the healthcare industry.",
    date: "Coming Soon",
    tags: ["Data Engineering", "Python", "AWS"],
    published: false,
    color: "rainbow-purple",
  },
];

export default function BlogPage() {
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

        {/* Coming Soon Notice */}
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

        {/* Upcoming Posts Preview */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Upcoming Posts</h2>
          <div className="space-y-6">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="card p-6 relative overflow-hidden opacity-75"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-${post.color}`} />
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-1 text-xs font-medium bg-surface-700/50 text-surface-400 rounded-full border border-surface-600">
                    {post.date}
                  </span>
                  <div className="flex gap-2">
                    {post.tags.map((tag, i) => (
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
      </div>
    </div>
  );
}
