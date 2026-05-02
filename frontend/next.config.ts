import type { NextConfig } from "next";

const s3Bucket = process.env.AWS_S3_BUCKET ?? "property-management-s3";
const s3Region = process.env.AWS_REGION ?? "ap-southeast-1";

const nextConfig: NextConfig = {
  // Proxy /api/* calls to the backend during development so the browser
  // never needs to know the backend URL — only the Next.js server does.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${s3Bucket}.s3.${s3Region}.amazonaws.com`,
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
