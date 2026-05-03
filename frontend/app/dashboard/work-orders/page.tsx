"use client";

import { useEffect, useState } from "react";
import { maintenanceApi, usersApi } from "@/lib/api";
import type { MaintenanceRequestResponse, RequestStatus } from "@/types";
import { WorkOrderCard } from "@/components/ui/WorkOrderCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type FilterTab = "all" | RequestStatus;

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

export default function WorkOrdersPage() {
  const [requests, setRequests] = useState<MaintenanceRequestResponse[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const user = await usersApi.me();
        const data = await maintenanceApi.list({ assignedTo: user.id });
        setRequests(data);
      } catch {
        setError("Failed to load work orders.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function handleStatusChange(id: string, newStatus: string) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: newStatus as typeof r.status } : r,
      ),
    );
  }

  const filtered =
    activeTab === "all"
      ? requests
      : requests.filter((r) => r.status === activeTab);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">Work Orders</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Your assigned maintenance jobs
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
          No {activeTab === "all" ? "" : activeTab.replace("_", " ")} jobs
          found.
        </div>
      )}

      {!isLoading && !error && (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => (
            <WorkOrderCard
              key={r.id}
              request={r}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
