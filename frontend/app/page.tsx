import Link from "next/link";
import { healthApi } from "@/lib/api";

export default async function HomePage() {
  let health = null;
  let error = null;

  try {
    health = await healthApi.get();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <main className="w-full max-w-3xl mx-auto min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900">
          Property Management Platform
        </h1>
        <p className="mt-2 text-gray-500">
          Cloud-based property, tenant and maintenance management.
        </p>
      </div>

      {/* Backend health card */}
      <div className="card w-full max-w-sm bg-base-100 shadow-sm">
        <div className="card-body">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
            Backend status
          </p>
          {error ? (
            <div className="flex items-center gap-2">
              <span className="status status-error" />
              <span className="text-sm text-red-600">
                Cannot reach backend — {error}
              </span>
            </div>
          ) : health ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`status ${health.status === "ok" ? "status-success" : "status-warning"}`}
                />
                <span className="font-medium capitalize">{health.status}</span>
                <span className="text-gray-400">— {health.environment}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`status ${health.database === "connected" ? "status-success" : "status-error"}`}
                />
                <span className="text-gray-600">
                  Database {health.database}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Link href="/dashboard" className="btn btn-primary">
        Go to dashboard
      </Link>

      <div className="text-center space-y-2">
        <p className="text-sm font-semibold">
          Designing and Developing Applications on the Cloud (022026-LWL)
        </p>
        <small>
          Ahmed Saleh Mohsen Mabkhot Al-Shadadi (TP074025) • Hayyan Mohamed
          Abdulla (TP074745) • Muhammad Qayyum Bin Mahamad Yazid (TP075129) •
          Teshwindev Singh Bhatt A/L Baldev (TP068387) Singh
        </small>
      </div>
    </main>
  );
}
