import RoleGuard from "@/components/ui/auth/role-guard";
import { ReactNode } from "react";

export default function MaintenanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleGuard allowedRoles={["manager", "tenant"]}>{children}</RoleGuard>;
}
