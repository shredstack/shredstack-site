import type { Metadata } from "next";
import { ProjectCard } from "@/components/ProjectCard";
import {
  getPersonalProjects,
  getProfessionalProjects,
} from "@/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Explore Sarah's projects - from nutrition apps to data engineering.",
};

export default function ProjectsPage() {
  const personalProjects = getPersonalProjects();
  const professionalProjects = getProfessionalProjects();

  return (
    <div className="py-16">
      <div className="section-container">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-gradient-rainbow">Projects</span>
          </h1>
          <p className="text-xl text-surface-300">
            A collection of things I&apos;ve built - from personal experiments
            to production systems at work.
          </p>
        </div>

        {/* Personal Projects */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Personal Projects</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {personalProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        {/* Professional Work */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">Professional Work</h2>
          <p className="text-surface-400 mb-6">Projects I&apos;ve built at Locumsmart</p>
          <div className="grid md:grid-cols-2 gap-6">
            {professionalProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 p-8 card text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-rainbow-soft opacity-20" />
          <div className="relative z-10">
            <h3 className="text-xl font-semibold text-white mb-2">
              Want to see more?
            </h3>
            <p className="text-surface-400 mb-4">
              Check out my GitHub for more projects and contributions.
            </p>
            <a
              href="https://github.com/sarahdorich"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              View GitHub Profile
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
