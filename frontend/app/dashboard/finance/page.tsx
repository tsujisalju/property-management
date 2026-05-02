// app/dashboard/finance/page.tsx
// Server Component — data fetched at request time, no loading state needed.

import React from "react";
import InvoiceTable from "@/components/ui/invoicetable";
import { invoicesApi, budgetsApi } from "@/lib/api";
import type { BudgetResponse, InvoiceResponse } from "@/types";
import {
  AlertCircle,
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["plumbing", "electrical", "hvac", "general"] as const;
type Category = string; // matches BudgetResponse.category: string

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  general: "General",
};

function sumAmount(invoices: InvoiceResponse[]) {
  return invoices.reduce((acc, i) => acc + i.amount, 0);
}

function fmt(amount: number) {
  return `MYR ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
}

// Aggregate budgets for one category across all properties for current month
function aggregateCategory(budgets: BudgetResponse[], category: Category) {
  const rows = budgets.filter((b) => b.category === category);
  return {
    allocated: rows.reduce((s, b) => s + b.allocated, 0),
    spent: rows.reduce((s, b) => s + b.spent, 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function FinanceDashboard() {
  const now = new Date();

  let invoices: InvoiceResponse[] = [];
  let budgets: BudgetResponse[] = [];
  let fetchError: string | null = null;

  try {
    [invoices, budgets] = await Promise.all([
      invoicesApi.list(),
      budgetsApi.list({ year: now.getFullYear(), month: now.getMonth() + 1 }),
    ]);
  } catch (err: unknown) {
    fetchError =
      err instanceof Error
        ? err.message
        : "Unknown error fetching finance data.";
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const pending = invoices.filter((i) => i.status === "pending");
  const overdue = invoices.filter((i) => i.status === "overdue");
  const paidThisMonth = invoices.filter((i) => {
    if (i.status !== "paid" || !i.paidDate) return false;
    const d = new Date(i.paidDate);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });

  return (
    <main className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content w-fit"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </Link>
      {/* ── Page title ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Finance Dashboard
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          {now.toLocaleString("en-MY", { month: "long", year: "numeric" })}{" "}
          overview
        </p>
      </div>

      {/* ── API error banner ──────────────────────────────────────────────── */}
      {fetchError && (
        <div role="alert" className="alert alert-error">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold">Failed to load finance data</p>
            <p className="text-sm opacity-80">{fetchError}</p>
          </div>
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
        {/* Pending */}
        <div className="stat">
          <div className="stat-figure text-warning">
            <Clock size={32} />
          </div>
          <div className="stat-title">Pending Invoices</div>
          <div className="stat-value text-warning">{pending.length}</div>
          <div className="stat-desc">{fmt(sumAmount(pending))}</div>
        </div>

        {/* Overdue */}
        <div className="stat">
          <div className="stat-figure text-error">
            <AlertCircle size={32} />
          </div>
          <div className="stat-title">Overdue</div>
          <div className="stat-value text-error">{overdue.length}</div>
          <div className="stat-desc">{fmt(sumAmount(overdue))}</div>
        </div>

        {/* Paid this month */}
        <div className="stat">
          <div className="stat-figure text-success">
            <CheckCircle2 size={32} />
          </div>
          <div className="stat-title">Paid This Month</div>
          <div className="stat-value text-success">{paidThisMonth.length}</div>
          <div className="stat-desc">{fmt(sumAmount(paidThisMonth))}</div>
        </div>
      </div>

      {/* ── Recent Invoices ────────────────────────────────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg mb-2">Recent Invoices</h2>
          <InvoiceTable invoices={invoices} />
        </div>
      </div>

      {/* ── Budget Overview ────────────────────────────────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">
            Budget Overview — {now.toLocaleString("en-MY", { month: "long" })}
          </h2>

          {budgets.length === 0 ? (
            <p className="text-base-content/50 text-sm">
              No budget data for this month yet.
            </p>
          ) : (
            <div className="space-y-5">
              {CATEGORIES.map((cat) => {
                const { allocated, spent } = aggregateCategory(budgets, cat);
                if (allocated === 0) return null;

                const pct = (spent / allocated) * 100;
                const clamped = Math.min(pct, 100);
                const isOver = spent > allocated;

                return (
                  <div key={cat}>
                    {/* Label row */}
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <span
                        className={
                          isOver
                            ? "text-error font-semibold"
                            : "text-base-content/70"
                        }
                      >
                        {fmt(spent)} / {fmt(allocated)}
                        {isOver && (
                          <span className="ml-2 text-xs badge badge-error badge-sm">
                            Over budget
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Progress bar — clamps at 100%, turns red when over */}
                    <progress
                      className={`progress w-full ${isOver ? "progress-error" : "progress-primary"}`}
                      value={clamped}
                      max={100}
                    />

                    {/* Percentage */}
                    <p className="text-xs text-base-content/50 mt-0.5">
                      {pct.toFixed(1)}% used
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
