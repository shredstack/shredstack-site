"use client";

import Link from "next/link";

export default function CfdDashboardPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Breadcrumb bar */}
      <div className="bg-surface-900 border-b border-surface-700 px-4 py-3 flex items-center gap-2 text-sm shrink-0">
        <Link
          href="/playground"
          className="text-surface-400 hover:text-accent-400 transition-colors"
        >
          Playground
        </Link>
        <span className="text-surface-600">/</span>
        <span className="text-white font-medium">CFD Progress Dashboard</span>
      </div>

      {/* Full-screen iframe */}
      <iframe
        src="/playground/cfd-dashboard.html"
        className="flex-1 w-full border-0"
        title="CFD Progress Dashboard — PushPress Score Export Analyzer"
      />
    </div>
  );
}
