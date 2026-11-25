import Image from "next/image";
import Link from "next/link";
import { PARTNER_CATEGORIES, type Partner, type PartnerImage } from "@/data/partners";
import { AffiliateLink } from "./AffiliateLink";
import { ExperienceBadge } from "./ExperienceBadge";

/** Credit line for brand-supplied images ("Photo: <Brand>"). */
export function ImageCredit({ image }: { image: PartnerImage }) {
  if (!image.caption && !image.credit) return null;
  return (
    <p className="mt-1.5 text-xs text-surface-400">
      {image.caption}
      {image.caption && image.credit ? " · " : ""}
      {image.credit}
    </p>
  );
}

/**
 * Hero image → logo → gradient + emoji fallback. Adding photos later is a
 * data-only change in src/data/partners.ts.
 */
export function PartnerVisual({
  partner,
  className = "",
  emojiClassName = "text-6xl",
  sizes = "(min-width: 768px) 50vw, 100vw",
}: {
  partner: Partner;
  className?: string;
  emojiClassName?: string;
  sizes?: string;
}) {
  if (partner.heroImage) {
    return (
      <div className={`relative overflow-hidden bg-surface-800 ${className}`}>
        <Image src={partner.heroImage.src} alt={partner.heroImage.alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  if (partner.logo) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br ${partner.gradient} ${className}`}>
        <div className="absolute inset-0 bg-surface-900/60" />
        <Image src={partner.logo.src} alt={partner.logo.alt} fill sizes={sizes} className="object-contain p-8" />
      </div>
    );
  }
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${partner.gradient} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-surface-900/40" />
      <span className={`relative drop-shadow-lg ${emojiClassName}`}>{partner.emoji}</span>
    </div>
  );
}

interface PartnerCardProps {
  partner: Partner;
  /** Placement id for the shop link (e.g. "partners-hub", "home"). */
  src: string;
  /** Compact mode for the homepage row. */
  compact?: boolean;
  /** Wide side-by-side layout, used when a page has a single partner. */
  wide?: boolean;
}

export function PartnerCard({ partner, src, compact = false, wide = false }: PartnerCardProps) {
  const category = PARTNER_CATEGORIES[partner.category];
  const creditImage = partner.heroImage ?? partner.logo;

  return (
    <article
      className={`card relative overflow-hidden flex ${wide ? "flex-col md:flex-row" : "flex-col"}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 z-10 bg-gradient-to-r ${partner.gradient}`} />

      <div className={wide ? "md:w-2/5 shrink-0" : ""}>
        <PartnerVisual
          partner={partner}
          className={wide ? "h-48 md:h-full md:min-h-[16rem]" : compact ? "h-28" : "h-40"}
          emojiClassName={compact ? "text-5xl" : "text-6xl"}
        />
        {creditImage?.credit && (
          <div className="px-6">
            <ImageCredit image={{ ...creditImage, caption: undefined }} />
          </div>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "p-5" : "p-6"}`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <ExperienceBadge experience={partner.experience} />
          {!compact && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-surface-700/50 text-surface-300 border border-surface-600">
              <span aria-hidden="true">{category.emoji}</span>
              {category.label}
            </span>
          )}
          {partner.discount && (
            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-rainbow-pink/15 text-rainbow-pink border border-rainbow-pink/30">
              Discount code
            </span>
          )}
        </div>

        <h3 className={`${compact ? "text-lg" : "text-xl"} font-semibold text-white`}>{partner.name}</h3>
        <p className={`mt-2 ${compact ? "text-sm text-surface-400" : "text-surface-300"}`}>{partner.tagline}</p>

        <div className={`mt-auto flex flex-wrap gap-3 ${compact ? "pt-4" : "pt-6"}`}>
          <Link
            href={`/partners/${partner.slug}`}
            className={compact ? "btn-primary px-4 py-2 text-sm" : "btn-primary"}
          >
            Read more
          </Link>
          <AffiliateLink
            partner={partner.slug}
            src={src}
            className={compact ? "btn-secondary px-4 py-2 text-sm" : "btn-secondary"}
          >
            {`Shop ${partner.name}`}
          </AffiliateLink>
        </div>
      </div>
    </article>
  );
}
