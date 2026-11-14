import type { NextConfig } from "next";

// The app reads its data from /data at runtime. Ship the pool and the frozen demos with every
// serverless function (Vercel), and leave the raw Cala cache (tens of MB) out of the bundle.
const DATA = ["./data/pool.json", "./data/dataset.json", "./data/demo/**/*.json"];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/**": DATA },
  outputFileTracingExcludes: { "/**": ["./data/cache/**", "./gmail-addon/**", "./scripts/**"] },
};

export default nextConfig;
