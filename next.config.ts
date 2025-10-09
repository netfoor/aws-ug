import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Improve navigation stability and reduce Fast Refresh interference
  experimental: {
    optimizePackageImports: ['aws-amplify'],
  },
};

export default nextConfig;
