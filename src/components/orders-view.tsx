import Link from "next/link";
import { getSupabase } from "@/lib/db";
import { STATUSES, type Category } from "@/lib/types";
import { FilterTabs } from "@/components/filter-tabs";
import { OrderTable } from "@/components/order-table";
import { Pagination } from "@/components/pagination";
import { SummaryCards } from "@/components/summary-cards";

export const PAGE_SIZE = 10;

export interface OrdersSearchParams {
  status?: string | string[];
  q?: string | string[];
  page?: string | string[];
}

const single = (v: string | string[] | undefined) =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

export async function OrdersView({
  category,
  basePath,
  searchParams,
}: {
  category: Category;
  basePath: string;
  searchParams: OrdersSearchParams;
}) {
  const statusParam = single(searchParams.status);
  const status = STATUSES.includes(statusParam as never)
    ? statusParam
    : null;
  const q = single(searchParams.q).replace(/[%_,()]/g, "").trim();
  const pageRaw = parseInt(single(searchParams.page), 10);
  let page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const db = getSupabase();

  const countBy = (filter?: { status: string }) => {
    let query = db
      .from("jersey_orders")
      .select("id", { count: "exact", head: true })
      .eq("category", category);
    if (filter) query = query.eq("status", filter.status);
    return query.then(({ count }) => count ?? 0);
  };

  const filteredCountQuery = () => {
    let query = db
      .from("jersey_orders")
      .select("id", { count: "exact", head: true })
      .eq("category", category);
    if (status) query = query.eq("status", status);
    if (q) query = query.or(`name.ilike.%${q}%,jersey_name.ilike.%${q}%`);
    return query.then(({ count }) => count ?? 0);
  };

  const [total, paid, unpaid, pending, filteredCount] = await Promise.all([
    countBy(),
    countBy({ status: "paid" }),
    countBy({ status: "unpaid" }),
    countBy({ status: "pending" }),
    filteredCountQuery(),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  if (page > totalPages) page = totalPages;
  const offset = (page - 1) * PAGE_SIZE;

  let query = db
    .from("jersey_orders")
    .select("*")
    .eq("category", category);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${q}%,jersey_name.ilike.%${q}%`);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) throw new Error(`Failed to load orders: ${error.message}`);

  return (
    <div className="space-y-6">
      <SummaryCards counts={{ total, paid, unpaid, pending }} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs current={status} q={q} basePath={basePath} />
        <div className="flex items-center gap-2">
          <form method="GET" action={basePath} className="flex items-center gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name…"
              className="w-48 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-900"
            />
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Search
            </button>
          </form>
          <Link
            href={`${basePath}/new`}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            New order
          </Link>
        </div>
      </div>

      <OrderTable orders={data ?? []} />

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath={basePath}
        status={status}
        q={q}
      />
    </div>
  );
}
