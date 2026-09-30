import { OrderForm } from "@/components/order-form";

export default function NewPlayerOrderPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">New player order</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <OrderForm mode="create" category="player" />
      </div>
    </div>
  );
}
