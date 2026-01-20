import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about Sarah Dorich - AI & Data Engineer.",
};

const skills = {
  "Languages & Frameworks": [
    "Python",
    "TypeScript",
    "SQL",
    "Next.js",
    "React",
    "Node.js",
  ],
  "Data & ML": [
    "Pandas",
    "NumPy",
    "Scikit-learn",
    "TensorFlow",
    "dbt",
    "Apache Airflow",
  ],
  "Infrastructure": [
    "AWS",
    "GCP",
    "Docker",
    "Kubernetes",
    "Terraform",
    "PostgreSQL",
  ],
  "Tools & Practices": [
    "Git",
    "CI/CD",
    "Agile",
    "Data Modeling",
    "ETL/ELT",
    "API Design",
  ],
};

const categoryColors: Record<string, string> = {
  "Languages & Frameworks": "bg-rainbow-indigo/20 text-rainbow-indigo border-rainbow-indigo/30",
  "Data & ML": "bg-rainbow-cyan/20 text-rainbow-cyan border-rainbow-cyan/30",
  "Infrastructure": "bg-rainbow-purple/20 text-rainbow-purple border-rainbow-purple/30",
  "Tools & Practices": "bg-rainbow-teal/20 text-rainbow-teal border-rainbow-teal/30",
};

export default function AboutPage() {
  return (
    <div className="py-16">
      <div className="section-container">
        {/* Header */}
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold text-white mb-6">
            About <span className="text-gradient-rainbow">Me</span>
          </h1>
          <p className="text-xl text-surface-300 leading-relaxed">
            I&apos;m Sarah, an AI & Data Engineer passionate about building systems
            that turn raw data into actionable insights.
          </p>
        </div>

        {/* Main Content */}
        <div className="mt-16 grid lg:grid-cols-3 gap-12">
          {/* Bio Column */}
          <div className="lg:col-span-2 space-y-8">
            <section className="card p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Professional Background
              </h2>
              <div className="max-w-none text-surface-300 space-y-4">
                <p>
                  Currently working as an AI & Data Engineer at{" "}
                  <strong className="text-accent-400">Locumsmart</strong>, where I build and
                  maintain data pipelines, develop ML models, and architect systems that power
                  healthcare staffing operations.
                </p>
                <p>
                  I specialize in turning messy, complex data problems into clean, scalable
                  solutions. Whether it&apos;s building ETL pipelines that process millions of
                  records or training models that predict staffing patterns, I love the
                  challenge of making data work smarter.
                </p>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                What I&apos;m Working On
              </h2>
              <div className="max-w-none text-surface-300 space-y-4">
                <p>
                  Outside of work, I&apos;m constantly building side projects to learn new
                  technologies and solve problems I care about. My current focus areas include:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 mt-2 rounded-full bg-rainbow-cyan flex-shrink-0" />
                    <span>
                      <strong className="text-rainbow-cyan">FuelRx</strong> - A nutrition tracking
                      app that uses AI to make meal logging effortless
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 mt-2 rounded-full bg-rainbow-purple flex-shrink-0" />
                    <span>
                      <strong className="text-rainbow-purple">ML experiments</strong> - Exploring
                      LLMs, computer vision, and practical AI applications
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 mt-2 rounded-full bg-rainbow-teal flex-shrink-0" />
                    <span>
                      <strong className="text-rainbow-teal">This site!</strong> - A playground for
                      trying new web technologies and sharing what I learn
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Beyond the Keyboard</h2>
              <div className="max-w-none text-surface-300 space-y-4">
                <p>
                  When I&apos;m not writing code, you&apos;ll find me at the gym doing CrossFit,
                  hiking trails, or spending time with family. I believe the discipline and
                  problem-solving mindset from fitness translates directly to engineering -
                  both require consistency, adaptability, and pushing through challenges.
                </p>
              </div>
            </section>
          </div>

          {/* Skills Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Skills & <span className="text-gradient-rainbow">Tech</span>
              </h2>
              {Object.entries(skills).map(([category, items]) => (
                <div key={category} className="card p-4">
                  <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((skill) => (
                      <span
                        key={skill}
                        className={`px-3 py-1 text-sm rounded-lg border ${categoryColors[category]}`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
