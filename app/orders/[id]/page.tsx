import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatINR, formatDate, statusLabel } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { placed?: string };
}) {
  const user = await getSession();
  if (!user) redirect(`/login?next=/orders/${params.id}`);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();
  if (order.userId !== user.id && user.role !== "ADMIN") notFound();

  const placed = searchParams.placed === "1";
  const shipTo = [
    order.shipName,
    order.shipPhone,
    order.shipLine1,
    order.shipLine2,
    `${order.shipCity}, ${order.shipState} ${order.shipPincode}`,
  ]
    .filter((line) => line && line.trim().length > 0)
    .join("\n");

  return (
    <div>
      {placed && <div className="banner banner-success">Order placed successfully. Thank you!</div>}
      <p className="small mb-16">
        <Link href="/orders" className="muted">
          ← All my orders
        </Link>
      </p>

      <h1 className="page-title">Order #{order.id}</h1>
      <div className="mb-16" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <StatusBadge status={order.status} />
        <StatusBadge status={order.paymentStatus} kind="payment" />
        <span className="muted small">Placed {formatDate(order.createdAt)}</span>
      </div>

      <div className="cart-layout">
        <div className="form-stack">
          <div className="card">
            <h2 className="section-title mt-0">Items</h2>
            {order.items.map((item) => (
              <div className="cart-line" key={item.id}>
                <div className="stack-sm">
                  <span className="font-bold">{item.name}</span>
                  <span className="muted small">
                    {formatINR(item.price)} × {item.qty}
                  </span>
                </div>
                <div />
                <div className="text-right font-bold">{formatINR(item.price * item.qty)}</div>
              </div>
            ))}
            <div className="summary-row summary-total">
              <span>Total (incl. shipping)</span>
              <span>{formatINR(order.total)}</span>
            </div>
          </div>

          <div className="card">
            <h2 className="section-title mt-0">Status timeline</h2>
            <ul className="timeline">
              {order.events.map((event) => (
                <li key={event.id} className="timeline-item">
                  <div className="font-bold">{statusLabel(event.status)}</div>
                  <div className="muted small">
                    {formatDate(event.createdAt)}
                    {event.note ? ` — ${event.note}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="form-stack">
          <div className="card">
            <h2 className="section-title mt-0">Delivery address</h2>
            <p style={{ whiteSpace: "pre-line" }}>{shipTo}</p>
          </div>

          <div className="card">
            <h2 className="section-title mt-0">Payment</h2>
            <div className="summary-row">
              <span>Method</span>
              <span>{order.paymentMethod === "COD" ? "Cash on Delivery" : "Razorpay (online)"}</span>
            </div>
            <div className="summary-row">
              <span>Payment status</span>
              <span>
                <StatusBadge status={order.paymentStatus} kind="payment" />
              </span>
            </div>
            {order.razorpayPaymentId && (
              <div className="summary-row">
                <span>Payment ID</span>
                <span className="small">{order.razorpayPaymentId}</span>
              </div>
            )}
            {order.payments.map((payment) => (
              <div key={payment.id} className="summary-row">
                <span>
                  {payment.method} · {payment.status}
                </span>
                <span>{formatINR(payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
