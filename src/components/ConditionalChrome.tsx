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

export function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = CHROMELESS_PATTERN.test(pathname);

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
