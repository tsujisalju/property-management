import RoleGuard from "@/components/ui/auth/role-guard";
import { ReactNode } from "react";

export default function UsersLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRoles={["admin"]}>{children}</RoleGuard>;
}
