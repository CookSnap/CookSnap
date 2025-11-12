import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      rules: {},
    },
  },
};

export default nextConfig;
