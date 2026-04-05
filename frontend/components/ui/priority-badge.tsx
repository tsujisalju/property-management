import type { RequestPriority } from "@/types";

const config: Record<RequestPriority, { label: string; className: string }> = {
  emergency: { label: "Emergency", className: "badge badge-sm badge-error" },
  high: { label: "High", className: "badge badge-sm badge-warning" },
  medium: {
    label: "Medium",
    className: "badge badge-sm badge-info",
  },
  low: { label: "Low", className: "badge badge-sm" },
};

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const { label, className } = config[priority] ?? {
    label: priority,
    className: "badge badge-sm badge-ghost",
  };
  return <span className={className}>{label}</span>;
}
