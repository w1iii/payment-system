import { OrdersView } from "@/components/orders-view";

export default async function PlayersPage({
  searchParams,
}: PageProps<"/players">) {
  const sp = await searchParams;
  return (
    <OrdersView category="player" basePath="/players" searchParams={sp} />
  );
}
