"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building,
  Toolbox,
  DollarSign,
  Users,
  ClipboardList,
  Home,
} from "lucide-react";
import type { UserRole } from "@/types";

const NAV: Record<
  UserRole,
  { href: string; label: string; icon: React.ReactNode }[]
> = {
  manager: [
    {
      href: "/dashboard/properties",
      label: "Properties",
      icon: <Building className="size-4" />,
    },
    {
      href: "/dashboard/maintenance",
      label: "Maintenance",
      icon: <Toolbox className="size-4" />,
    },
    {
      href: "/dashboard/finance",
      label: "Finance",
      icon: <DollarSign className="size-4" />,
    },
  ],
  tenant: [
    {
      href: "/dashboard/tenant",
      label: "My Portal",
      icon: <Home className="size-4" />,
    },
    {
      href: "/dashboard/maintenance",
      label: "Maintenance",
      icon: <Toolbox className="size-4" />,
    },
  ],
  maintenance_staff: [
    {
      href: "/dashboard/work-orders",
      label: "Work Orders",
      icon: <ClipboardList className="size-4" />,
    },
  ],
  admin: [
    {
      href: "/dashboard/users",
      label: "Users",
      icon: <Users className="size-4" />,
    },
    {
      href: "/dashboard/finance",
      label: "Finance",
      icon: <DollarSign className="size-4" />,
    },
  ],
};

export default function DashboardSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV[role] ?? [];

  return (
    <ul className="menu bg-base-100 rounded-box w-48 shrink-0 self-start">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={pathname.startsWith(item.href) ? "active" : ""}
          >
            {item.icon}
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
