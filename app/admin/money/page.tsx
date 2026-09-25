import { db } from "@/lib/db";
import { formatINR, formatDay } from "@/lib/format";
import { recordSettlement } from "@/lib/actions/orders";

export const dynamic = "force-dynamic";

const REVENUE_WHERE = {
  OR: [
    { paymentMethod: "RAZORPAY", paymentStatus: "PAID" },
    { paymentMethod: "COD", status: "DELIVERED" },
  ],
};

type OrderWithItems = {
  id: number;
  total: number;
  createdAt: Date;
  paymentMethod: string;
  items: { price: number; qty: number; product: { costPrice: number } | null }[];
};

export default async function AdminMoneyPage({
  searchParams,
}: {
  searchParams: { settled?: string };
}) {
  const [payments, codDeliveredOrders, refunds, settlements, scopedOrders] = await Promise.all([
    db.payment.findMany({ where: { method: "RAZORPAY", status: "PAID" } }),
    db.order.aggregate({ _sum: { total: true }, where: { paymentMethod: "COD", status: "DELIVERED" } }),
    db.refund.findMany({ orderBy: { createdAt: "desc" }, include: { order: true } }),
    db.settlement.findMany({ orderBy: { settledOn: "desc" } }),
    db.order.findMany({
      where: REVENUE_WHERE,
      include: { items: { include: { product: { select: { costPrice: true } } } } },
    }) as Promise<OrderWithItems[]>,
  ]);

  const onlineReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const codCollected = codDeliveredOrders._sum.total ?? 0;
  const refundsTotal = refunds.reduce((sum, r) => sum + r.amount, 0);
  const netBalance = onlineReceived + codCollected - refundsTotal;
  const settledTotal = settlements.reduce((sum, s) => sum + s.amount, 0);
  const pendingSettlement = netBalance - settledTotal;

  // Monthly view for the last 6 months.
  const now = new Date();
  const months: Date[] = [];
  for (let i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  const since = months[0];

  const monthly = months.map((m) => ({
    label: m.toLocaleString("en-IN", { month: "short", year: "numeric" }),
    revenue: 0,
    refunds: 0,
    profit: 0,
  }));
  const monthIndex = (d: Date) =>
    (d.getFullYear() - since.getFullYear()) * 12 + (d.getMonth() - since.getMonth());

  for (const order of scopedOrders) {
    const idx = monthIndex(order.createdAt);
    if (idx >= 0 && idx < monthly.length) {
      monthly[idx].revenue += order.total;
      monthly[idx].profit += order.items.reduce(
        (sum, item) => sum + (item.price - (item.product?.costPrice ?? 0)) * item.qty,
        0
      );
    }
  }
  const refunds6m = await db.refund.findMany({ where: { createdAt: { gte: since } } });
  for (const refund of refunds6m) {
    const idx = monthIndex(refund.createdAt);
    if (idx >= 0 && idx < monthly.length) monthly[idx].refunds += refund.amount;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="page-title">Money</h1>
      {searchParams.settled === "1" && (
        <div className="banner banner-success">Settlement recorded.</div>
      )}

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Online payments received</div>
          <div className="stat-value is-money">{formatINR(onlineReceived)}</div>
          <div className="small muted">Razorpay, sum of verified payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">COD collected</div>
          <div className="stat-value is-money">{formatINR(codCollected)}</div>
          <div className="small muted">Delivered COD orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Refunds issued</div>
          <div className="stat-value is-money">{formatINR(refundsTotal)}</div>
          <div className="small muted">{refunds.length} refund{refunds.length === 1 ? "" : "s"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net balance</div>
          <div className="stat-value is-money">{formatINR(netBalance)}</div>
          <div className="small muted">Online + COD − refunds</div>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Settled to bank</div>
          <div className="stat-value is-money">{formatINR(settledTotal)}</div>
          <div className="small muted">{settlements.length} recorded settlement{settlements.length === 1 ? "" : "s"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending settlement</div>
          <div className="stat-value is-money">{formatINR(pendingSettlement)}</div>
          <div className="small muted">Net balance − settled to bank</div>
        </div>
      </div>

      <h2 className="section-title">Last 6 months</h2>
      <div className="table-wrap mb-24">
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="table-right">Revenue</th>
              <th className="table-right">Refunds</th>
              <th className="table-right">Estimated profit</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m) => (
              <tr key={m.label}>
                <td className="font-bold">{m.label}</td>
                <td className="table-right">{formatINR(m.revenue)}</td>
                <td className="table-right">{formatINR(m.refunds)}</td>
                <td className="table-right">{formatINR(m.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cart-layout">
        <div>
          <h2 className="section-title">Settlements</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Note</th>
                  <th className="table-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No settlements recorded yet.
                    </td>
                  </tr>
                ) : (
                  settlements.map((s) => (
                    <tr key={s.id}>
                      <td>{formatDay(s.settledOn)}</td>
                      <td className="small">{s.note}</td>
                      <td className="table-right font-bold">{formatINR(s.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mt-0">Record a settlement</h2>
          <form action={recordSettlement} className="form-stack">
            <div>
              <label htmlFor="amount">Amount settled (₹)</label>
              <input id="amount" name="amount" type="number" min="1" step="0.01" required placeholder="50000" />
            </div>
            <div>
              <label htmlFor="note">Note</label>
              <input id="note" name="note" type="text" placeholder="e.g. Razorpay payout to HDFC ••1234" />
            </div>
            <div>
              <label htmlFor="settledOn">Settled on</label>
              <input id="settledOn" name="settledOn" type="date" defaultValue={today} required />
            </div>
            <div>
              <button type="submit" className="btn btn-primary btn-block">
                Record settlement
              </button>
            </div>
          </form>
          <p className="small muted mt-16">
            Razorpay automatically settles your online payments to the bank account linked in the
            Razorpay dashboard (typically T+2). This page is for tracking and reconciliation only.
          </p>
        </div>
      </div>
    </div>
  );
}
