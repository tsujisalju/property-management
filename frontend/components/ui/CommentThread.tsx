"use client";

import { useState } from "react";
import { maintenanceApi } from "@/lib/api";
import type { CommentResponse } from "@/types";
import { getInitials } from "@/lib/ui";

interface CommentThreadProps {
  comments: CommentResponse[];
  requestId: string;
  currentUserName?: string;
}

export function CommentThread({ comments: initial, requestId, currentUserName }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentResponse[]>(initial);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await maintenanceApi.addComment(requestId, body.trim());
      const optimistic: CommentResponse = {
        id: crypto.randomUUID(),
        authorId: "",
        authorName: currentUserName ?? "You",
        body: body.trim(),
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);
      setBody("");
    } catch {
      setError("Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
            Comments ({comments.length})
          </h3>

          {comments.length === 0 && (
              <p className="text-sm text-base-content/40 italic">No comments yet.</p>
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
                      <span className="font-medium text-sm">{c.authorName}</span>
                      <span className="text-xs text-base-content/40">
                    {new Date(c.createdAt).toLocaleString("en-MY", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                    </div>
                    <p className="text-sm text-base-content/80 mt-0.5 whitespace-pre-wrap">
                      {c.body}
                    </p>
                  </div>
                </div>
            ))}
          </div>

          <form
              onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
              className="pt-2 border-t border-base-200 space-y-2"
          >
          <textarea
              className="textarea textarea-bordered w-full text-sm resize-none"
              placeholder="Add a comment…"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
          />
            {error && <p className="text-error text-xs">{error}</p>}
            <div className="flex justify-end">
              <button
                  type="submit"
                  className="btn btn-sm btn-neutral"
                  disabled={submitting || !body.trim()}
              >
                {submitting ? (
                    <span className="loading loading-spinner loading-xs" />
                ) : (
                    "Post comment"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}