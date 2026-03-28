import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* calls to the backend during development so the browser
  // never needs to know the backend URL — only the Next.js server does.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:8080"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
