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
  const fb = order.facebook_url?.trim();
  const fbHref = fb
    ? /^https?:\/\//i.test(fb)
      ? fb
      : `https://m.me/${fb.replace(/^@/, "")}`
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={order.category === "player" ? "/players" : "/"}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold">{order.name}</h1>
          <StatusBadge status={order.status} />
          <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {order.category === "player" ? "Player" : "Non-player"}
          </span>
          {fbHref && (
            <a
              href={fbHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Facebook ↗
            </a>
          )}
        </div>
        <StatusButtons id={order.id} status={order.status} />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Details</h2>
        <OrderForm order={order} mode="edit" />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
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
