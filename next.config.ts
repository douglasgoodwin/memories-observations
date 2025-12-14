import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    cpus: 1, // Reduces build-time memory usage
    webpackBuildWorker: true,
  },
};

export default nextConfig;