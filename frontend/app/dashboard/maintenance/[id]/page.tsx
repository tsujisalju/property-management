"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { maintenanceApi, usersApi } from "@/lib/api";
import type {
  CommentResponse,
  MaintenanceRequestDetailResponse,
  RequestStatus,
  UserResponse,
} from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { ArrowLeft, Building, DoorClosed, Pencil } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/ui";
import Image from "next/image";

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MaintenanceRequestPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const backHrefManager = "/dashboard/maintenance";
  const backLabelManager = "Maintenance Requests";
  const backHrefTenant = "/dashboard/tenant";
  const backLabelTenant = "Tenant Portal";

  const [request, setRequest] =
    useState<MaintenanceRequestDetailResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPriority, setEditPriority] = useState("");

  // Assignee picker
  const [staffList, setStaffList] = useState<UserResponse[]>([]);
  const [staffOpen, setStaffOpen] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  // Comment form
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    maintenanceApi
      .get(id)
      .then((data) => {
        setRequest(data);
        setComments(data.comments ?? []);
        if (data.s3PhotoKey) {
          maintenanceApi
            .getPhotoUrl(id)
            .then(({ url }) => setPhotoUrl(url))
            .catch(() => {});
        }
      })
      .catch(() => setError("Failed to load request."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(newStatus: RequestStatus) {
    if (!request || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await maintenanceApi.update(id, { status: newStatus });
      setRequest((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      // silently keep old status on error
    } finally {
      setUpdatingStatus(false);
    }
  }

  const fetchStaff = useCallback(() => {
    if (staffList.length > 0) return;
    usersApi
      .list({ role: "maintenance_staff" })
      .then(setStaffList)
      .catch(() => {});
  }, [staffList.length]);

  function handleToggleStaffDropdown() {
    if (!staffOpen) fetchStaff();
    setStaffOpen((prev) => !prev);
  }

  async function handleAssign(staffId: string | null) {
    if (!request || updatingAssignee) return;
    setUpdatingAssignee(true);
    setStaffOpen(false);
    try {
      if (staffId === null) {
        await maintenanceApi.update(id, { clearAssignee: true });
        setRequest((prev) =>
          prev ? { ...prev, assignedTo: null, assigneeName: null } : prev,
        );
      } else {
        await maintenanceApi.update(id, { assignedTo: staffId });
        const chosen = staffList.find((s) => s.id === staffId);
        setRequest((prev) =>
          prev
            ? {
                ...prev,
                assignedTo: staffId,
                assigneeName: chosen?.fullName ?? null,
              }
            : prev,
        );
      }
    } catch {
      // silently keep old assignee on error
    } finally {
      setUpdatingAssignee(false);
    }
  }

  async function handleDelete() {
    if (!request) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this request? This cannot be undone.",
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await maintenanceApi.delete(id);
      router.push(backHrefManager);
    } catch {
      setError("Failed to delete request.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEditClick() {
    if (!request) return;
    setEditTitle(request.title);
    setEditDescription(request.description ?? "");
    setEditCategory(request.category);
    setEditPriority(request.priority);
    setIsEditing(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      await maintenanceApi.tenantUpdate(id, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        priority: editPriority,
      });
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle,
              description: editDescription,
              category: editCategory,
              priority: editPriority as typeof prev.priority,
            }
          : prev,
      );
      setIsEditing(false);
    } catch {
      setError("Failed to update request.");
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    const body = commentBody.trim();
    if (!body || submittingComment) return;
    setSubmittingComment(true);
    try {
      await maintenanceApi.addComment(id, body);
      const optimistic: CommentResponse = {
        id: crypto.randomUUID(),
        authorId: "",
        authorName: "You",
        body,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);
      setCommentBody("");
      setTimeout(
        () => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch {
      // keep form contents on error
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (error || !request) {
    return (
      <main className="min-h-screen bg-base-200 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="alert alert-error">
            {error ?? "Request not found."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back link */}
      {user?.role == "manager" ? (
        <Link
          href={backHrefManager}
          className="flex items-center gap-1.5 mb-2 text-sm text-base-content/60 hover:text-base-content w-fit"
        >
          <ArrowLeft className="size-4" />
          {backLabelManager}
        </Link>
      ) : (
        user?.role == "tenant" && (
          <Link
            href={backHrefTenant}
            className="flex items-center gap-1.5 mb-2 text-sm text-base-content/60 hover:text-base-content w-fit"
          >
            <ArrowLeft className="size-4" />
            {backLabelTenant}
          </Link>
        )
      )}

      {/* Title */}
      <div>
        <h1 className="font-semibold text-2xl leading-snug">
          {request.title}
          <span className="ml-2 text-base font-normal text-base-content/40 italic">
            #{request.id.slice(0, 8)}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} />
          <span className="badge badge-sm badge-soft badge-neutral capitalize">
            {request.category}
          </span>
        </div>
        {user?.role === "tenant" && (
          <div className="flex items-center gap-2 mt-3">
            <button className="btn btn-sm btn-ghost" onClick={handleEditClick}>
              Edit
            </button>
            <button
              className="btn btn-sm btn-error btn-outline"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Delete"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 text-sm text-base-content/70 items-center">
        <div className="flex items-center gap-1.5">
          <div className="flex bg-base-300 rounded-full w-7 h-7 justify-center items-center">
            <Building className="size-3.5" />
          </div>
          <span>{request.propertyName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex bg-base-300 rounded-full w-7 h-7 justify-center items-center">
            <DoorClosed className="size-3.5" />
          </div>
          <span>Unit {request.unitNumber}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="avatar avatar-placeholder">
            <div className="bg-neutral text-neutral-content w-7 rounded-full text-xs">
              <span>{getInitials(request.tenantName)}</span>
            </div>
          </div>
          <span>{request.tenantName}</span>
        </div>
        <span>Submitted {formatDate(request.createdAt)}</span>
        {request.resolvedAt && (
          <span>Resolved {formatDate(request.resolvedAt)}</span>
        )}
      </div>

      <div className="divider my-0" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: description + photo + comments */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50 mb-1">
                Description
              </h3>
              <p className="text-base-content/80 whitespace-pre-wrap">
                {request.description ?? (
                  <span className="italic text-base-content/40">
                    No description provided.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Photo */}
          {photoUrl && (
            <div className="card bg-base-100 shadow-sm overflow-hidden">
              <div className="card-body">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
                  Attached Photo
                </h3>
              </div>
              <div className="relative w-full h-80 mb-4">
                <Image
                  src={photoUrl}
                  alt="Maintenance photo"
                  className="object-contain"
                  fill
                />
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
                Comments ({comments.length})
              </h3>
              {comments.length === 0 && (
                <p className="text-sm text-base-content/40 italic">
                  No comments yet.
                </p>
              )}
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="avatar avatar-placeholder shrink-0">
                      <div className="bg-neutral text-neutral-content w-8 h-8 rounded-full text-xs">
                        <span>{getInitials(c.authorName)}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm">
                          {c.authorName}
                        </span>
                        <span className="text-xs text-base-content/40">
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-base-content/80 mt-0.5 whitespace-pre-wrap">
                        {c.body}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
              <form
                onSubmit={handleAddComment}
                className="pt-2 border-t border-base-200 space-y-2"
              >
                <textarea
                  className="textarea textarea-bordered w-full text-sm resize-none"
                  rows={3}
                  placeholder="Add a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  disabled={submittingComment}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn btn-sm btn-neutral"
                    disabled={submittingComment || !commentBody.trim()}
                  >
                    {submittingComment ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "Post comment"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-2">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
                Status
              </h3>
              {user?.role === "tenant" ? (
                <StatusBadge status={request.status} />
              ) : (
                <>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={request.status}
                    disabled={updatingStatus}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as RequestStatus)
                    }
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {updatingStatus && (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-2">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
                Priority
              </h3>
              <PriorityBadge priority={request.priority} />
            </div>
          </div>

          {/* Assignee */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-2">
              {user?.role === "manager" ? (
                <div className="dropdown">
                  <button
                    type="button"
                    className="flex items-center gap-1 cursor-pointer group w-fit"
                    onClick={handleToggleStaffDropdown}
                    disabled={updatingAssignee}
                  >
                    {updatingAssignee ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <>
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50 decoration-dotted underline-offset-2 group-hover:underline">
                          Assigned To
                        </h3>
                        <Pencil className="size-3 text-base-content/30 group-hover:text-base-content/60" />
                      </>
                    )}
                  </button>

                  {staffOpen && (
                    <ul className="dropdown-content menu rounded-box bg-base-100 shadow-md z-10 w-56 p-1 mt-1">
                      {request.assignedTo && (
                        <li>
                          <button
                            type="button"
                            className="text-sm text-error"
                            onClick={() => handleAssign(null)}
                          >
                            Unassign
                          </button>
                        </li>
                      )}
                      {staffList.length === 0 && (
                        <li>
                          <span className="text-sm text-base-content/40 italic px-3 py-2">
                            No staff found
                          </span>
                        </li>
                      )}
                      {staffList.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className="flex items-center gap-2 text-sm"
                            onClick={() => handleAssign(s.id)}
                          >
                            <div className="avatar avatar-placeholder">
                              <div className="bg-neutral text-neutral-content w-6 rounded-full text-xs">
                                <span>{getInitials(s.fullName)}</span>
                              </div>
                            </div>
                            {s.fullName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
                  Assigned To
                </h3>
              )}

              {request.assigneeName ? (
                <div className="flex items-center gap-2">
                  <div className="avatar avatar-placeholder">
                    <div className="bg-neutral text-neutral-content w-8 rounded-full text-xs">
                      <span>{getInitials(request.assigneeName)}</span>
                    </div>
                  </div>
                  <span className="text-sm">{request.assigneeName}</span>
                </div>
              ) : (
                <span className="text-sm text-base-content/40 italic">
                  Unassigned
                </span>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body gap-1">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50 mb-1">
                Dates
              </h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-base-content/50">Created</span>
                  <span>
                    {new Date(request.createdAt).toLocaleDateString("en-MY")}
                  </span>
                </div>
                {request.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-base-content/50">Resolved</span>
                    <span>
                      {new Date(request.resolvedAt).toLocaleDateString("en-MY")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card bg-base-100 w-full max-w-md shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">Edit Request</h2>
              <form
                onSubmit={handleEditSubmit}
                className="flex flex-col gap-3 mt-2"
              >
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Title *</legend>
                  <input
                    type="text"
                    required
                    className="input input-bordered w-full"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    disabled={isSubmittingEdit}
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Description</legend>
                  <textarea
                    className="textarea textarea-bordered w-full resize-none"
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    disabled={isSubmittingEdit}
                  />
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Category</legend>
                    <select
                      className="select select-bordered w-full"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
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
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      disabled={isSubmittingEdit}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </fieldset>
                </div>
                <div className="card-actions justify-end gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmittingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-neutral btn-sm"
                    disabled={isSubmittingEdit || !editTitle.trim()}
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
