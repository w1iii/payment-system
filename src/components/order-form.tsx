"use client";

import { useActionState } from "react";
import {
  createOrder,
  updateOrder,
  type OrderFormState,
} from "@/app/actions/orders";
import type { Category, JerseyOrder } from "@/lib/types";

const SIZES = ["", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const initialState: OrderFormState = { error: null };

export function OrderForm({
  order,
  mode,
  category,
}: {
  order?: JerseyOrder;
  mode: "create" | "edit";
  category?: Category;
}) {
  const action =
    mode === "create"
      ? createOrder.bind(null, category ?? "nonplayer")
      : updateOrder.bind(null, order!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const v = state.values;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Name *
          <input
            name="name"
            required
            defaultValue={v?.name ?? order?.name ?? ""}
            placeholder="Full name"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </label>

        <label className="block text-sm font-medium text-zinc-700">
          Jersey number
          <input
            name="jersey_number"
            defaultValue={v?.jersey_number ?? order?.jersey_number ?? ""}
            placeholder="e.g. 23"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </label>

        <label className="block text-sm font-medium text-zinc-700">
          Size
          <select
            name="size"
            defaultValue={v?.size ?? order?.size ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s || "—"}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-zinc-700">
          Jersey name (printed)
          <input
            name="jersey_name"
            defaultValue={v?.jersey_name ?? order?.jersey_name ?? ""}
            placeholder="e.g. Bien"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        Note
        <input
          name="note"
          defaultValue={v?.note ?? order?.note ?? ""}
          placeholder="e.g. ari sakon"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Facebook profile (optional)
        <input
          name="facebook_url"
          defaultValue={v?.facebook_url ?? order?.facebook_url ?? ""}
          placeholder="https://facebook.com/… or @username"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Add order"
            : "Save changes"}
      </button>
    </form>
  );
}
