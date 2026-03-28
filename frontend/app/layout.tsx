import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property Management Platform",
  description: "Manage properties, tenants, maintenance and finances.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
