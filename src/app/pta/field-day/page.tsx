"use client";

import Link from "next/link";

export default function FieldDayPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Breadcrumb bar */}
      <div className="bg-surface-900 border-b border-surface-700 px-4 py-3 flex items-center gap-2 text-sm shrink-0">
        <Link
          href="/pta"
          className="text-surface-400 hover:text-accent-400 transition-colors"
        >
          PTA
        </Link>
        <span className="text-surface-600">/</span>
        <span className="text-white font-medium">Field Day</span>
      </div>

      {/* Full-screen iframe */}
      <iframe
        src="/pta/field-day-map.html"
        className="flex-1 w-full border-0"
        title="Draper Elementary Field Day 2026 — Station Map"
      />
    </div>
  );
}
