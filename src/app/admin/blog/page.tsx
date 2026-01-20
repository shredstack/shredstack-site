"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BlogPost } from "@/db/schema";

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/blog?all=true");
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const togglePublished = async (slug: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/blog/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !currentStatus }),
      });

      if (response.ok) {
        setPosts(posts.map(post =>
          post.slug === slug ? { ...post, published: !currentStatus } : post
        ));
      }
    } catch (error) {
      console.error("Failed to toggle publish status:", error);
    }
  };

  const deletePost = async (slug: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/blog/${slug}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPosts(posts.filter(post => post.slug !== slug));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="py-16">
        <div className="section-container">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="section-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Blog Posts</h1>
            <p className="text-surface-400 mt-1">
              {posts.length} post{posts.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link href="/admin/blog/new" className="btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </Link>
        </div>

        {/* Posts Table */}
        {posts.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
            <p className="text-surface-400 mb-6">Get started by creating your first blog post.</p>
            <Link href="/admin/blog/new" className="btn-primary inline-flex">
              Create First Post
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-surface-300">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-surface-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-surface-300">Tags</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-surface-300">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-surface-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-surface-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={`/admin/blog/${post.slug}/edit`}
                          className="text-white font-medium hover:text-primary-400 transition-colors"
                        >
                          {post.title}
                        </Link>
                        <p className="text-surface-500 text-sm mt-1 truncate max-w-md">
                          {post.excerpt}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublished(post.slug, post.published ?? false)}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          post.published
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${post.published ? "bg-green-400" : "bg-yellow-400"}`} />
                        {post.published ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {post.tags && post.tags.length > 0 ? (
                          post.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="tag text-xs">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-surface-500 text-sm">—</span>
                        )}
                        {post.tags && post.tags.length > 3 && (
                          <span className="text-surface-500 text-xs">+{post.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-surface-400 text-sm">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="p-2 text-surface-400 hover:text-primary-400 transition-colors"
                          title="View post"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                        <Link
                          href={`/admin/blog/${post.slug}/edit`}
                          className="p-2 text-surface-400 hover:text-primary-400 transition-colors"
                          title="Edit post"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(post.slug)}
                          className="p-2 text-surface-400 hover:text-red-400 transition-colors"
                          title="Delete post"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="card p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-2">Delete Post?</h3>
              <p className="text-surface-400 mb-6">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deletePost(deleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
