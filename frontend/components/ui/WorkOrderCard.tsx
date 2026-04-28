"use client";

import Link from "next/link";
import { useState } from "react";
import { maintenanceApi } from "@/lib/api";
import type { MaintenanceRequestResponse } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Building, DoorClosed, Clock } from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

interface WorkOrderCardProps {
  request: MaintenanceRequestResponse;
  onStatusChange?: (id: string, newStatus: string) => void;
}

export function WorkOrderCard({ request, onStatusChange }: WorkOrderCardProps) {
  const [status, setStatus] = useState(request.status);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setStatus("in_progress");
    setLoading(true);
    try {
      await maintenanceApi.update(request.id, { status: "in_progress" });
      onStatusChange?.(request.id, "in_progress");
    } catch {
      setStatus(request.status);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    setStatus("resolved");
    setLoading(true);
    try {
      await maintenanceApi.update(request.id, { status: "resolved" });
      onStatusChange?.(request.id, "resolved");
    } catch {
      setStatus(request.status);
    } finally {
      setLoading(false);
    }
  }

  return (
      <Link href={`/dashboard/work-orders/${request.id}`}>
    <div
      className={`card card-sm bg-base-100 border ${
        request.priority === "emergency" && status !== "resolved"
          ? "border-error"
          : "border-base-300"
      }`}
    >
      <div className="card-body gap-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="card-title text-base">{request.title}</h2>
          <StatusBadge status={status as typeof request.status} />
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-base-content/70">
          <div className="flex items-center gap-1.5">
            <div className="flex bg-base-200 rounded-full w-7 h-7 justify-center items-center">
              <Building className="size-3.5" />
            </div>
            <span>{request.propertyName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex bg-base-200 rounded-full w-7 h-7 justify-center items-center">
              <DoorClosed className="size-3.5" />
            </div>
            <span>{request.unitNumber}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>{timeAgo(request.createdAt)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority={request.priority} />
          <span className="badge badge-sm badge-soft badge-neutral capitalize">
            {request.category}
          </span>
        </div>

        <div className="card-actions justify-end pt-1">
          {status === "open" && (
            <button
              className="btn btn-sm btn-primary"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleStart(); }}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : "Start Work"}
            </button>
          )}
          {status === "in_progress" && (
            <button
              className="btn btn-sm btn-success"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResolve(); }}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : "Mark Resolved"}
            </button>
          )}
        </div>
      </div>
    </div>
      </Link>    
  );
}
