import { setStatus } from "@/app/actions/orders";
import type { Status } from "@/lib/types";

const OPTIONS: { label: string; value: Status }[] = [
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Pending", value: "pending" },
];

export function StatusButtons({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  return (
    <span className="inline-flex gap-1">
      {OPTIONS.map(({ label, value }) => (
        <form key={value} action={setStatus.bind(null, id, value)}>
          <button
            type="submit"
            disabled={status === value}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            title={`Mark ${value}`}
          >
            {label}
          </button>
        </form>
      ))}
    </span>
  );
}
