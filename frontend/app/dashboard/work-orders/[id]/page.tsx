"use client";

import { CommentThread } from "@/components/ui/CommentThread";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {maintenanceApi, usersApi} from "@/lib/api";
import type {
    MaintenanceRequestDetailResponse,
} from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { ArrowLeft, Building, DoorClosed } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/ui";

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function WorkOrderDetailPage() {
    const { id } = useParams<{ id: string }>();

    const [request, setRequest] =
        useState<MaintenanceRequestDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ id: string; fullName: string } | null>(null);
    
    useEffect(() => {
        if (!id) return;
        usersApi.me().then(setCurrentUser).catch(() => {});
        maintenanceApi
            .get(id)
            .then((data) => {
                setRequest(data);
            })
            .catch(() => setError("Failed to load work order."))
            .finally(() => setLoading(false));
    }, [id]);

    async function handleStart() {
        if (!request || actionLoading) return;
        setActionLoading(true);
        try {
            await maintenanceApi.update(id, { status: "in_progress" });
            setRequest((prev) => prev ? { ...prev, status: "in_progress" } : prev);
        } finally {
            setActionLoading(false);
        }
    }

    async function handleResolve() {
        if (!request || actionLoading) return;
        setActionLoading(true);
        try {
            await maintenanceApi.update(id, { status: "resolved" });
            setRequest((prev) =>
                prev ? { ...prev, status: "resolved", resolvedAt: new Date().toISOString() } : prev
            );
        } finally {
            setActionLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <span className="loading loading-spinner loading-lg" />
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="alert alert-error">{error ?? "Work order not found."}</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Back link */}
            <Link
                href="/dashboard/work-orders"
                className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content w-fit"
            >
                <ArrowLeft className="size-4" />
                Work Orders
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
                {/* Left: description + comments */}
                <div className="md:col-span-2 space-y-6">
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
                    <CommentThread
                        comments={request.comments ?? []}
                        requestId={id}
                        currentUserName={currentUser?.fullName}
                    />
                </div>    

                {/* Right: actions sidebar */}
                <div className="space-y-4">
                    {/* Action buttons */}
                    <div className="card bg-base-100 shadow-sm">
                        <div className="card-body gap-3">
                            <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50">
                                Actions
                            </h3>
                            {request.status === "open" && (
                                <button
                                    className="btn btn-primary btn-sm w-full"
                                    onClick={handleStart}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <span className="loading loading-spinner loading-xs" />
                                    ) : (
                                        "Start Work"
                                    )}
                                </button>
                            )}
                            {request.status === "in_progress" && (
                                <button
                                    className="btn btn-success btn-sm w-full"
                                    onClick={handleResolve}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <span className="loading loading-spinner loading-xs" />
                                    ) : (
                                        "Mark Resolved"
                                    )}
                                </button>
                            )}
                            {request.status === "resolved" && (
                                <span className="text-sm text-success font-medium">
                  ✓ Resolved
                </span>
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

                    {/* Dates */}
                    <div className="card bg-base-100 shadow-sm">
                        <div className="card-body gap-1">
                            <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/50 mb-1">
                                Dates
                            </h3>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-base-content/50">Created</span>
                                    <span>{new Date(request.createdAt).toLocaleDateString("en-MY")}</span>
                                </div>
                                {request.resolvedAt && (
                                    <div className="flex justify-between">
                                        <span className="text-base-content/50">Resolved</span>
                                        <span>{new Date(request.resolvedAt).toLocaleDateString("en-MY")}</span>
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