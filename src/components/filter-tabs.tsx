import Link from "next/link";

const TABS = [
  { label: "All", value: null },
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Pending", value: "pending" },
] as const;

function hrefFor(
  basePath: string,
  status: string | null,
  q: string,
): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const s = params.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function FilterTabs({
  current,
  q,
  basePath = "/",
}: {
  current: string | null;
  q: string;
  basePath?: string;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-zinc-200/70 p-1">
      {TABS.map(({ label, value }) => {
        const active = (value ?? null) === (current ?? null);
        return (
          <Link
            key={label}
            href={hrefFor(basePath, value, q)}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
