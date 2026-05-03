"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { propertiesApi, leasesApi, maintenanceApi, usersApi } from "@/lib/api";
import { Building, DoorClosed, Toolbox, Users } from "lucide-react";

// ── Manager summary ──────────────────────────────────────────────────────────

function ManagerSummary() {
  const [props, setProps] = useState<number | null>(null);
  const [leases, setLeases] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    propertiesApi
      .list()
      .then((ps) => setProps(ps.length))
      .catch(() => setProps(0));
    leasesApi
      .list()
      .then((ls) => setLeases(ls.filter((l) => l.status === "active").length))
      .catch(() => setLeases(0));
    maintenanceApi
      .list({ status: "open" })
      .then((rs) => setOpen(rs.length))
      .catch(() => setOpen(0));
  }, []);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Manager Portal</h1>
        <p className="text-base-content/60 text-sm">
          Manage property information and track maintenance requests from
          tenants.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
          Summary
        </h2>
        <div className="stats shadow w-full">
          <div className="stat bg-base-100">
            <div className="stat-figure text-secondary">
              <Building />
            </div>
            <div className="stat-title">Total Properties</div>
            <div className="stat-value">{props ?? "—"}</div>
          </div>
          <div className="stat bg-base-100">
            <div className="stat-figure text-secondary">
              <DoorClosed />
            </div>
            <div className="stat-title">Active Leases</div>
            <div className="stat-value">{leases ?? "—"}</div>
          </div>
          <div className="stat bg-base-100">
            <div className="stat-figure text-secondary">
              <Toolbox />
            </div>
            <div className="stat-title">Open Requests</div>
            <div className="stat-value">{open ?? "—"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Admin summary ────────────────────────────────────────────────────────────

function AdminSummary() {
  const [total, setTotal] = useState<number | null>(null);
  const [managers, setManagers] = useState<number | null>(null);
  const [staff, setStaff] = useState<number | null>(null);

  useEffect(() => {
    usersApi
      .list()
      .then((us) => {
        setTotal(us.length);
        setManagers(us.filter((u) => u.role === "manager").length);
        setStaff(us.filter((u) => u.role === "maintenance_staff").length);
      })
      .catch(() => {
        setTotal(0);
        setManagers(0);
        setStaff(0);
      });
  }, []);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin Portal</h1>
        <p className="text-base-content/60 text-sm">
          Manage user accounts and system access.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
          Summary
        </h2>
        <div className="stats shadow w-full">
          <div className="stat bg-base-100">
            <div className="stat-figure text-secondary">
              <Users />
            </div>
            <div className="stat-title">Total Users</div>
            <div className="stat-value">{total ?? "—"}</div>
          </div>
          <div className="stat bg-base-100">
            <div className="stat-figure text-primary">
              <Users />
            </div>
            <div className="stat-title">Managers</div>
            <div className="stat-value text-primary">{managers ?? "—"}</div>
          </div>
          <div className="stat bg-base-100">
            <div className="stat-figure text-warning">
              <Users />
            </div>
            <div className="stat-title">Staff</div>
            <div className="stat-value text-warning">{staff ?? "—"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user?.role === "tenant") {
        router.replace("/dashboard/tenant");
      }
      if (user?.role === "maintenance_staff") {
        router.replace("/dashboard/work-orders");
      }
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (user.role === "manager") return <ManagerSummary />;
  if (user.role === "admin") return <AdminSummary />;

  return (
    <div className="flex justify-center py-16">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
}
