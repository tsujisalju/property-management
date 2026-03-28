import Link from "next/link";

// Each team member expands their own card into a full feature section.
const sections = [
  {
    title: "Maintenance",
    description: "Schedule repairs, track work history, respond to tenant requests.",
    href: "/dashboard/maintenance",
    role: "Property manager",
    color: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    title: "Tenant portal",
    description: "Submit issues, view lease details, communicate with management.",
    href: "/dashboard/tenant",
    role: "Tenant",
    color: "bg-purple-50 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    title: "Finance",
    description: "Budget tracking, invoices, payment collection and reporting.",
    href: "/dashboard/finance",
    role: "Finance / admin",
    color: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Work orders",
    description: "View assigned jobs, update status, add progress comments.",
    href: "/dashboard/work-orders",
    role: "Maintenance staff",
    color: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">Select a section to get started.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`rounded-xl border p-6 hover:shadow-md transition-shadow ${s.color}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{s.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{s.description}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
                  {s.role}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
