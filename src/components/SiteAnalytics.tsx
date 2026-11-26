"use client";

import { Analytics } from "@vercel/analytics/next";
import type { BeforeSendEvent } from "@vercel/analytics/next";

// Vercel Web Analytics (cookieless). Rendered only in production builds; see
// src/app/layout.tsx. This is the only file allowed to import @vercel/analytics
// (enforced by scripts/check-analytics.sh).

/** Page views under these prefixes are never sent. */
const PRIVATE_PATH_PREFIXES = ["/admin", "/api"];

/** Query params kept on every page. Everything else is deleted before sending. */
const ALLOWED_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "src"]);

/** Extra params kept on specific pages (exact pathname, trailing slash ignored). */
const PAGE_ALLOWED_PARAMS: Record<string, string[]> = {
  "/partners": ["category"],
};

/** `?analytics=off` sets this; `?analytics=on` clears it. While set, nothing is sent. */
export const OPT_OUT_STORAGE_KEY = "shredstack_exclude_analytics";
const OPT_OUT_PARAM = "analytics";

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Safari private mode and locked-down browsers can throw on access.
    return null;
  }
}

/** Applies ?analytics=off|on and reports whether this browser is opted out. */
function isOptedOut(url: URL): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const toggle = url.searchParams.get(OPT_OUT_PARAM);
    if (toggle === "off") storage.setItem(OPT_OUT_STORAGE_KEY, "1");
    else if (toggle === "on") storage.removeItem(OPT_OUT_STORAGE_KEY);
    return storage.getItem(OPT_OUT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  let url: URL;
  try {
    url = new URL(event.url);
  } catch {
    return null;
  }

  if (PRIVATE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return null;
  if (isOptedOut(url)) return null;

  const normalizedPath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  const allowed = new Set([...ALLOWED_PARAMS, ...(PAGE_ALLOWED_PARAMS[normalizedPath] ?? [])]);
  for (const key of Array.from(url.searchParams.keys())) {
    if (!allowed.has(key)) url.searchParams.delete(key);
  }
  // Fragments never reach the server, so they can hold tokens (e.g. auth redirects). Drop them.
  url.hash = "";

  return { ...event, url: url.toString() };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
