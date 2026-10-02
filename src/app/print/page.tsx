import { PrintOrders } from "@/components/print-orders";
import { requireAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/db";
import type { Category } from "@/lib/types";
import { PrintOnLoad } from "./print-on-load";

export default async function PrintPage({
  searchParams,
}: PageProps<"/print">) {
  await requireAdmin();

  const params = await searchParams;
  const category: Category =
    params.category === "player"
      ? "player"
      : params.category === "nonplayer2"
        ? "nonplayer2"
        : "nonplayer";
  const { data, error } = await getSupabase()
    .from("jersey_orders")
    .select("*")
    .eq("category", category)
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw new Error(`Failed to load print orders: ${error.message}`);

  return (
    <>
      <PrintOnLoad />
      <PrintOrders category={category} orders={data ?? []} preview />
    </>
  );
}
