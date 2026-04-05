import RoleGuard from "@/components/ui/auth/role-guard";
import { ReactNode } from "react";

export default function PropertiesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleGuard allowedRoles={["manager"]}>{children}</RoleGuard>;
}
