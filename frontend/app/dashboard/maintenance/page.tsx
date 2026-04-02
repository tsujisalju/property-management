import { Building } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="font-semibold text-2xl">Maintenance Page</h1>
        <h2 className="text-xl">Maintenance Requests</h2>
        <div className="join">
          <button className="btn btn-sm btn-neutral rounded-l-full join-item">
            All
          </button>
          <button className="btn btn-sm join-item">Open</button>
          <button className="btn btn-sm join-item">In progress</button>
          <button className="btn btn-sm rounded-r-full join-item">
            Resolved
          </button>
        </div>
        <Link href="/dashboard/maintenance/1">
          <div className="card card-sm bg-base-100 shadow-sm hover:shadow-lg transition">
            <div className="card-body">
              <div className="flex justify-between">
                <h2 className="card-title">Request title</h2>
                <span className="m-1 badge badge-sm badge-primary">Status</span>
              </div>
              <div className="flex space-x-4 items-center">
                <div className="flex space-x-2 items-center">
                  <div className="flex bg-neutral-content rounded-full w-8 h-8 justify-center items-center">
                    <Building className="size-3.5" />
                  </div>
                  <span>Unit</span>
                </div>
                <div className="flex space-x-2 items-center">
                  <div className="avatar avatar-placeholder">
                    <div className="bg-neutral-content w-8 rounded-full">
                      <span>QY</span>
                    </div>
                  </div>
                  <p>Qayyum Yazid</p>
                </div>
                <div>
                  <span className="badge badge-sm badge-warning">Priority</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
