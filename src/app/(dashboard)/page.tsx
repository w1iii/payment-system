import { getSupabase } from "@/lib/db";
import { STATUSES } from "@/lib/types";
import { FilterTabs } from "@/components/filter-tabs";
import { OrderTable } from "@/components/order-table";
import { SummaryCards } from "@/components/summary-cards";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/">) {
  const sp = await searchParams;
  const single = (v: string | string[] | undefined) =>
    Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  const statusParam = single(sp.status);
  const status = STATUSES.includes(statusParam as never)
    ? statusParam
    : null;
  const q = single(sp.q).replace(/[%_,()]/g, "").trim();

  const db = getSupabase();

  const countBy = (filter?: { status: string }) => {
    let query = db
      .from("jersey_orders")
      .select("id", { count: "exact", head: true });
    if (filter) query = query.eq("status", filter.status);
    return query.then(({ count }) => count ?? 0);
  };

  const [total, paid, unpaid, pending] = await Promise.all([
    countBy(),
    countBy({ status: "paid" }),
    countBy({ status: "unpaid" }),
    countBy({ status: "pending" }),
  ]);

  let query = db.from("jersey_orders").select("*");
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${q}%,jersey_name.ilike.%${q}%`);
  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw new Error(`Failed to load orders: ${error.message}`);

  return (
    <div className="space-y-6">
      <SummaryCards
        counts={{ total, paid, unpaid, pending }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs current={status} q={q} />
        <form method="GET" action="/" className="flex items-center gap-2">
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
      </div>

      <OrderTable orders={data ?? []} />
    </div>
  );
}
