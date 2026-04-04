import type { RequestStatus } from "@/types";

const config: Record<RequestStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "badge badge-sm badge-soft badge-error" },
  in_progress: { label: "In Progress", className: "badge badge-sm badge-soft badge-warning" },
  resolved: { label: "Resolved", className: "badge badge-sm badge-soft badge-success" },
  closed: { label: "Closed", className: "badge badge-sm badge-ghost" },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = config[status] ?? { label: status, className: "badge badge-sm badge-ghost" };
  return <span className={className}>{label}</span>;
}
