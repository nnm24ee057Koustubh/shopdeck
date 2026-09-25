import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatINR, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/orders");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-title">No orders yet</div>
        <p>When you place an order it will show up here.</p>
        <p className="mt-16">
          <Link href="/products" className="btn btn-primary">
            Start shopping
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">My orders</h1>
      <div className="form-stack">
        {orders.map((order) => (
          <div key={order.id} className="card order-card">
            <div className="stack-sm">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <Link href={`/orders/${order.id}`} className="font-bold">
                  Order #{order.id}
                </Link>
                <StatusBadge status={order.status} />
                <StatusBadge status={order.paymentStatus} kind="payment" />
              </div>
              <div className="muted small">
                {formatDate(order.createdAt)} · {order.items.reduce((n, i) => n + i.qty, 0)} item
                {order.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"} ·{" "}
                {order.paymentMethod === "COD" ? "Cash on Delivery" : "Paid online"}
              </div>
              <div className="muted small nowrap">
                {order.items
                  .slice(0, 3)
                  .map((i) => i.name)
                  .join(", ")}
                {order.items.length > 3 ? ` +${order.items.length - 3} more` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold" style={{ fontSize: 17 }}>
                {formatINR(order.total)}
              </div>
              <Link href={`/orders/${order.id}`} className="btn btn-outline btn-sm mt-8">
                View details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
