"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedAuth = sessionStorage.getItem("admin_authenticated");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        sessionStorage.setItem("admin_authenticated", "true");
        setIsAuthenticated(true);
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Authentication failed");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
    setPassword("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16">
        <div className="w-full max-w-md px-4">
          <div className="card p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-indigo via-rainbow-cyan to-rainbow-teal" />

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
              <p className="text-surface-400">Enter password to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-surface-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-surface-800 border border-surface-600 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" className="w-full btn-primary">
                Sign In
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-surface-400 hover:text-primary-400 text-sm transition-colors">
                &larr; Back to site
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Admin Header */}
      <header className="border-b border-surface-700 bg-surface-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="section-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin/blog" className="text-xl font-bold text-white">
                Admin
              </Link>
              <nav className="flex items-center gap-4">
                <Link
                  href="/admin/blog"
                  className="text-surface-300 hover:text-primary-400 transition-colors"
                >
                  Blog Posts
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-surface-400 hover:text-white text-sm transition-colors"
              >
                View Site
              </Link>
              <button
                onClick={handleLogout}
                className="text-surface-400 hover:text-red-400 text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main>{children}</main>
    </div>
  );
}
