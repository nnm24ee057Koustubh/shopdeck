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
  const [revenueAgg, orderCount, customerCount, lowStock, pendingOrders, recentOrders] =
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
    ]);

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
