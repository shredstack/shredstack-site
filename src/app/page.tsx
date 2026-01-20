import Link from "next/link";

const featuredProjects = [
  {
    name: "FuelRx",
    description:
      "A custom nutrition tracking app built with Next.js, Supabase, and AI-powered meal analysis.",
    tech: ["Next.js", "TypeScript", "Supabase", "AI"],
    href: "/projects#fuelrx",
    color: "from-rainbow-cyan to-rainbow-teal",
  },
  {
    name: "Locumsmart VMS",
    description:
      "Enterprise healthcare staffing platform handling thousands of providers and facilities.",
    tech: ["Data Engineering", "Python", "SQL"],
    href: "/projects#locumsmart",
    color: "from-rainbow-purple to-rainbow-indigo",
  },
];

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

      {/* Featured Projects Section */}
      <section className="py-20 bg-surface-900">
        <div className="section-container">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-white">
              Featured Projects
            </h2>
            <Link
              href="/projects"
              className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {featuredProjects.map((project) => (
              <Link
                key={project.name}
                href={project.href}
                className="group block p-6 card relative overflow-hidden"
              >
                {/* Gradient accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${project.color}`} />

                <h3 className="text-xl font-semibold text-white group-hover:text-accent-400 transition-colors">
                  {project.name}
                </h3>
                <p className="mt-3 text-surface-400">{project.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tech.map((tech, i) => (
                    <span
                      key={tech}
                      className={`tag ${i % 2 === 0 ? 'tag-primary' : 'tag-accent'}`}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
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
              When I&apos;m not coding, you&apos;ll find me at CrossFit or exploring the outdoors.
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
