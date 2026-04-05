"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { maintenanceApi } from "@/lib/api";
import type {
  CommentResponse,
  MaintenanceRequestDetailResponse,
  RequestStatus,
} from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { ArrowLeft, Building, DoorClosed } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/ui";

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

  const [request, setRequest] =
    useState<MaintenanceRequestDetailResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            {error ?? "Request not found."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/maintenance"
        className="flex items-center gap-1.5 mb-2 text-sm text-base-content/60 hover:text-base-content w-fit"
      >
        <ArrowLeft className="size-4" />
        Maintenance Requests
      </Link>

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
              <div className="card-body pb-0">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
                  Attached Photo
                </h3>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Maintenance photo"
                className="w-full object-cover max-h-80"
              />
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

              {/* Add comment form */}
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
              <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
                Assigned To
              </h3>
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
    </div>
  );
}
