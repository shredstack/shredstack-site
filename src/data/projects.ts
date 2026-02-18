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
    id: "arrow-polynomial-theorem",
    name: "Arrow Polynomial Theorem",
    description:
      "Original mathematical theorem extending Murasugi's relationship to the Arrow polynomial for periodic virtual links. Presented at the 2013 AMS Sectional Conference.",
    longDescription:
      "Research in virtual knot theory (VKT), a topological subject studying embeddings of curves in thickened orientable surfaces of arbitrary genus. Proved a relationship between periodic virtual links and their factor links, extending Murasugi's classical result to the Arrow polynomial. This work was presented at the invitation-only 2013 AMS Sectional Conference in St. Louis.",
    techStack: ["Topology", "Virtual Knot Theory", "Mathematical Proof", "Research"],
    category: "personal",
    featured: true,
    status: "Archived",
    gradient: "from-rainbow-purple to-rainbow-pink",
    liveUrl: "/documents/Arrow Polynomial of PVK.pdf",
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
    id: "dragon-hub",
    name: "DragonHub",
    description:
      "The operating system for your PTA. AI-powered platform that modernizes Parent-Teacher Association operations with smart event planning, knowledge management, and community engagement.",
    longDescription:
      "A comprehensive platform designed to modernize PTA operations by replacing scattered spreadsheets, outdated email systems, and undocumented processes. Features AI-powered event planning with budget guidance, collaborative meeting minutes with automatic action item extraction, unified community calendars, volunteer hour tracking, classroom coordination hubs, and role-specific onboarding. Supports multi-school environments with isolated data and deep Google Workspace integration.",
    techStack: ["Next.js 15", "TypeScript", "Tailwind CSS", "Supabase", "Anthropic API", "Google Workspace API"],
    category: "personal",
    featured: true,
    status: "Active",
    gradient: "from-rainbow-orange to-rainbow-teal",
    githubUrl: "https://github.com/shredstack/dragon-hub",
    liveUrl: "https://dragon-hub.shredstack.net",
  },
  {
    id: "llm-lab",
    name: "LLM Lab",
    description:
      "A framework for constructing, refining, and deploying specialized language models tailored to specific industries or domains.",
    longDescription:
      "A structured lab environment for developing domain-specific LLMs through a standardized five-stage workflow: exploration of base model capabilities, extraction of training data, creation of domain-specific benchmarks, fine-tuning with LoRA, and deployment via HuggingFace Endpoints. Each project operates independently with dedicated dependencies, supporting containerized development with Docker and interactive Jupyter notebook exploration.",
    techStack: ["Python", "HuggingFace", "LoRA", "Docker", "Jupyter"],
    category: "personal",
    featured: true,
    status: "Active",
    gradient: "from-rainbow-indigo to-rainbow-purple",
    githubUrl: "https://github.com/shredstack/llm-lab",
  },
  {
    id: "lightdrop",
    name: "LightDrop",
    description:
      "Music-synchronized DMX lighting control system for macOS. Automatically generates beat-synced light shows from audio files.",
    longDescription:
      "Bridges audio analysis with QLC+ professional lighting software to control physical DMX512 fixtures via USB-to-DMX adapter. Features automated beat detection, tempo analysis, and song structure segmentation to programmatically generate synchronized light shows. Supports multiple show styles from calm to dramatic, works with any DMX-compatible fixtures including RGB PAR cans and moving heads, and handles the complete pipeline from raw audio to playable show files.",
    techStack: ["Python", "QLC+", "DMX512", "Audio Analysis"],
    category: "personal",
    featured: true,
    status: "Active",
    gradient: "from-rainbow-cyan to-rainbow-orange",
    githubUrl: "https://github.com/shredstack/lightdrop",
  },
  {
    id: "trip-craft",
    name: "TripCraft",
    description:
      "AI-powered personal travel planner that finds the best destinations, excursions, and trip logistics using Claude AI recommendations grounded in real Google Places data.",
    longDescription:
      "Streamlines vacation planning through a guided wizard interface where Claude AI analyzes traveler preferences alongside real Google Places data to generate ranked destination recommendations with match scores. Features trip management dashboards, detailed trip pages with tabs for destinations, activities, logistics, and personal notes, plus curated excursion suggestions for each destination.",
    techStack: ["Next.js 15", "TypeScript", "Tailwind CSS", "PostgreSQL", "Anthropic API", "Google Places API"],
    category: "personal",
    featured: true,
    status: "Active",
    gradient: "from-rainbow-teal to-rainbow-indigo",
    githubUrl: "https://github.com/shredstack/trip-craft",
    liveUrl: "https://trip-craft.shredstack.net",
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
