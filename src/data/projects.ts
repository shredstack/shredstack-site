export type ProjectCategory = "personal" | "professional";

export interface Project {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  techStack: string[];
  category: ProjectCategory;
  featured: boolean;
  status: "Active" | "Professional" | "Archived";
  gradient: string;
  githubUrl?: string;
  liveUrl?: string;
}

export const projects: Project[] = [
  // Personal Projects
  {
    id: "fuelrx",
    name: "FuelRx",
    description:
      "A custom nutrition tracking app built with Next.js, Supabase, and AI-powered meal analysis.",
    longDescription:
      "Built to solve my own frustration with existing nutrition apps, FuelRx uses the Anthropic API to analyze meal photos and descriptions, automatically calculating macros and nutrients. Features include meal history, progress tracking, and goal setting.",
    techStack: ["Next.js", "TypeScript", "Supabase", "Anthropic API", "Tailwind CSS"],
    category: "personal",
    featured: true,
    status: "Active",
    gradient: "from-rainbow-cyan to-rainbow-teal",
  },
  {
    id: "shredstack",
    name: "ShredStack Site",
    description:
      "This very site! A personal developer portfolio and playground built with modern web technologies.",
    longDescription:
      "A place to showcase projects, share technical content, and experiment with new ideas. Built with Next.js 15, TypeScript, and Tailwind CSS, with plans to add a blog, interactive playground, and AI-powered features.",
    techStack: ["Next.js 15", "TypeScript", "Tailwind CSS", "Vercel"],
    category: "personal",
    githubUrl: "https://github.com/sarahdorich/shredstack-site",
    featured: false,
    status: "Active",
    gradient: "from-rainbow-pink to-rainbow-orange",
  },

  // Professional Work
  {
    id: "locumsmart-data-platform",
    name: "Locumsmart Data Platform",
    description:
      "Lead engineer building out a data platform with robust data pipelines, AI/ML capabilities, and automated workflows to facilitate business intelligence.",
    longDescription:
      "Architected and built a comprehensive data platform for Locumsmart, including ETL pipelines processing millions of records, data warehouse design, and automated workflows that power critical business intelligence operations.",
    techStack: ["Python", "SQL", "AWS", "dbt", "Snowflake", "AI/ML"],
    category: "professional",
    featured: true,
    status: "Professional",
    gradient: "from-rainbow-purple to-rainbow-indigo",
  },
  {
    id: "smart-insights",
    name: "Smart Insights",
    description:
      "Predictive insights system on Locumsmart's VMS platform, enabling Healthcare Organizations and locum staffing vendors to make data-driven decisions.",
    longDescription:
      "Developed machine learning models and analytics pipelines that provide predictive insights to healthcare organizations and staffing vendors, helping them optimize their locum tenens workforce decisions.",
    techStack: ["Machine Learning", "Python", "Analytics", "SQL"],
    category: "professional",
    featured: true,
    status: "Professional",
    gradient: "from-rainbow-indigo to-rainbow-cyan",
  },
];

// Helper functions
export const getPersonalProjects = () =>
  projects.filter((p) => p.category === "personal");

export const getProfessionalProjects = () =>
  projects.filter((p) => p.category === "professional");

export const getFeaturedProjects = () =>
  projects.filter((p) => p.featured);

export const getFeaturedPersonalProjects = () =>
  projects.filter((p) => p.category === "personal" && p.featured);

export const getFeaturedProfessionalProjects = () =>
  projects.filter((p) => p.category === "professional" && p.featured);
