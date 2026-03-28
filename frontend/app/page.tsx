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
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900">
          Property Management Platform
        </h1>
        <p className="mt-2 text-gray-500">
          Cloud-based property, tenant and maintenance management.
        </p>
      </div>

      {/* Backend health card */}
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
          Backend status
        </p>

        {error ? (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-sm text-red-600">
              Cannot reach backend — {error}
            </span>
          </div>
        ) : health ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${health.status === "ok" ? "bg-green-500" : "bg-yellow-400"}`}
              />
              <span className="font-medium capitalize">{health.status}</span>
              <span className="text-gray-400">— {health.environment}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${health.database === "connected" ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-gray-600">Database {health.database}</span>
            </div>
          </div>
        ) : null}
      </div>

      <Link
        href="/dashboard"
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
