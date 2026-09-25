import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const users = await db.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: { orders: true },
  });

  const rows = users.map((u) => {
    const lifetimeValue = u.orders
      .filter(
        (o) =>
          (o.paymentMethod === "RAZORPAY" && o.paymentStatus === "PAID") ||
          (o.paymentMethod === "COD" && o.status === "DELIVERED")
      )
      .reduce((sum, o) => sum + o.total, 0);
    return { ...u, orderCount: u.orders.length, lifetimeValue };
  });

  return (
    <div>
      <h1 className="page-title">Customers</h1>
      <p className="page-subtitle">
        {rows.length} registered customer{rows.length === 1 ? "" : "s"}
      </p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th className="table-right">Orders</th>
              <th className="table-right">Lifetime value</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No customers yet.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id}>
                  <td className="font-bold">{u.name}</td>
                  <td className="small">{u.email}</td>
                  <td className="small">{u.phone ?? "—"}</td>
                  <td className="small muted">{formatDate(u.createdAt)}</td>
                  <td className="table-right">{u.orderCount}</td>
                  <td className="table-right font-bold">{formatINR(u.lifetimeValue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
