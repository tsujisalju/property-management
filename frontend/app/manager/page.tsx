import { Building, DoorClosed, Toolbox } from "lucide-react";

export default function ManagerPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Manager Portal</h1>
        <p className="text-base-content/60 text-sm">
          Manage property information and track maintenance requests from
          tenants
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium text-base-content/50 text-sm uppercase tracking-wide">
          Summary
        </h2>
        <div className="stats shadow">
          <div className="stat bg-base-100">
            <div className="stat-figure text-secondary">
              <Building />
            </div>
            <div className="stat-title">Total Buildings</div>
            <div className="stat-value">{"-"}</div>
          </div>
          <div className="stat bg-base-100">
            <div className="stat-figure text-secondary">
              <DoorClosed />
            </div>
            <div className="stat-title">Total Active Leases</div>
            <div className="stat-value">{"-"}</div>
          </div>
          <div className="stat bg-base-100">
            <div className="stat-figure text-secondary">
              <Toolbox />
            </div>
            <div className="stat-title">Open Maintenance Requests</div>
            <div className="stat-value">{"-"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
