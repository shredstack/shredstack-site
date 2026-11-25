"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";

// Individual Hyrox race cheer cards (e.g. /hyrox/slc-2026) are meant to be
// pulled up quickly and repeatedly on a phone during a race — they're a
// self-contained "card" design, not a normal browsing page, so they run
// full-bleed without the site nav/footer. The /hyrox hub page keeps the
// normal site chrome.
const CHROMELESS_PATTERN = /^\/hyrox\/[^/]+\/?$/;

// The /links "link in bio" page is opened from Instagram/TikTok on a phone and
// is designed as a single self-contained column, so it also skips the chrome.
const CHROMELESS_PATHS = new Set(["/links", "/links/"]);

export function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = CHROMELESS_PATTERN.test(pathname) || CHROMELESS_PATHS.has(pathname);

  if (chromeless) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
