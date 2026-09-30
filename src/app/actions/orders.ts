"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import { STATUSES, type Status } from "@/lib/types";

export interface OrderFormState {
  error: string | null;
}

const SIZE_VALUES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;

const orderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  jersey_number: z.string().max(10),
  size: z.enum(SIZE_VALUES).or(z.literal("")),
  jersey_name: z.string().max(50),
  note: z.string().max(200),
});

type OrderInput = {
  name: string;
  jersey_number: string | null;
  size: string | null;
  jersey_name: string | null;
  note: string | null;
};

function parseOrder(formData: FormData):
  | { ok: true; data: OrderInput }
  | { ok: false; error: string } {
  const parsed = orderSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    jersey_number: String(formData.get("jersey_number") ?? ""),
    size: String(formData.get("size") ?? ""),
    jersey_name: String(formData.get("jersey_name") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const v = parsed.data;
  return {
    ok: true,
    data: {
      name: v.name.trim(),
      jersey_number: v.jersey_number.trim() || null,
      size: v.size || null,
      jersey_name: v.jersey_name.trim() || null,
      note: v.note.trim() || null,
    },
  };
}

export async function createOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireAdmin();

  const result = parseOrder(formData);
  if (!result.ok) return { error: result.error };

  const { error } = await getSupabase()
    .from("jersey_orders")
    .insert(result.data);
  if (error) return { error: `Failed to save order: ${error.message}` };

  revalidatePath("/");
  redirect("/");
}

export async function updateOrder(
  id: string,
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireAdmin();

  const result = parseOrder(formData);
  if (!result.ok) return { error: result.error };

  const { error } = await getSupabase()
    .from("jersey_orders")
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Failed to update order: ${error.message}` };

  revalidatePath("/");
  revalidatePath(`/orders/${id}`);
  return { error: null };
}

export async function setStatus(id: string, status: Status): Promise<void> {
  await requireAdmin();
  if (!STATUSES.includes(status)) throw new Error("Invalid status");

  const { error } = await getSupabase()
    .from("jersey_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Failed to update status: ${error.message}`);

  revalidatePath("/");
  revalidatePath(`/orders/${id}`);
}

export async function deleteOrder(id: string): Promise<void> {
  await requireAdmin();

  const { error } = await getSupabase()
    .from("jersey_orders")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Failed to delete order: ${error.message}`);

  revalidatePath("/");
  redirect("/");
}
