import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://techero.ge/api/:path*',
      },
    ];
  },
};

export default nextConfig;