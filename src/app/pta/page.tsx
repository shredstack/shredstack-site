import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PTA | ShredStack",
  description: "PTA events and resources.",
};

const events = [
  {
    slug: "field-day",
    name: "Field Day",
    description: "Draper Elementary Field Day 2026 — Interactive station map with schedules and activities.",
    icon: "🏅",
    gradient: "from-rainbow-green to-rainbow-lime",
  },
];

export default function PTAPage() {
  return (
    <div className="py-16">
      <div className="section-container">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-gradient-rainbow">PTA</span>
          </h1>
          <p className="text-xl text-surface-300">
            Events, resources, and interactive tools for our school community.
          </p>
        </div>

        {/* Events */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.slug}
                href={`/pta/${event.slug}`}
                className="card p-6 relative overflow-hidden group hover:border-surface-600 transition-colors"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${event.gradient}`}
                />
                <div className="text-4xl mb-4">{event.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-400 transition-colors">
                  {event.name}
                </h3>
                <p className="text-surface-400 text-sm">{event.description}</p>
                <div className="mt-4 inline-flex items-center text-accent-400 text-sm font-medium">
                  View details
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
