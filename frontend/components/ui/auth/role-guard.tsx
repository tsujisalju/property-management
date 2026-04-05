"use client";

import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

function AuthGuardSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !allowedRoles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, allowedRoles, router]);

  // Show skeleton while auth state is being resolved, or while redirecting
  if (isLoading || !user || !allowedRoles.includes(user.role)) {
    return <AuthGuardSkeleton />;
  }

  return <>{children}</>;
}
