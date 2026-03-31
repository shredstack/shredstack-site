"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function SavedCfdDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;

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
        <Link
          href="/playground/cfd-dashboard"
          className="text-surface-400 hover:text-accent-400 transition-colors"
        >
          CFD Dashboard
        </Link>
        <span className="text-surface-600">/</span>
        <span className="text-white font-medium">{slug}</span>
      </div>

      {/* Full-screen iframe — pass slug as query param so the HTML can fetch saved data */}
      <iframe
        src={`/playground/cfd-dashboard.html?saved=${encodeURIComponent(slug)}`}
        className="flex-1 w-full border-0"
        title={`CFD Dashboard — ${slug}`}
      />
    </div>
  );
}
