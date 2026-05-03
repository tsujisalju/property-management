"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  invoicesApi,
  leasesApi,
  maintenanceApi,
  uploadFileToS3,
} from "@/lib/api";
import type {
  InvoiceResponse,
  LeaseResponse,
  MaintenanceRequestResponse,
} from "@/types";
import LeaseCard from "@/components/tenant/lease-card";
import RequestList from "@/components/tenant/request-list";
import NewRequestForm from "@/components/tenant/new-request-form";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-warning",
  under_review: "badge-info",
  paid: "badge-success",
  overdue: "badge-error",
  cancelled: "badge-ghost",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  under_review: "Under Review",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

function InvoiceRow({
  invoice,
  onReceiptUploaded,
}: {
  invoice: InvoiceResponse;
  onReceiptUploaded: (updated: InvoiceResponse) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDownload() {
    setDownloading(true);
    try {
      const { url } = await invoicesApi.getPdfUrl(invoice.id);
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const contentType = file.type || "image/jpeg";
      const { uploadUrl, key } = await invoicesApi.getReceiptUploadUrl(
        invoice.id,
        contentType,
      );
      await uploadFileToS3(uploadUrl, file, contentType);
      const updated = await invoicesApi.saveReceiptKey(invoice.id, key);
      onReceiptUploaded(updated);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const canUpload =
    invoice.status === "pending" ||
    invoice.status === "overdue" ||
    invoice.status === "under_review";

  return (
    <>
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
          <div className="flex flex-col gap-1">
            <span
              className={`badge badge-sm ${STATUS_BADGE[invoice.status] ?? "badge-ghost"}`}
            >
              {STATUS_LABEL[invoice.status] ?? invoice.status}
            </span>
          </div>
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
        <td>
          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                className="btn btn-xs btn-outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : invoice.s3ReceiptKey ? (
                  "Replace"
                ) : (
                  "Upload Receipt"
                )}
              </button>
            </>
          )}
        </td>
      </tr>
      {uploadError && (
        <tr>
          <td colSpan={6} className="py-1">
            <span className="text-xs text-error">{uploadError}</span>
          </td>
        </tr>
      )}
    </>
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
    <div className="max-w-6xl mx-auto space-y-6">
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
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      invoice={inv}
                      onReceiptUploaded={(updated) =>
                        setInvoices((prev) =>
                          prev.map((i) => (i.id === updated.id ? updated : i)),
                        )
                      }
                    />
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
