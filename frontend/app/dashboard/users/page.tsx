"use client";

import { useEffect, useState } from "react";
import { usersApi } from "@/lib/api";
import { getInitials } from "@/lib/ui";
import type { UserResponse, UserRole } from "@/types";
import ChangeRoleModal from "@/components/ui/ChangeRoleModal";

const ROLE_BADGE: Record<UserRole, string> = {
  admin: "badge badge-sm badge-error",
  manager: "badge badge-sm badge-primary",
  maintenance_staff: "badge badge-sm badge-warning",
  tenant: "badge badge-sm badge-ghost",
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  maintenance_staff: "Maintenance Staff",
  tenant: "Tenant",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={ROLE_BADGE[role] ?? "badge badge-sm badge-ghost"}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                    <div className="skeleton h-4 w-32" />
                  </div>
                </td>
                <td>
                  <div className="skeleton h-4 w-44" />
                </td>
                <td>
                  <div className="skeleton h-5 w-20 rounded-full" />
                </td>
                <td>
                  <div className="skeleton h-4 w-24" />
                </td>
                <td>
                  <div className="skeleton h-7 w-24 rounded-lg" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [modalUser, setModalUser] = useState<UserResponse | null>(null);

  useEffect(() => {
    usersApi
      .list()
      .then(setUsers)
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  function handleUpdated(updated: UserResponse) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setModalUser(null);
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      search.trim() === "" ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Users</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Manage user information and assign roles for managerial users.
        </p>
      </div>

      {!loading && !error && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            className="input input-bordered w-full sm:max-w-xs"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="select select-bordered"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="maintenance_staff">Maintenance Staff</option>
            <option value="tenant">Tenant</option>
          </select>
        </div>
      )}

      {loading && <TableSkeleton />}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-base-content/40">
          No users match your filter.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-9 text-xs">
                            <span>{getInitials(u.fullName)}</span>
                          </div>
                        </div>
                        <span className="font-medium">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="text-base-content/70">{u.email}</td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="text-sm text-base-content/60">
                      {new Date(u.createdAt).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      {u.role !== "admin" && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setModalUser(u)}
                        >
                          Change Role
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalUser && (
        <ChangeRoleModal
          user={modalUser}
          onUpdated={handleUpdated}
          onClose={() => setModalUser(null)}
        />
      )}
    </div>
  );
}
