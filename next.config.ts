import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Inline Vercel's own VERCEL_ENV at build time (it is never set by hand). The root layout
    // uses it to include analytics only in production builds; in every other build the import
    // sits in a dead branch and is dropped from the bundle entirely.
    VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },
};

export default nextConfig;
