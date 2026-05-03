import Account from "@/components/ui/account";
import { Building, Toolbox } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-4">
        <Link href={"/dashboard"}>
          <h1 className="font-bold text-lg">Property Management Platform</h1>
        </Link>
        <Account />
      </div>
      <div className="max-w-4xl mx-auto flex gap-8">
        <ul className="menu bg-base-100 rounded-box w-56">
          <li>
            <Link href="/properties">
              <Building className="size-5" />
              Properties
            </Link>
          </li>
          <li>
            <Link href="/maintenance">
              <Toolbox className="size-5" />
              Maintenance
            </Link>
          </li>
        </ul>
        {children}
      </div>
    </main>
  );
}
