"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { invoicesApi, leasesApi, maintenanceApi } from "@/lib/api";
import type {
  InvoiceResponse,
  LeaseResponse,
  MaintenanceRequestResponse,
} from "@/types";
import LeaseCard from "@/components/tenant/lease-card";
import RequestList from "@/components/tenant/request-list";
import NewRequestForm from "@/components/tenant/new-request-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-warning",
  paid: "badge-success",
  overdue: "badge-error",
  cancelled: "badge-ghost",
};

function InvoiceRow({ invoice }: { invoice: InvoiceResponse }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const { url } = await invoicesApi.getPdfUrl(invoice.id);
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <tr>
      <td>
        <span className="badge badge-sm capitalize">{invoice.type}</span>
      </td>
      <td>
        MYR{" "}
        {invoice.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
      </td>
      <td>{invoice.dueDate}</td>
      <td>
        <span
          className={`badge badge-sm capitalize ${STATUS_BADGE[invoice.status] ?? "badge-ghost"}`}
        >
          {invoice.status}
        </span>
      </td>
      <td>
        {invoice.s3PdfKey ? (
          <button
            className="btn btn-xs btn-ghost"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Download"
            )}
          </button>
        ) : (
          <span className="text-base-content/30">—</span>
        )}
      </td>
    </tr>
  );
}

export default function TenantPortalPage() {
  const { user } = useAuth();

  const [leases, setLeases] = useState<LeaseResponse[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequestResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);

  const [isLoadingLeases, setIsLoadingLeases] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    leasesApi
      .list()
      .then((ls) => {
        setLeases(ls);
        const active = ls.find((l) => l.status === "active");
        if (active) {
          setIsLoadingInvoices(true);
          invoicesApi
            .list({ leaseId: active.id })
            .then(setInvoices)
            .catch(() => {})
            .finally(() => setIsLoadingInvoices(false));
        }
      })
      .catch(() => setError("Failed to load lease information."))
      .finally(() => setIsLoadingLeases(false));

    maintenanceApi
      .list()
      .then(setRequests)
      .catch(() => setError("Failed to load maintenance requests."))
      .finally(() => setIsLoadingRequests(false));
  }, []);

  // Called by child components after a new request is submitted
  const loadRequests = useCallback(() => {
    setIsLoadingRequests(true);
    maintenanceApi
      .list()
      .then(setRequests)
      .catch(() => setError("Failed to load maintenance requests."))
      .finally(() => setIsLoadingRequests(false));
  }, []);

  // Find the one active lease
  const activeLease = leases.find((l) => l.status === "active");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-semibold text-2xl">Tenant Portal</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Welcome back{user ? `, ${user.fullName}` : ""}. Manage your lease and
          maintenance requests here.
        </p>
      </div>

      {/* Global error alert */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Lease */}
      <section className="space-y-3">
        <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
          Your Lease
        </h2>

        {isLoadingLeases ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : activeLease ? (
          <LeaseCard lease={activeLease} />
        ) : (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body text-center text-base-content/40 italic">
              No active lease found.
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Invoices */}
      {activeLease && (
        <section className="space-y-3">
          <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
            Your Invoices
          </h2>
          {isLoadingInvoices ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body text-center text-base-content/40 italic">
                No invoices yet.
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 border border-base-300 overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <InvoiceRow key={inv.id} invoice={inv} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Section 3: Maintenance Requests */}
      <section className="space-y-3">
        <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
          My Maintenance Requests
        </h2>
        <RequestList
          requests={requests}
          isLoading={isLoadingRequests}
          onRefresh={loadRequests}
        />
      </section>

      {/* Section 3: New Request Form */}
      {/* Only show if tenant has an active lease */}
      {activeLease && (
        <section className="space-y-3">
          <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
            Submit a Request
          </h2>
          <NewRequestForm
            unitId={activeLease.unitId}
            onSubmitted={loadRequests}
          />
        </section>
      )}
    </div>
  );
}
