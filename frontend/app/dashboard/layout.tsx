"use client";

import { useAuth } from "@/context/AuthContext";
import Account from "@/components/ui/account";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-6">
        <Link href="/dashboard">
          <h1 className="font-bold text-lg">Property Management Platform</h1>
        </Link>
        <Account />
      </div>

      {/* Sidebar + content */}
      <div className="max-w-5xl mx-auto flex gap-8 items-start">
        {user && <DashboardSidebar role={user.role} />}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </main>
  );
}
