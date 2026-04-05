import Account from "@/components/ui/account";
import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-4">
        <Link href={"/dashboard"}>
          <h1 className="font-bold text-lg">Property Management Platform</h1>
        </Link>
        <Account />
      </div>
      {children}
    </main>
  );
}
