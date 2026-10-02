import { OrdersView } from "@/components/orders-view";

export default async function NonPlayersTwoPage({
  searchParams,
}: PageProps<"/nonplayers-2">) {
  const sp = await searchParams;
  return (
    <OrdersView category="nonplayer2" basePath="/nonplayers-2" searchParams={sp} />
  );
}
