import Link from "next/link";
import { ProjectCard } from "@/components/ProjectCard";
import {
  getFeaturedPersonalProjects,
  getFeaturedProfessionalProjects,
} from "@/data/projects";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface-900">
        <div className="section-container py-20 md:py-32 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Hi, I&apos;m{" "}
              <span className="text-gradient-rainbow">Sarah</span>
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-surface-300 leading-relaxed">
              AI & Data Engineer at Locumsmart. I build data pipelines, ML systems,
              and side projects that solve real problems.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/projects" className="btn-primary">
                View Projects
              </Link>
              <Link href="/contact" className="btn-secondary">
                Get in Touch
              </Link>
            </div>
          </div>
        </div>

        {/* Colorful decorative elements */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-rainbow-indigo rounded-full blur-3xl opacity-20" />
        <div className="absolute -right-10 top-40 w-72 h-72 bg-rainbow-cyan rounded-full blur-3xl opacity-20" />
        <div className="absolute left-10 bottom-10 w-64 h-64 bg-rainbow-purple rounded-full blur-3xl opacity-15" />
        <div className="absolute left-1/3 top-20 w-48 h-48 bg-rainbow-teal rounded-full blur-3xl opacity-15" />
      </section>

      {/* Personal Projects Section */}
      <section className="py-20 bg-surface-900">
        <div className="section-container">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-white">
              Personal Projects
            </h2>
            <Link
              href="/projects"
              className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {getFeaturedPersonalProjects().map((project) => (
              <ProjectCard key={project.id} project={project} compact />
            ))}
          </div>
        </div>
      </section>

      {/* Professional Work Section */}
      <section className="py-20 bg-surface-800">
        <div className="section-container">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white">
              Professional Work
            </h2>
            <p className="mt-2 text-surface-400">
              Projects I&apos;ve built at Locumsmart
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {getFeaturedProfessionalProjects().map((project) => (
              <ProjectCard key={project.id} project={project} compact />
            ))}
          </div>
        </div>
      </section>

      {/* Beyond the Code Section */}
      <section className="py-20 bg-surface-900">
        <div className="section-container">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Beyond the Code
          </h2>
          <p className="text-surface-400 text-center mb-12 max-w-2xl mx-auto">
            When I&apos;m not building data pipelines or training models, you&apos;ll find me chasing adventures and spending time with my favorite people.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: "🏋️", label: "CrossFit", color: "from-rainbow-red to-rainbow-orange", href: "https://games.crossfit.com/athlete/2005988" },
              { icon: "🏄‍♀️", label: "Wakeboarding", color: "from-rainbow-cyan to-rainbow-teal" },
              { icon: "🏂", label: "Snowboarding", color: "from-rainbow-indigo to-rainbow-purple" },
              { icon: "🧗‍♀️", label: "Rock Climbing", color: "from-rainbow-orange to-rainbow-yellow" },
              { icon: "🥾", label: "Hiking", color: "from-rainbow-teal to-rainbow-cyan" },
              { icon: "👧👦", label: "Mom of Two", color: "from-rainbow-purple to-rainbow-indigo" },
              { icon: "💕", label: "Wife Life", color: "from-rainbow-red to-rainbow-purple" },
              { icon: "💪", label: "Adventure Seeker", color: "from-rainbow-cyan to-rainbow-indigo" },
            ].map((interest) => {
              const content = (
                <>
                  <div className={`absolute inset-0 bg-gradient-to-br ${interest.color} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`} />
                  <div className="text-3xl mb-2">{interest.icon}</div>
                  <div className="text-sm font-medium text-surface-300 group-hover:text-white transition-colors">
                    {interest.label}
                  </div>
                </>
              );

              return interest.href ? (
                <a
                  key={interest.label}
                  href={interest.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-4 rounded-xl bg-surface-800 border border-surface-700 hover:border-surface-600 transition-all hover:scale-105 cursor-pointer"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={interest.label}
                  className="group relative p-4 rounded-xl bg-surface-800 border border-surface-700 hover:border-surface-600 transition-all hover:scale-105"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Preview Section */}
      <section className="py-20 bg-surface-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-rainbow-soft opacity-30" />
        <div className="section-container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Building at the Intersection of{" "}
              <span className="text-gradient-rainbow">Data & AI</span>
            </h2>
            <p className="text-lg text-surface-300 mb-8">
              With a background in data engineering and a passion for machine learning,
              I enjoy tackling complex problems and building tools that make a difference.
            </p>
            <Link href="/about" className="btn-secondary">
              Learn More About Me
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-rainbow-indigo via-primary-600 to-rainbow-cyan relative overflow-hidden">
        <div className="absolute inset-0 bg-surface-900/30" />
        <div className="section-container text-center relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">
            Let&apos;s Build Something Together
          </h2>
          <p className="text-lg text-surface-200 mb-8 max-w-2xl mx-auto">
            Have a project idea or just want to chat about tech? I&apos;d love to hear from you.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-surface-900 font-semibold hover:bg-surface-100 transition-colors shadow-lg"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
