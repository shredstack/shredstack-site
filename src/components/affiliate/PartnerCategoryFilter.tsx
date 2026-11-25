"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export interface CategoryGroup {
  key: string;
  label: string;
  emoji: string;
  count: number;
  /** Server-rendered section content (heading + cards). */
  content: ReactNode;
}

function chipClass(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "border-accent-400 bg-accent-500/20 text-accent-300"
      : "border-surface-600 bg-surface-800 text-surface-300 hover:border-surface-500 hover:text-white"
  }`;
}

/**
 * Filter chips for 2+ categories. Filtering is client-side via `?category=`
 * so filtered views are shareable. Unknown categories show everything.
 */
export function PartnerCategoryFilter({ groups }: { groups: CategoryGroup[] }) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("category");
  const selected = groups.some((g) => g.key === requested) ? requested : null;
  const visible = selected ? groups.filter((g) => g.key === selected) : groups;

  return (
    <>
      <nav aria-label="Filter by category" className="mb-10 flex flex-wrap gap-2">
        <Link href="/partners" scroll={false} className={chipClass(selected === null)}>
          All
        </Link>
        {groups.map((g) => (
          <Link
            key={g.key}
            href={`/partners?category=${encodeURIComponent(g.key)}`}
            scroll={false}
            className={chipClass(selected === g.key)}
          >
            <span aria-hidden="true">{g.emoji}</span>
            {g.label}
            <span className="text-xs text-surface-400">{g.count}</span>
          </Link>
        ))}
      </nav>
      <div className="space-y-14">
        {visible.map((g) => (
          <div key={g.key}>{g.content}</div>
        ))}
      </div>
    </>
  );
}

/** Suspense fallback / no-JS rendering: every category, no filtering. */
export function AllCategorySections({ groups }: { groups: CategoryGroup[] }) {
  return (
    <div className="space-y-14">
      {groups.map((g) => (
        <div key={g.key}>{g.content}</div>
      ))}
    </div>
  );
}
