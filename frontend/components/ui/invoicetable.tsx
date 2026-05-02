"use client";

// components/ui/InvoiceTable.tsx
// Client Component — needs interactivity (PDF download onClick).

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { invoicesApi } from "@/lib/api";
import type { InvoiceResponse } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
    invoices: InvoiceResponse[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: "badge-warning",
        paid: "badge-success",
        overdue: "badge-error",
        cancelled: "badge-ghost",
    };
    const cls = map[status] ?? "badge-neutral";
    return (
        <span className={`badge badge-sm font-medium capitalize ${cls}`}>
            {status}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const map: Record<string, string> = {
        rent: "badge-info",
        maintenance: "badge-warning",
        deposit: "badge-primary",
        penalty: "badge-error",
    };
    const cls = map[type] ?? "badge-neutral";
    return (
        <span className={`badge badge-sm badge-outline capitalize ${cls}`}>
            {type}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF download button (per-row loading state)
// ─────────────────────────────────────────────────────────────────────────────
function PdfDownloadButton({ invoiceId }: { invoiceId: string }) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            const { url } = await invoicesApi.getPdfUrl(invoiceId);
            // Open the pre-signed S3 URL in a new tab — browser triggers download
            window.open(url, "_blank", "noopener,noreferrer");
        } catch (err) {
            console.error("Failed to get PDF URL:", err);
            alert("Could not retrieve PDF. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className="btn btn-ghost btn-xs gap-1 text-indigo-500 hover:text-indigo-700"
            aria-label="Download invoice PDF"
        >
            {loading ? (
                <Loader2 size={14} className="animate-spin" />
            ) : (
                <Download size={14} />
            )}
            PDF
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main table component
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoiceTable({ invoices }: Props) {
    if (invoices.length === 0) {
        return (
            <p className="text-base-content/50 text-sm py-6 text-center">
                No invoices found.
            </p>
        );
    }

    return (
        // overflow-x-auto makes the table horizontally scrollable on small screens
        <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-zebra table-sm min-w-[640px]">
                <thead className="bg-base-200 text-base-content/70 uppercase text-xs tracking-wide">
                    <tr>
                        <th>Type</th>
                        <th>Amount (MYR)</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Paid Date</th>
                        <th className="text-right">PDF</th>
                    </tr>
                </thead>

                <tbody>
                    {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover">

                            {/* Type */}
                            <td>
                                <TypeBadge type={invoice.type} />
                            </td>

                            {/* Amount */}
                            <td className="font-mono font-medium">
                                {invoice.amount.toLocaleString("en-MY", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </td>

                            {/* Due Date */}
                            <td className="text-base-content/80">
                                {new Date(invoice.dueDate).toLocaleDateString("en-MY", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </td>

                            {/* Status */}
                            <td>
                                <StatusBadge status={invoice.status} />
                            </td>

                            {/* Paid Date — em dash when absent */}
                            <td className="text-base-content/60">
                                {invoice.paidDate
                                    ? new Date(invoice.paidDate).toLocaleDateString("en-MY", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    })
                                    : "—"}
                            </td>

                            {/* PDF download — rendered only when s3PdfKey is present */}
                            <td className="text-right">
                                {invoice.s3PdfKey ? (
                                    <PdfDownloadButton invoiceId={invoice.id} />
                                ) : (
                                    <span className="text-base-content/30 text-xs">—</span>
                                )}
                            </td>

                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}