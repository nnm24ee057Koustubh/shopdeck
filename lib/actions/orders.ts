"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatINR, statusLabel, statusTransitionAllowed } from "@/lib/format";

type ItemSnapshot = { productId: number | null; qty: number }[];

async function restockItems(items: ItemSnapshot) {
  for (const item of items) {
    if (item.productId !== null) {
      await db.product
        .update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        })
        .catch(() => undefined); // product may have been deleted
    }
  }
}

function revalidateOrder(orderId: number) {
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/money");
  revalidatePath("/admin/customers");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const orderId = parseInt(String(formData.get("orderId") ?? ""), 10);
  const status = String(formData.get("status") ?? "").trim();
  if (!Number.isInteger(orderId) || orderId <= 0 || !status) return;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { productId: true, qty: true } } },
  });
  if (!order || !statusTransitionAllowed(order.status, status)) return;

  if (status === "CANCELLED" || status === "REJECTED") {
    await restockItems(order.items);
  }

  await db.order.update({ where: { id: orderId }, data: { status } });

  // COD money is collected on delivery.
  if (order.paymentMethod === "COD" && status === "DELIVERED" && order.paymentStatus !== "PAID") {
    await db.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID" } });
    await db.payment.create({
      data: {
        orderId,
        method: "COD",
        amount: order.total,
        status: "PAID",
        ref: "COLLECTED_ON_DELIVERY",
      },
    });
  }

  await db.orderEvent.create({
    data: { orderId, status, note: `Status changed to ${statusLabel(status)} by admin` },
  });

  revalidateOrder(orderId);
}

export async function approveOrder(formData: FormData): Promise<void> {
  await requireAdmin();

  const orderId = parseInt(String(formData.get("orderId") ?? ""), 10);
  if (!Number.isInteger(orderId) || orderId <= 0) return;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PLACED") return;

  await db.order.update({ where: { id: orderId }, data: { status: "APPROVED" } });
  await db.orderEvent.create({
    data: {
      orderId,
      status: "APPROVED",
      note:
        order.paymentMethod === "COD"
          ? "Order approved by admin — Cash on Delivery confirmed"
          : "Order approved by admin",
    },
  });

  revalidateOrder(orderId);
}

export async function rejectOrder(formData: FormData): Promise<void> {
  await requireAdmin();

  const orderId = parseInt(String(formData.get("orderId") ?? ""), 10);
  if (!Number.isInteger(orderId) || orderId <= 0) return;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { productId: true, qty: true } } },
  });
  if (!order || order.status !== "PLACED") return;

  await restockItems(order.items);
  await db.order.update({ where: { id: orderId }, data: { status: "REJECTED" } });
  await db.orderEvent.create({
    data: { orderId, status: "REJECTED", note: "Order rejected by admin — stock returned" },
  });

  revalidateOrder(orderId);
}

export async function refundOrder(formData: FormData): Promise<void> {
  await requireAdmin();

  const orderId = parseInt(String(formData.get("orderId") ?? ""), 10);
  const reason = String(formData.get("reason") ?? "").trim() || "Admin-initiated refund";
  if (!Number.isInteger(orderId) || orderId <= 0) return;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus !== "PAID") return;

  await db.refund.create({
    data: { orderId, amount: order.total, reason },
  });
  await db.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
  await db.orderEvent.create({
    data: {
      orderId,
      status: order.status,
      note: `Refund of ${formatINR(order.total)} issued — ${reason}`,
    },
  });

  revalidateOrder(orderId);
}

export async function recordSettlement(formData: FormData): Promise<void> {
  await requireAdmin();

  const rupees = parseFloat(String(formData.get("amount") ?? ""));
  const note = String(formData.get("note") ?? "").trim();
  const settledOnRaw = String(formData.get("settledOn") ?? "").trim();

  if (!Number.isFinite(rupees) || rupees <= 0) {
    redirect("/admin/money");
  }

  const settledOn = settledOnRaw ? new Date(`${settledOnRaw}T00:00:00`) : new Date();
  if (Number.isNaN(settledOn.getTime())) {
    redirect("/admin/money");
  }

  await db.settlement.create({
    data: { amount: Math.round(rupees * 100), note: note || "Bank settlement", settledOn },
  });

  revalidatePath("/admin/money");
  redirect("/admin/money?settled=1");
}
