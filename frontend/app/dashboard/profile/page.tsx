"use client";

import { useEffect, useState } from "react";
import { usersApi } from "@/lib/api";
import type { UserResponse } from "@/types";
import { getInitials } from "@/lib/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .me()
      .then((u) => {
        setUser(u);
        setFullName(u.fullName);
        setPhone(u.phone ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await usersApi.updateMe({
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setUser(updated);
      setSuccess(true);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content w-fit"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </Link>

      <div>
        <h1 className="font-semibold text-2xl">Profile</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Manage your account details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account info — read-only */}
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body gap-4">
            <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
              Account
            </h2>
            <div className="flex items-center gap-4">
              <div className="avatar avatar-placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-14 text-lg">
                  <span>{getInitials(user.fullName)}</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-lg leading-tight">
                  {user.fullName}
                </p>
                <span className="badge badge-sm capitalize mt-1">
                  {user.role}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/50">Email</span>
                <span>{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/50">Member since</span>
                <span>
                  {new Date(user.createdAt).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit details */}
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body gap-4">
            <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
              Edit Details
            </h2>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Full Name</legend>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={saving}
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Phone</legend>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  placeholder="+60 12-345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </fieldset>

              {error && (
                <div className="alert alert-error text-sm py-2">
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="alert alert-success text-sm py-2">
                  <span>Changes saved.</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-neutral btn-sm"
                disabled={saving}
              >
                {saving ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Save changes"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
