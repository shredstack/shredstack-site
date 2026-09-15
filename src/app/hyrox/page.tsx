import type { Metadata } from "next";
import Link from "next/link";
import { HYROX_RACE_LIST } from "@/lib/hyroxCheer/races";
import { formatDateLong } from "@/lib/hyroxCheer/time";

export const metadata: Metadata = {
  title: "Hyrox | ShredStack",
  description: "Race-day cheer trackers for Sarah's HYROX races.",
};

export default function HyroxPage() {
  return (
    <div className="py-16">
      <div className="section-container">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-gradient-rainbow">Hyrox</span>
          </h1>
          <p className="text-xl text-surface-300">
            Live cheer cards for Sarah&rsquo;s races &mdash; mark her time at every run and
            station, see how she&rsquo;s pacing, and cheer her on from anywhere.
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Races</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {HYROX_RACE_LIST.map((race) => (
              <Link
                key={race.slug}
                href={`/hyrox/${race.slug}`}
                className="card p-6 relative overflow-hidden group hover:border-surface-600 transition-colors"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-orange to-rainbow-yellow" />
                <div className="text-4xl mb-4">🏁</div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-400 transition-colors">
                  {race.eventLabel}
                </h3>
                <p className="text-surface-400 text-sm">
                  {formatDateLong(new Date(race.startISO), race.timeZone)}
                </p>
                <div className="mt-4 inline-flex items-center text-accent-400 text-sm font-medium">
                  Open cheer card
                  <svg
                    className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
