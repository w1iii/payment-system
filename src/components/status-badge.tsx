import type { Status } from "@/lib/types";

const STYLES: Record<Status, string> = {
  paid: "bg-green-100 text-green-800 ring-green-600/20",
  unpaid: "bg-red-100 text-red-800 ring-red-600/20",
  pending: "bg-amber-100 text-amber-800 ring-amber-600/20",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
