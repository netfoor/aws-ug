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

  // Redirects for unified speaker workflow
  async redirects() {
    return [
      {
        source: '/speaker/apply-with-talk',
        destination: '/speaker/apply',
        permanent: true,
      },
      // Handle profile hash redirect (will be handled by client-side logic)
      {
        source: '/profile',
        has: [
          {
            type: 'query',
            key: 'section',
            value: 'speaker',
          },
        ],
        destination: '/speaker/apply',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
