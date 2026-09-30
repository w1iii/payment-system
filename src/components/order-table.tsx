import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { StatusButtons } from "@/components/status-buttons";
import type { JerseyOrder } from "@/lib/types";

export function OrderTable({ orders }: { orders: JerseyOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
        No orders found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Jersey name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Note</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-900">{o.name}</td>
              <td className="px-4 py-3 tabular-nums text-zinc-600">
                {o.jersey_number ?? "—"}
              </td>
              <td className="px-4 py-3 text-zinc-600">{o.size ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-600">
                {o.jersey_name ?? "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3 text-zinc-500">{o.note ?? ""}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <StatusButtons id={o.id} status={o.status} />
                  <Link
                    href={`/orders/${o.id}`}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
