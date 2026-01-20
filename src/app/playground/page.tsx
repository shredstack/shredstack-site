import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground",
  description: "Interactive experiments, demos, and data visualizations.",
};

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

        {/* Under Construction */}
        <div className="mb-12 p-8 card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-rainbow-soft opacity-30" />
          <div className="text-center relative z-10">
            <div className="inline-block p-4 bg-surface-800 rounded-full mb-4 border border-surface-700">
              <svg
                className="w-12 h-12 text-accent-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Experiments in Progress
            </h2>
            <p className="text-surface-400 max-w-md mx-auto">
              I&apos;m building out some interactive demos and experiments.
              Check back soon to see what I&apos;m cooking up!
            </p>
          </div>
        </div>

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
