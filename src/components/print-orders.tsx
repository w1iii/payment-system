import type { Category, JerseyOrder } from "@/lib/types";

export function PrintOrders({
  category,
  orders,
  preview = false,
}: {
  category: Category;
  orders: JerseyOrder[];
  preview?: boolean;
}) {
  const paidCount = orders.filter((order) => order.status === "paid").length;
  const unpaidCount = orders.length - paidCount;
  const fee = category === "player" ? 350 : 450;
  const money = (amount: number) =>
    `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <section className={`${preview ? "" : "print-only "}print-root`}>
      <main className="print-sheet">
        <header className="print-header">
          <h1>
            {category === "player"
              ? "PLAYER"
              : category === "nonplayer2"
                ? "NON-PLAYER 2"
                : "NON-PLAYER"}
          </h1>
        </header>
        <table className="print-table">
        <thead>
          <tr>
              <th className="print-col-no">#</th>
              <th>Name</th>
              <th className="print-col-status">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr key={order.id}>
                <td className="print-col-no">{index + 1}</td>
                <td>{order.name}</td>
                <td className="print-col-status">
                  <span
                    className={`print-badge ${
                      order.status === "paid" ? "paid" : "unpaid"
                    }`}
                  >
                    {order.status === "paid" ? "Paid" : "Not paid"}
                  </span>
                </td>
            </tr>
          ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={3} className="print-empty">
                  No entries
                </td>
              </tr>
            )}
        </tbody>
        </table>

        <section className="print-sum">
          <h2>Sum</h2>
          <dl>
            <div>
              <dt>Paid</dt>
              <dd>
                {paidCount} · {money(paidCount * fee)}
              </dd>
            </div>
            <div>
              <dt>Not paid</dt>
              <dd>
                {unpaidCount} · {money(unpaidCount * fee)}
              </dd>
            </div>
            <div className="print-total">
              <dt>Total</dt>
              <dd>
                {orders.length} · {money(orders.length * fee)}
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </section>
  );
}
