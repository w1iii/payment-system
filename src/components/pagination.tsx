import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  basePath,
  status,
  q,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  status: string | null;
  q: string;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number): string => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const btn =
    "rounded-md px-3 py-1.5 text-sm font-medium border border-zinc-300 hover:bg-zinc-50";
  const disabled =
    "cursor-not-allowed rounded-md px-3 py-1.5 text-sm font-medium border border-zinc-200 text-zinc-400";

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={btn}>
          Prev
        </Link>
      ) : (
        <span className={disabled}>Prev</span>
      )}

      {pages.map((p) =>
        p === page ? (
          <span
            key={p}
            aria-current="page"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            {p}
          </span>
        ) : (
          <Link key={p} href={hrefFor(p)} className={btn}>
            {p}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={btn}>
          Next
        </Link>
      ) : (
        <span className={disabled}>Next</span>
      )}
    </nav>
  );
}
