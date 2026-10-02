import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteOrder } from "@/app/actions/orders";
import { getSupabase } from "@/lib/db";
import type { JerseyOrder } from "@/lib/types";
import { OrderForm } from "@/components/order-form";
import { StatusBadge } from "@/components/status-badge";
import { StatusButtons } from "@/components/status-buttons";

export default async function OrderDetailPage({
  params,
}: PageProps<"/orders/[id]">) {
  const { id } = await params;

  const { data, error } = await getSupabase()
    .from("jersey_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load order: ${error.message}`);
  if (!data) notFound();

  const order = data as JerseyOrder;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href={
              order.category === "player"
                ? "/players"
                : order.category === "nonplayer2"
                  ? "/nonplayers-2"
                  : "/"
            }
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back
          </Link>
          <h1 className="max-w-full truncate text-lg font-semibold">{order.name}</h1>
          <StatusBadge status={order.status} />
          <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {order.category === "player"
              ? "Player"
              : order.category === "nonplayer2"
                ? "Non-player 2"
                : "Non-player"}
          </span>
        </div>
        <div className="self-start">
          <StatusButtons id={order.id} status={order.status} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Details</h2>
        <OrderForm order={order} mode="edit" />
      </div>

      <div className="flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Created {new Date(order.created_at).toLocaleString()}</span>
        <span>Updated {new Date(order.updated_at).toLocaleString()}</span>
      </div>

      <form
        action={deleteOrder.bind(null, order.id)}
        className="border-t border-zinc-200 pt-4"
      >
        <button
          type="submit"
          className="text-sm text-red-600 hover:underline"
        >
          Delete order
        </button>
      </form>
    </div>
  );
}
