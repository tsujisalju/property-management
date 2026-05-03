"use client";

import { useState } from "react";
import { usersApi } from "@/lib/api";
import type { UserResponse, UserRole } from "@/types";

const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "maintenance_staff", label: "Maintenance Staff" },
  { value: "tenant", label: "Tenant" },
];

interface Props {
  user: UserResponse;
  onUpdated: (updated: UserResponse) => void;
  onClose: () => void;
}

export default function ChangeRoleModal({ user, onUpdated, onClose }: Props) {
  const [role, setRole] = useState<UserRole>(
    ASSIGNABLE_ROLES.find((r) => r.value !== user.role)?.value ??
      ASSIGNABLE_ROLES[0].value
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await usersApi.updateRole(user.id, role);
      onUpdated(updated);
    } catch {
      setError("Failed to update role. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card bg-base-100 w-full max-w-sm shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">Change Role</h2>
          <p className="text-sm text-base-content/60">
            Updating role for{" "}
            <span className="font-medium text-base-content">{user.fullName}</span>
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">New Role *</legend>
              <select
                className="select select-bordered w-full"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                required
                disabled={submitting}
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </fieldset>

            {error && (
              <div className="alert alert-error text-sm py-2">
                <span>{error}</span>
              </div>
            )}

            <div className="card-actions justify-end gap-2 mt-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-neutral btn-sm"
                disabled={submitting || role === user.role}
              >
                {submitting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Save Role"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
