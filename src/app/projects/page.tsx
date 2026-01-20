import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Explore Sarah's projects - from nutrition apps to data engineering.",
};

const projects = [
  {
    id: "fuelrx",
    name: "FuelRx",
    description:
      "A custom nutrition tracking app that makes logging meals effortless with AI-powered food recognition and macro calculations.",
    longDescription:
      "Built to solve my own frustration with existing nutrition apps, FuelRx uses the Anthropic API to analyze meal photos and descriptions, automatically calculating macros and nutrients. Features include meal history, progress tracking, and goal setting.",
    techStack: ["Next.js", "TypeScript", "Supabase", "Anthropic API", "Tailwind CSS"],
    featured: true,
    status: "Active",
    gradient: "from-rainbow-cyan to-rainbow-teal",
  },
  {
    id: "locumsmart",
    name: "Locumsmart VMS",
    description:
      "Enterprise healthcare staffing platform handling thousands of locum tenens providers and healthcare facilities.",
    longDescription:
      "At Locumsmart, I've built data pipelines processing millions of records, developed ML models for provider matching, and architected systems that power critical staffing operations in the healthcare industry.",
    techStack: ["Python", "SQL", "AWS", "dbt", "Airflow", "Machine Learning"],
    featured: true,
    status: "Professional",
    gradient: "from-rainbow-purple to-rainbow-indigo",
  },
  {
    id: "shredstack",
    name: "ShredStack Site",
    description:
      "This very site! A personal developer portfolio and playground built with modern web technologies.",
    longDescription:
      "A place to showcase projects, share technical content, and experiment with new ideas. Built with Next.js 15, TypeScript, and Tailwind CSS, with plans to add a blog, interactive playground, and AI-powered features.",
    techStack: ["Next.js 15", "TypeScript", "Tailwind CSS", "Vercel"],
    githubUrl: "https://github.com/sarahdorich/shredstack-site",
    featured: false,
    status: "Active",
    gradient: "from-rainbow-pink to-rainbow-orange",
  },
];

function ProjectCard({
  project,
}: {
  project: (typeof projects)[0];
}) {
  return (
    <div
      id={project.id}
      className="group card p-6 relative overflow-hidden"
    >
      {/* Gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${project.gradient}`} />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white group-hover:text-accent-400 transition-colors">
            {project.name}
          </h3>
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
              project.status === "Active"
                ? "bg-rainbow-green/20 text-rainbow-green border border-rainbow-green/30"
                : project.status === "Professional"
                  ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                  : "bg-surface-700 text-surface-400 border border-surface-600"
            }`}
          >
            {project.status}
          </span>
        </div>
        {project.featured && (
          <span className="px-2 py-1 text-xs font-medium bg-rainbow-yellow/20 text-rainbow-yellow border border-rainbow-yellow/30 rounded-full">
            Featured
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-surface-300 mb-2">{project.description}</p>
      <p className="text-sm text-surface-400 mb-4">{project.longDescription}</p>

      {/* Tech Stack */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.techStack.map((tech, i) => (
          <span
            key={tech}
            className={`tag ${i % 3 === 0 ? 'tag-primary' : i % 3 === 1 ? 'tag-accent' : ''}`}
          >
            {tech}
          </span>
        ))}
      </div>

      {/* Links */}
      <div className="flex gap-4">
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-surface-400 hover:text-rainbow-purple transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            View Code
          </a>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const featuredProjects = projects.filter((p) => p.featured);
  const otherProjects = projects.filter((p) => !p.featured);

  return (
    <div className="py-16">
      <div className="section-container">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-gradient-rainbow">Projects</span>
          </h1>
          <p className="text-xl text-surface-300">
            A collection of things I&apos;ve built - from production systems at work
            to personal experiments and side projects.
          </p>
        </div>

        {/* Featured Projects */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Featured</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        {/* Other Projects */}
        {otherProjects.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">More Projects</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        )}

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
