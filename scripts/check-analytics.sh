#!/usr/bin/env bash
# Analytics / privacy guard (see claude_instructions/site_analytics_spec.md §7).
# Run from anywhere: ./scripts/check-analytics.sh. Exits non-zero on any violation.
set -uo pipefail

cd "$(dirname "$0")/.."

fail=0
report() {
  echo "FAIL: $1"
  [ -n "${2:-}" ] && echo "$2" | sed 's/^/  /'
  fail=1
}

# 1. @vercel/analytics is imported only by the SiteAnalytics wrapper.
hits=$(grep -rnE "['\"]@vercel/analytics(/[^'\"]*)?['\"]" src | grep -v '^src/components/SiteAnalytics.tsx:' || true)
[ -n "$hits" ] && report "@vercel/analytics imported outside src/components/SiteAnalytics.tsx" "$hits"

# 2. <SiteAnalytics /> is rendered only in the root layout.
hits=$(grep -rnE "<SiteAnalytics[[:space:]/>]" src | grep -v '^src/app/layout.tsx:' || true)
[ -n "$hits" ] && report "<SiteAnalytics /> rendered outside src/app/layout.tsx" "$hits"
count=$(grep -cE "<SiteAnalytics[[:space:]/>]" src/app/layout.tsx || true)
[ "$count" != "1" ] && report "expected exactly one <SiteAnalytics /> in src/app/layout.tsx, found $count"

# 3. No Google Analytics / gtag snippets (would need a consent banner and a /disclosure rewrite).
hits=$(grep -rnE "googletagmanager\.com|gtag\(|google-analytics\.com" src || true)
[ -n "$hits" ] && report "Google Analytics / gtag code found in src/" "$hits"

# 4. Affiliate destination URLs live only in the partner registry.
hits=$(grep -rn "ridgeramps\.com" src | grep -v '^src/data/partners.ts:' || true)
[ -n "$hits" ] && report "ridgeramps.com found outside src/data/partners.ts" "$hits"

if [ "$fail" -ne 0 ]; then
  exit 1
fi
echo "check-analytics: all checks passed"
