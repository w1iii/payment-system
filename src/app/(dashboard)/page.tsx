import { OrdersView } from "@/components/orders-view";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/">) {
  const sp = await searchParams;
  return (
    <OrdersView category="nonplayer" basePath="/" searchParams={sp} />
  );
}
