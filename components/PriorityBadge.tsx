import type { Priority } from "@/lib/types";

const CONFIG: Record<Priority, { label: string; className: string }> = {
  urgent: {
    label: "URGENT",
    className: "bg-red-100 text-red-700 border border-red-200",
  },
  high: {
    label: "HIGH",
    className: "bg-orange-100 text-orange-700 border border-orange-200",
  },
  normal: {
    label: "NORMAL",
    className: "bg-blue-100 text-blue-600 border border-blue-200",
  },
  low: {
    label: "LOW",
    className: "bg-gray-100 text-gray-500 border border-gray-200",
  },
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = CONFIG[priority] ?? CONFIG.normal;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
