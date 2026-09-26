import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { approveOrder, rejectOrder } from "@/lib/actions/orders";

export const dynamic = "force-dynamic";

// Orders that count as realised revenue.
const REVENUE_WHERE = {
  OR: [
    { paymentMethod: "RAZORPAY", paymentStatus: "PAID" },
    { paymentMethod: "COD", status: "DELIVERED" },
  ],
};

export default async function AdminDashboardPage() {
  const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  const [revenueAgg, orderCount, customerCount, lowStock, pendingOrders, recentOrders, chartOrders] =
    await Promise.all([
      db.order.aggregate({ _sum: { total: true }, where: REVENUE_WHERE }),
      db.order.count(),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.product.findMany({ where: { active: true, stock: { lt: 5 } }, orderBy: { stock: "asc" }, take: 5 }),
      db.order.findMany({
        where: { status: "PLACED" },
        orderBy: { createdAt: "asc" },
        include: { user: true, items: true },
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: true, items: true },
      }),
      db.order.findMany({
        where: { createdAt: { gte: since }, ...REVENUE_WHERE },
        select: { total: true, createdAt: true },
      }),
    ]);

  // Daily revenue for the last 30 days (for the chart).
  const days: { label: string; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, revenue: 0 });
  }
  for (const o of chartOrders) {
    const diff = Math.floor((Date.now() - o.createdAt.getTime()) / 86400000);
    if (diff >= 0 && diff < 30) days[29 - diff].revenue += o.total;
  }
  const maxRevenue = Math.max(...days.map((d) => d.revenue), 1);
  const monthRevenue = chartOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Total revenue</div>
          <div className="stat-value is-money">{formatINR(revenueAgg._sum.total ?? 0)}</div>
          <div className="small muted">Paid online + delivered COD</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Orders</div>
          <div className="stat-value">{orderCount}</div>
          <div className="small muted">{pendingOrders.length} awaiting approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Customers</div>
          <div className="stat-value">{customerCount}</div>
          <div className="small muted">Registered shoppers</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low stock</div>
          <div className="stat-value">{lowStock.length}</div>
          <div className="small muted">Products under 5 units</div>
        </div>
      </div>

      <div className="card chart-card">
        <h2 className="section-title mt-0">
          Revenue — last 30 days <span className="muted small">({formatINR(monthRevenue)} in this period)</span>
        </h2>
        {chartOrders.length === 0 ? (
          <p className="muted">No sales in this period yet. Revenue will appear here as orders come in.</p>
        ) : (
          <svg viewBox="0 0 620 170" className="revenue-chart" role="img" aria-label="Daily revenue for the last 30 days">
            <line x1="0" y1="150" x2="620" y2="150" stroke="var(--border)" strokeWidth="1" />
            {days.map((d, i) => {
              const h = Math.max(2, Math.round((d.revenue / maxRevenue) * 120));
              return (
                <g key={i}>
                  <rect
                    x={i * 20 + 3}
                    y={150 - h}
                    width="14"
                    height={h}
                    rx="3"
                    fill="var(--accent)"
                    opacity={d.revenue > 0 ? 0.9 : 0.25}
                  >
                    <title>{`${d.label}: ${formatINR(d.revenue)}`}</title>
                  </rect>
                  {i % 5 === 0 && (
                    <text x={i * 20 + 10} y="165" textAnchor="middle" fontSize="10" fill="var(--muted)">
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <h2 className="section-title">Awaiting approval</h2>
      {pendingOrders.length === 0 ? (
        <p className="muted mb-24">No orders are waiting for approval. 🎉</p>
      ) : (
        <div className="table-wrap mb-24">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Payment</th>
                <th className="table-right">Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/orders`} className="font-bold">
                      #{order.id}
                    </Link>
                    <div className="small muted">{formatDate(order.createdAt)}</div>
                  </td>
                  <td>
                    {order.user.name}
                    <div className="small muted">{order.user.email}</div>
                  </td>
                  <td>
                    <StatusBadge status={order.paymentMethod === "COD" ? "COD_PENDING" : order.paymentStatus} kind="payment" />
                  </td>
                  <td className="table-right font-bold">{formatINR(order.total)}</td>
                  <td>
                    <div className="row-actions">
                      <form action={approveOrder}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button type="submit" className="btn btn-sm btn-success">
                          Approve
                        </button>
                      </form>
                      <form action={rejectOrder}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button type="submit" className="btn btn-sm btn-danger-outline">
                          Reject
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title">Recent orders</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th className="table-right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No orders yet.
                </td>
              </tr>
            ) : (
              recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/orders/${order.id}`} className="font-bold">
                      #{order.id}
                    </Link>
                    <div className="small muted">{formatDate(order.createdAt)}</div>
                  </td>
                  <td>
                    {order.user.name}
                    <div className="small muted">{order.user.email}</div>
                  </td>
                  <td className="small">{order.items.reduce((n, i) => n + i.qty, 0)} items</td>
                  <td className="table-right font-bold">{formatINR(order.total)}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Low stock</h2>
      {lowStock.length === 0 ? (
        <p className="muted">All active products have healthy stock.</p>
      ) : (
        <div className="chips">
          {lowStock.map((p) => (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="chip">
              {p.name} · {p.stock} left
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
