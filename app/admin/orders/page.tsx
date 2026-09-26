import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR, formatDate, ORDER_STATUSES, allowedNextStatuses, statusLabels } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import {
  updateOrderStatus,
  approveOrder,
  rejectOrder,
  refundOrder,
} from "@/lib/actions/orders";

export const dynamic = "force-dynamic";

const ADVANCE_STATUSES = ["PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusFilter = (searchParams.status ?? "").trim();
  const validFilter = (ORDER_STATUSES as readonly string[]).includes(statusFilter)
    ? statusFilter
    : "";

  const orders = await db.order.findMany({
    where: validFilter ? { status: validFilter } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: true, items: true },
  });

  return (
    <div>
      <h1 className="page-title">Orders</h1>
      <p className="page-subtitle">
        Live ledger — every order, every action.{" "}
        <a href="/admin/orders/export" className="btn btn-outline btn-sm">⬇ Export CSV</a>
      </p>

      <div className="chips">
        <Link href="/admin/orders" className={`chip ${!validFilter ? "chip-active" : ""}`}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`chip ${validFilter === s ? "chip-active" : ""}`}
          >
            {statusLabels[s]}
          </Link>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table" style={{ minWidth: 980 }}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th className="table-right">Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  No orders{validFilter ? ` with status ${statusLabels[validFilter]}` : ""} yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const advances = allowedNextStatuses(order.status).filter((s) =>
                  (ADVANCE_STATUSES as readonly string[]).includes(s)
                );
                const cancellable = !["CANCELLED", "REJECTED", "DELIVERED"].includes(order.status);
                return (
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
                    <td className="small">
                      {order.items
                        .slice(0, 2)
                        .map((i) => `${i.name} ×${i.qty}`)
                        .join(", ")}
                      {order.items.length > 2 ? ` +${order.items.length - 2} more` : ""}
                    </td>
                    <td className="table-right font-bold">{formatINR(order.total)}</td>
                    <td>
                      <div className="small">
                        {order.paymentMethod === "COD" ? "COD" : "Razorpay"}
                      </div>
                      <StatusBadge status={order.paymentStatus} kind="payment" />
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        {order.status === "PLACED" && (
                          <>
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
                          </>
                        )}
                        {advances.length > 0 && (
                          <form action={updateOrderStatus} className="inline-form">
                            <input type="hidden" name="orderId" value={order.id} />
                            <select name="status" defaultValue={advances[0]}>
                              {advances.map((s) => (
                                <option key={s} value={s}>
                                  {statusLabels[s]}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="btn btn-sm btn-outline">
                              Set status
                            </button>
                          </form>
                        )}
                        {cancellable && (
                          <form action={updateOrderStatus}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="status" value="CANCELLED" />
                            <button type="submit" className="btn btn-sm btn-danger-outline">
                              Cancel
                            </button>
                          </form>
                        )}
                        {order.paymentStatus === "PAID" && (
                          <form action={refundOrder} className="inline-form">
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="text" name="reason" placeholder="Refund reason" required />
                            <button type="submit" className="btn btn-sm btn-danger">
                              Refund
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
