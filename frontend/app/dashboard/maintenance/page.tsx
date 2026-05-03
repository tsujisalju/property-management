"use client";

import { useEffect, useState } from "react";
import { maintenanceApi } from "@/lib/api";
import type { MaintenanceRequestResponse, RequestStatus } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Building, DoorClosed } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/ui";

type FilterTab = "all" | RequestStatus;

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

function RequestCard({ request }: { request: MaintenanceRequestResponse }) {
  return (
    <Link href={`/dashboard/maintenance/${request.id}`}>
      <div
        className={`card card-sm bg-base-100 hover:bg-base-200 border ${request.priority == "emergency" && request.status != "resolved" ? "border-error" : "border-base-300"} cursor-pointer`}
      >
        <div className="card-body gap-2">
          <div className="flex items-center gap-2">
            <h2 className="card-title text-base">{request.title}</h2>
            <StatusBadge status={request.status} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-base-content/70">
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

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="avatar avatar-placeholder">
                  <div className="bg-neutral text-neutral-content w-7 rounded-full text-xs">
                    <span>{getInitials(request.tenantName)}</span>
                  </div>
                </div>
                <span>{request.tenantName}</span>
              </div>
              <PriorityBadge priority={request.priority} />
              <span className="badge badge-sm badge-soft badge-neutral capitalize">
                {request.category}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span>
                {new Date(request.createdAt).toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequestResponse[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    maintenanceApi
      .list()
      .then(setRequests)
      .catch(() => setError("Failed to load maintenance requests."))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered =
    activeTab === "all"
      ? requests
      : requests.filter((r) => r.status === activeTab);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Maintenance Requests</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Track and manage all maintenance requests
        </p>
      </div>

      <div className="join">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`btn btn-sm join-item ${activeTab === tab.value ? "btn-neutral" : "btn-ghost"}`}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="badge badge-sm ml-1">
                {requests.filter((r) => r.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-base-content/50">
          No {activeTab === "all" ? "" : activeTab.replace("_", " ")} requests
          found.
        </div>
      )}

      {!isLoading && !error && (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
