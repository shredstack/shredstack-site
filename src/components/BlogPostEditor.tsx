"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BlogPost } from "@/db/schema";

interface BlogPostEditorProps {
  post?: BlogPost;
  mode: "create" | "edit";
}

const COLOR_OPTIONS = [
  { value: "rainbow-cyan", label: "Cyan", class: "bg-rainbow-cyan" },
  { value: "rainbow-indigo", label: "Indigo", class: "bg-rainbow-indigo" },
  { value: "rainbow-purple", label: "Purple", class: "bg-rainbow-purple" },
  { value: "rainbow-teal", label: "Teal", class: "bg-rainbow-teal" },
  { value: "rainbow-green", label: "Green", class: "bg-rainbow-green" },
  { value: "primary", label: "Blue", class: "bg-primary-500" },
  { value: "accent", label: "Accent", class: "bg-accent-500" },
];

export default function BlogPostEditor({ post, mode }: BlogPostEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    slug: post?.slug || "",
    title: post?.title || "",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    published: post?.published || false,
    tags: post?.tags?.join(", ") || "",
    color: post?.color || "rainbow-cyan",
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: mode === "create" && !prev.slug ? generateSlug(title) : prev.slug,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    const tagsArray = formData.tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const payload = {
      slug: formData.slug,
      title: formData.title,
      excerpt: formData.excerpt,
      content: formData.content,
      published: formData.published,
      tags: tagsArray,
      color: formData.color,
    };

    try {
      const url = mode === "create" ? "/api/blog" : `/api/blog/${post?.slug}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save post");
      }

      setStatus("success");

      // Redirect after a brief delay to show success state
      setTimeout(() => {
        router.push("/admin/blog");
        router.refresh();
      }, 1000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title & Slug Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-surface-300 mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-surface-800 border border-surface-600 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            placeholder="Post title"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-surface-300 mb-2">
            URL Slug <span className="text-red-400">*</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-4 py-3 rounded-l-lg bg-surface-700 border border-r-0 border-surface-600 text-surface-400 text-sm">
              /blog/
            </span>
            <input
              type="text"
              id="slug"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="flex-1 px-4 py-3 rounded-r-lg bg-surface-800 border border-surface-600 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              placeholder="url-friendly-slug"
            />
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-surface-300 mb-2">
          Excerpt <span className="text-red-400">*</span>
          <span className="text-surface-500 font-normal ml-2">— Brief summary for listing pages</span>
        </label>
        <textarea
          id="excerpt"
          rows={2}
          required
          value={formData.excerpt}
          onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-surface-800 border border-surface-600 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
          placeholder="A brief summary of your post..."
        />
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-surface-300 mb-2">
          Content <span className="text-red-400">*</span>
          <span className="text-surface-500 font-normal ml-2">— Supports basic markdown-like formatting</span>
        </label>
        <textarea
          id="content"
          rows={15}
          required
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-surface-800 border border-surface-600 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-y font-mono text-sm"
          placeholder="Write your post content here...

# Heading 1
## Heading 2
### Heading 3

**bold text**
*italic text*
`inline code`

```javascript
// code block
const example = 'Hello World';
```

[Link text](https://example.com)"
        />
      </div>

      {/* Tags & Color Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-surface-300 mb-2">
            Tags
            <span className="text-surface-500 font-normal ml-2">— Comma-separated</span>
          </label>
          <input
            type="text"
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-surface-800 border border-surface-600 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            placeholder="nextjs, react, tutorial"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">
            Accent Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={`w-10 h-10 rounded-lg ${color.class} transition-all ${
                  formData.color === color.value
                    ? "ring-2 ring-white ring-offset-2 ring-offset-surface-800 scale-110"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Published Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, published: !formData.published })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            formData.published ? "bg-green-500" : "bg-surface-600"
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              formData.published ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-surface-300">
          {formData.published ? "Published" : "Draft"}
          <span className="text-surface-500 ml-2">
            — {formData.published ? "Visible to everyone" : "Only visible to admins"}
          </span>
        </span>
      </div>

      {/* Error Message */}
      {status === "error" && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Success Message */}
      {status === "success" && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-sm">
            Post {mode === "create" ? "created" : "updated"} successfully! Redirecting...
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-4 pt-4 border-t border-surface-700">
        <button
          type="submit"
          disabled={status === "saving" || status === "success"}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "saving" ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : mode === "create" ? (
            "Create Post"
          ) : (
            "Save Changes"
          )}
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/blog")}
          className="btn-secondary"
        >
          Cancel
        </button>

        {mode === "edit" && post && (
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-surface-400 hover:text-primary-400 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Preview
          </a>
        )}
      </div>
    </form>
  );
}
