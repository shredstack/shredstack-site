import Link from "next/link";
import BlogPostEditor from "@/components/BlogPostEditor";

export default function NewBlogPostPage() {
  return (
    <div className="py-8">
      <div className="section-container">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-surface-400">
              <li>
                <Link href="/admin/blog" className="hover:text-primary-400 transition-colors">
                  Blog Posts
                </Link>
              </li>
              <li>/</li>
              <li className="text-white">New Post</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Create New Post</h1>
            <p className="text-surface-400 mt-1">
              Write and publish a new blog post
            </p>
          </div>

          {/* Editor Card */}
          <div className="card p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-indigo via-rainbow-cyan to-rainbow-teal" />
            <BlogPostEditor mode="create" />
          </div>
        </div>
      </div>
    </div>
  );
}
