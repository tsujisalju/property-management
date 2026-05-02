"use client";

import { useState } from "react";
import type { MaintenanceRequestResponse } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { maintenanceApi } from "@/lib/api";
import Link from "next/link";

interface RequestListProps {
  requests: MaintenanceRequestResponse[];
  isLoading: boolean;
  onRefresh: () => void;
}

interface EditState {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}

export default function RequestList({ requests, isLoading, onRefresh }: RequestListProps) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Are you sure you want to delete this request? This cannot be undone.");
    if (!confirmed) return;
    setDeletingId(id);
    setError(null);
    try {
      await maintenanceApi.delete(id);
      onRefresh();
    } catch {
      setError("Failed to delete request. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleEditClick(r: MaintenanceRequestResponse) {
    setEditState({
      id: r.id,
      title: r.title,
      description: r.description ?? "",
      category: r.category,
      priority: r.priority,
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editState) return;
    setIsSubmittingEdit(true);
    setError(null);
    try {
      await maintenanceApi.tenantUpdate(editState.id, {
        title: editState.title,
        description: editState.description,
        category: editState.category,
        priority: editState.priority,
      });
      setEditState(null);
      onRefresh();
    } catch {
      setError("Failed to update request. Please try again.");
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body text-center text-base-content/40 italic">
          No maintenance requests yet.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="alert alert-error text-sm py-2">
          <span>{error}</span>
        </div>
      )}

      {requests.map((r) => (
        <div key={r.id} className={`card card-sm bg-base-100 border transition-colors ${r.priority === "emergency" && r.status !== "resolved" ? "border-error" : "border-base-300"}`}>
          <div className="card-body gap-2">

            {/* Title row + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{r.title}</span>
              <StatusBadge status={r.status} />
              <PriorityBadge priority={r.priority} />
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/60">
              <span className="badge badge-sm badge-soft badge-neutral capitalize">
                {r.category}
              </span>
              <span>Unit {r.unitNumber}</span>
              <span className="ml-auto">
                {new Date(r.createdAt).toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Description preview */}
            {r.description && (
              <p className="text-sm text-base-content/50 line-clamp-1">
                {r.description}
              </p>
            )}

            {/* View + Edit + Delete buttons */}
            <div className="flex items-center gap-2 justify-end mt-1">
              <Link
                href={`/dashboard/maintenance/${r.id}?from=tenant`}
                className="btn btn-xs btn-ghost"
              >
                View
              </Link>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleEditClick(r)}
              >
                Edit
              </button>
              <button
                className="btn btn-xs btn-error btn-outline"
                onClick={() => handleDelete(r.id)}
                disabled={deletingId === r.id}
              >
                {deletingId === r.id ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card bg-base-100 w-full max-w-md shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">Edit Request</h2>
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 mt-2">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Title *</legend>
                  <input
                    type="text"
                    required
                    className="input input-bordered w-full"
                    value={editState.title}
                    onChange={(e) => setEditState({ ...editState, title: e.target.value })}
                    disabled={isSubmittingEdit}
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Description</legend>
                  <textarea
                    className="textarea textarea-bordered w-full resize-none"
                    rows={3}
                    value={editState.description}
                    onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                    disabled={isSubmittingEdit}
                  />
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Category</legend>
                    <select
                      className="select select-bordered w-full"
                      value={editState.category}
                      onChange={(e) => setEditState({ ...editState, category: e.target.value })}
                      disabled={isSubmittingEdit}
                    >
                      <option value="general">General</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="hvac">HVAC</option>
                    </select>
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Priority</legend>
                    <select
                      className="select select-bordered w-full"
                      value={editState.priority}
                      onChange={(e) => setEditState({ ...editState, priority: e.target.value })}
                      disabled={isSubmittingEdit}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </fieldset>
                </div>
                {error && (
                  <div className="alert alert-error text-sm py-2">
                    <span>{error}</span>
                  </div>
                )}
                <div className="card-actions justify-end gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditState(null)}
                    disabled={isSubmittingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-neutral btn-sm"
                    disabled={isSubmittingEdit || !editState.title.trim()}
                  >
                    {isSubmittingEdit ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}