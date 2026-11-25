import type { ReactNode } from "react";
import { getPartner } from "@/data/partners";

interface AffiliateLinkProps {
  /** Partner slug, e.g. "ridge-ramps". */
  partner: string;
  /** Optional product key for /go/<partner>/<product>. */
  product?: string;
  /** Placement id for click tracking (see src/lib/affiliate/placements.ts). */
  src: string;
  className?: string;
  children: ReactNode;
  /** Accessible name (before the "(affiliate link, …)" suffix). Defaults to the text children. */
  label?: string;
  /** Show the trailing ↗ icon. Default true. */
  showIcon?: boolean;
}

/**
 * The ONLY way to link to a partner. A plain <a> (not next/link, so /go/* is
 * never prefetched and logged as a fake click) that always goes through /go/
 * with rel="sponsored noopener" (no "noreferrer": some programs use the referrer).
 */
export function AffiliateLink({
  partner,
  product,
  src,
  className,
  children,
  label,
  showIcon = true,
}: AffiliateLinkProps) {
  const path = `/go/${encodeURIComponent(partner)}${product ? `/${encodeURIComponent(product)}` : ""}`;
  const href = `${path}?src=${encodeURIComponent(src)}`;

  const baseLabel =
    label ??
    (typeof children === "string" ? children : `Visit ${getPartner(partner)?.name ?? partner}`);

  return (
    <a
      href={href}
      rel="sponsored noopener"
      target="_blank"
      className={className}
      aria-label={`${baseLabel} (affiliate link, opens in new tab)`}
    >
      {children}
      {showIcon && (
        <span aria-hidden="true" className="ml-1.5">
          ↗
        </span>
      )}
    </a>
  );
}
