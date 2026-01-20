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
      "AI-powered meal planning for CrossFit athletes. Your week of food, figured out.",
    longDescription:
      "A nutrition planning app designed for CrossFit athletes that combines AI-generated meal planning with community-refined recommendations. Features personalized weekly meal plans based on macro targets, automated grocery lists, optional one-tap macro tracking, and prep time optimization. Built with a planning-first approach that makes healthy eating the easiest choice.",
    techStack: ["Next.js", "TypeScript", "Supabase", "Anthropic API", "Tailwind CSS", "Capacitor"],
    category: "personal",
    featured: true,
    status: "Active",
    gradient: "from-rainbow-cyan to-rainbow-teal",
    githubUrl: "https://github.com/shredstack/fuel-rx",
    liveUrl: "https://fuel-rx.shredstack.net",
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
    githubUrl: "https://github.com/shredstack/shredstack-site",
    featured: false,
    status: "Active",
    gradient: "from-rainbow-pink to-rainbow-orange",
  },
  {
    id: "storybloom",
    name: "StoryBloom",
    description:
      "AI-powered reading platform that helps reluctant young readers become confident learners through personalized stories and gamified word practice.",
    longDescription:
      "Built for my daughter who was behind in reading, StoryBloom transforms learning into an adventure. Features personalized AI-generated stories where the child is the protagonist, a speech-based Word Quest game with pronunciation feedback, and virtual pet companions that children nurture by practicing reading. Supports multiple child profiles with individualized settings for age, reading level, and interests.",
    techStack: ["Next.js 15", "TypeScript", "Tailwind CSS", "Supabase", "Anthropic API", "DALL-E 3", "Web Speech API"],
    category: "personal",
    featured: true,
    status: "Active",
    gradient: "from-rainbow-teal to-rainbow-purple",
    githubUrl: "https://github.com/shredstack/story-bloom",
    liveUrl: "https://story-bloom.shredstack.net",
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
  {
    id: "vitalcast",
    name: "VitalCast",
    description:
      "AI-powered call volume forecasting system that revolutionized operational efficiency for the largest VRS company in North America.",
    longDescription:
      "Automated predictive modeling system for nationwide Video Relay Service (VRS) call centers that outperformed human-generated predictions. Achieved ±2.5% relative error 90%+ of the time and freed 4+ hours weekly for the VP of Operations. Built with NARX neural networks, ensemble architectures, and custom Erlang C/A queuing models for agent staffing optimization. Featured automated nightly re-forecasting across a 13-week horizon, intraday granular predictions, and interactive GUI tools for operations staff. One of my first major professional projects—still in production use 3+ years after I left because a team of data scientists couldn't beat its accuracy.",
    techStack: ["MATLAB", "Neural Networks", "SQL Server", "Java", "Time Series", "Queuing Theory"],
    category: "professional",
    featured: false,
    status: "Professional",
    gradient: "from-rainbow-orange to-rainbow-pink",
  },
  {
    id: "homie-listing-recommender",
    name: "Real Estate Listing Recommender",
    description:
      "Intelligent recommendation engine matching home buyers with relevant property listings through personalized, multi-modal suggestions.",
    longDescription:
      "Built a hybrid recommendation system for a real estate platform combining collaborative filtering (LightFM), content-based features, and deep learning image similarity. Processed property data at scale with Apache Spark, extracting features from listings including TF-IDF on descriptions, normalized numerical attributes, and VGG16 visual embeddings from property photos. Implemented geographic filtering with 25km radius constraints and orchestrated the ML pipeline with Metaflow on Databricks.",
    techStack: ["Python", "Apache Spark", "LightFM", "TensorFlow", "Databricks", "Metaflow", "NLTK"],
    category: "professional",
    featured: false,
    status: "Professional",
    gradient: "from-rainbow-cyan to-rainbow-indigo",
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
