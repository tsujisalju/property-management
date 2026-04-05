import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* calls to the backend during development so the browser
  // never needs to know the backend URL — only the Next.js server does.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "property-management-s3.s3.ap-southeast-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
