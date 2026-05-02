"use client";

import { useEffect, useState } from "react";
import { invoicesApi, leasesApi } from "@/lib/api";
import type { LeaseResponse } from "@/types";

const INVOICE_TYPES = ["rent", "maintenance", "deposit", "penalty"] as const;
const CATEGORIES = ["plumbing", "electrical", "hvac", "general"] as const;

interface Props {
  onCreated: () => void;
  onClose: () => void;
}

export default function CreateInvoiceModal({ onCreated, onClose }: Props) {
  const [leases, setLeases] = useState<LeaseResponse[]>([]);
  const [leaseId, setLeaseId] = useState("");
  const [type, setType] = useState<string>("rent");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<string>("plumbing");

  const [loadingLeases, setLoadingLeases] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    leasesApi
      .list()
      .then((ls) => {
        const active = ls.filter((l) => l.status === "active");
        setLeases(active);
        if (active.length > 0) setLeaseId(active[0].id);
      })
      .catch(() => setError("Failed to load leases."))
      .finally(() => setLoadingLeases(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await invoicesApi.create({
        leaseId,
        type,
        amount: parseFloat(amount),
        dueDate,
        category: type === "maintenance" ? category : undefined,
      });
      onCreated();
    } catch {
      setError("Failed to create invoice. Check all fields and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card bg-base-100 w-full max-w-md shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">New Invoice</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Lease *</legend>
              {loadingLeases ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <select
                  className="select select-bordered w-full"
                  value={leaseId}
                  onChange={(e) => setLeaseId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  {leases.length === 0 && (
                    <option value="">No active leases found</option>
                  )}
                  {leases.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.unitNumber} — {l.tenantName} ({l.propertyName})
                    </option>
                  ))}
                </select>
              )}
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Type *</legend>
                <select
                  className="select select-bordered w-full"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                  disabled={submitting}
                >
                  {INVOICE_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Amount (MYR) *</legend>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min={0.01}
                  step={0.01}
                  disabled={submitting}
                />
              </fieldset>
            </div>

            {type === "maintenance" && (
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Budget Category *</legend>
                <select
                  className="select select-bordered w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  disabled={submitting}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-base-content/50 mt-1">
                  Spend will be recorded against this month&apos;s budget.
                </p>
              </fieldset>
            )}

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Due Date *</legend>
              <input
                type="date"
                className="input input-bordered w-full"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                disabled={submitting}
              />
            </fieldset>

            {error && (
              <div className="alert alert-error text-sm py-2">
                <span>{error}</span>
              </div>
            )}

            <div className="card-actions justify-end gap-2 mt-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-neutral btn-sm"
                disabled={submitting || !leaseId || !amount || !dueDate}
              >
                {submitting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Create Invoice"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
