import { EXPERIENCE_LABELS, type PartnerExperience } from "@/data/partners";

const STYLES: Record<PartnerExperience, string> = {
  own: "bg-rainbow-green/15 text-rainbow-green border-rainbow-green/30",
  tried: "bg-rainbow-cyan/15 text-rainbow-cyan border-rainbow-cyan/30",
  wishlist: "bg-rainbow-yellow/15 text-rainbow-yellow border-rainbow-yellow/30",
};

/** Honest "do we actually own this?" pill. Shown on every partner card and brand page. */
export function ExperienceBadge({ experience }: { experience: PartnerExperience }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${STYLES[experience]}`}
    >
      {EXPERIENCE_LABELS[experience].badge}
    </span>
  );
}
