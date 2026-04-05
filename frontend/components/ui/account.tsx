"use client";

import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Account() {
  const { user: me, isLoading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <>
      <button
        className="btn btn-ghost"
        popoverTarget="popover-account"
        style={{ anchorName: "--anchor-account" }}
      >
        {isLoading && (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-md" />
          </div>
        )}
        {!isLoading && me && (
          <div className="flex items-center gap-1.5">
            <div className="avatar avatar-placeholder">
              <div className="bg-neutral text-neutral-content w-7 rounded-full text-xs">
                <span>{getInitials(me.fullName)}</span>
              </div>
            </div>
            <span>{me.fullName}</span>
            <span className="badge badge-sm capitalize">{me.role}</span>
          </div>
        )}
      </button>
      <ul
        className="dropdown dropdown-end menu rounded-box bg-base-100 shadow-sm mt-1"
        popover="auto"
        id="popover-account"
        style={{ positionAnchor: "--anchor-account" }}
      >
        <li>
          <Link href={"/dashboard/profile"}>Profile</Link>
        </li>
        <li>
          <button onClick={handleLogout}>Sign out</button>
        </li>
      </ul>
    </>
  );
}
