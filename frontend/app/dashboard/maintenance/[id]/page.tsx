import { Building } from "lucide-react";

export default function MaintenanceRequestPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <small>Maintenance Request</small>
        <h1 className="font-semibold text-2xl">Request Title</h1>
        <div className="flex space-x-4 items-center">
          <div className="flex space-x-2 items-center">
            <div className="flex bg-neutral-content rounded-full w-8 h-8 justify-center items-center">
              <Building className="size-3.5" />
            </div>
            <span className="text-sm">Unit</span>
          </div>
          <div className="flex space-x-2 items-center">
            <div className="avatar avatar-placeholder">
              <div className="bg-neutral-content w-8 rounded-full">
                <span className="text-sm">QY</span>
              </div>
            </div>
            <span className="text-sm">Qayyum Yazid</span>
          </div>
          <div>
            <span className="badge badge-sm badge-warning">Priority</span>
          </div>
        </div>
        <div className="card"></div>
      </div>
    </main>
  );
}
