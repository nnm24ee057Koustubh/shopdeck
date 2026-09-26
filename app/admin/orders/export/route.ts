import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /admin/orders/export — download all orders as a CSV file.
export async function GET() {
  await requireAdmin();

  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, items: true },
  });

  const header = [
    "Order ID",
    "Date",
    "Customer",
    "Email",
    "Items",
    "Total (INR)",
    "Payment",
    "Payment status",
    "Order status",
    "Coupon",
    "Discount (INR)",
    "Ship to",
  ];

  const rows = orders.map((o) => [
    String(o.id),
    new Date(o.createdAt).toISOString(),
    o.user.name,
    o.user.email,
    o.items.map((i) => `${i.name} x${i.qty}`).join("; "),
    (o.total / 100).toFixed(2),
    o.paymentMethod,
    o.paymentStatus,
    o.status,
    o.couponCode ?? "",
    (o.discount / 100).toFixed(2),
    `${o.shipName}, ${o.shipLine1}, ${o.shipCity}, ${o.shipState} ${o.shipPincode}`,
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="unic-orders.csv"',
    },
  });
}
