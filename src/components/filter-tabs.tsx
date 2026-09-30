import Link from "next/link";

const TABS = [
  { label: "All", value: null },
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Pending", value: "pending" },
] as const;

function hrefFor(status: string | null, q: string): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const s = params.toString();
  return s ? `/?${s}` : "/";
}

export function FilterTabs({
  current,
  q,
}: {
  current: string | null;
  q: string;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-zinc-200/70 p-1">
      {TABS.map(({ label, value }) => {
        const active = (value ?? null) === (current ?? null);
        return (
          <Link
            key={label}
            href={hrefFor(value, q)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
