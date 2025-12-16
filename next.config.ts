import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Improve navigation stability and reduce Fast Refresh interference
  experimental: {
    optimizePackageImports: ['aws-amplify'],
  },
  
  // Configure allowed image domains for AWS S3
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.us-east-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
