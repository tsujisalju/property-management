"use client";

import { useEffect, useState } from "react";
import { budgetsApi, propertiesApi } from "@/lib/api";
import type { PropertyResponse } from "@/types";

const CATEGORIES = ["plumbing", "electrical", "hvac", "general"] as const;

interface Props {
  onSaved: () => void;
  onClose: () => void;
}

export default function SetBudgetModal({ onSaved, onClose }: Props) {
  const now = new Date();

  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState<string>("plumbing");
  const [allocated, setAllocated] = useState("");

  const [loadingProps, setLoadingProps] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    propertiesApi
      .list()
      .then((ps) => {
        setProperties(ps);
        if (ps.length > 0) setPropertyId(ps[0].id);
      })
      .catch(() => setError("Failed to load properties."))
      .finally(() => setLoadingProps(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(allocated);
    if (amt < 0) {
      setError("Allocated amount cannot be negative.");
      return;
    }
    setSubmitting(true);
    try {
      await budgetsApi.upsert(propertyId, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        category,
        allocated: amt,
      });
      onSaved();
    } catch {
      setError("Failed to save budget. Check all fields and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card bg-base-100 w-full max-w-sm shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">Set Monthly Budget</h2>
          <p className="text-sm text-base-content/60">
            {now.toLocaleString("en-MY", { month: "long", year: "numeric" })}
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Property *</legend>
              {loadingProps ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <select
                  className="select select-bordered w-full"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  {properties.length === 0 && (
                    <option value="">No properties found</option>
                  )}
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Category *</legend>
              <select
                className="select select-bordered w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                disabled={submitting}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Allocated Amount (MYR) *</legend>
              <input
                type="number"
                className="input input-bordered w-full"
                value={allocated}
                onChange={(e) => setAllocated(e.target.value)}
                required
                min={0}
                step={0.01}
                disabled={submitting}
              />
              <p className="text-xs text-base-content/50 mt-1">
                If a budget row already exists it will be updated.
              </p>
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
                disabled={submitting || !propertyId || !allocated}
              >
                {submitting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Save Budget"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
