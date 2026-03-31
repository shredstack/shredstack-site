import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Playground",
  description: "Interactive experiments, demos, and data visualizations.",
};

const liveExperiments = [
  {
    name: "CFD Progress Dashboard",
    description:
      "Upload your PushPress score export and get personal CrossFit insights — Rx trends, movement analysis, lift progression, and more.",
    icon: "🏋️",
    gradient: "from-rainbow-green to-rainbow-cyan",
    href: "/playground/cfd-dashboard",
  },
];

const upcomingExperiments = [
  {
    name: "AI Chat Demo",
    description: "Interactive chat powered by the Anthropic API",
    icon: "💬",
    gradient: "from-rainbow-purple to-rainbow-indigo",
  },
  {
    name: "Data Viz Gallery",
    description: "Interactive charts and visualizations with Recharts",
    icon: "📊",
    gradient: "from-rainbow-cyan to-rainbow-teal",
  },
  {
    name: "Code Experiments",
    description: "Live code demos and technical experiments",
    icon: "🧪",
    gradient: "from-rainbow-pink to-rainbow-orange",
  },
];

export default function PlaygroundPage() {
  return (
    <div className="py-16">
      <div className="section-container">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-gradient-rainbow">Playground</span>
          </h1>
          <p className="text-xl text-surface-300">
            Interactive experiments, demos, and a space to try new things.
          </p>
        </div>

        {/* Live Experiments */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Experiments</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {liveExperiments.map((experiment) => (
              <Link
                key={experiment.name}
                href={experiment.href}
                className="card p-6 relative overflow-hidden group block"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${experiment.gradient}`} />
                <div className="text-4xl mb-4">{experiment.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-400 transition-colors">
                  {experiment.name}
                </h3>
                <p className="text-surface-400 text-sm">{experiment.description}</p>
                <div className="mt-4 inline-flex items-center text-accent-400 text-sm font-medium group-hover:text-accent-300 transition-colors">
                  Try it out
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

        {/* Coming Soon Grid */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Coming Soon</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {upcomingExperiments.map((experiment) => (
              <div
                key={experiment.name}
                className="card p-6 relative overflow-hidden group"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${experiment.gradient}`} />
                <div className="text-4xl mb-4">{experiment.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-400 transition-colors">
                  {experiment.name}
                </h3>
                <p className="text-surface-400 text-sm">{experiment.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ideas Section */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6">Have an Idea?</h2>
          <div className="card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rainbow-green to-rainbow-lime" />
            <p className="text-surface-300 mb-4">
              Got a suggestion for something cool to build in the playground?
              I&apos;d love to hear it!
            </p>
            <a
              href="/contact"
              className="inline-flex items-center text-accent-400 hover:text-accent-300 font-medium transition-colors"
            >
              Send me your ideas
              <svg
                className="w-4 h-4 ml-2"
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
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
