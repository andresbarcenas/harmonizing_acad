import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9010",
        pathname: "/harmonizing-media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9010",
        pathname: "/harmonizing-media/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
