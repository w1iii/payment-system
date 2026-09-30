interface Counts {
  total: number;
  paid: number;
  unpaid: number;
  pending: number;
}

const CARDS = [
  { key: "total", label: "Total orders", cls: "bg-white text-zinc-900" },
  { key: "paid", label: "Paid", cls: "bg-green-50 text-green-900" },
  { key: "unpaid", label: "Unpaid", cls: "bg-red-50 text-red-900" },
  { key: "pending", label: "Pending", cls: "bg-amber-50 text-amber-900" },
] as const;

export function SummaryCards({ counts }: { counts: Counts }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {CARDS.map(({ key, label, cls }) => (
        <div key={key} className={`rounded-xl border border-zinc-200 p-4 ${cls}`}>
          <p className="text-sm opacity-70">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {counts[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
