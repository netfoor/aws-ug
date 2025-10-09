import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Improve navigation stability and reduce Fast Refresh interference
  experimental: {
    optimizePackageImports: ['aws-amplify'],
  },
  
  // Reduce aggressive reloading in development
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config: any) => {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
      return config;
    }
  })
};

export default nextConfig;
