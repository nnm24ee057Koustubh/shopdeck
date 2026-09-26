import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { razorpayConfigured } from "@/lib/settings";
import { sendMail, notifyAdmin, orderEmailBody } from "@/lib/email";
import { formatINR } from "@/lib/format";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const orderId = Number(b.orderId);
  const razorpayOrderId = String(b.razorpay_order_id ?? "");
  const razorpayPaymentId = String(b.razorpay_payment_id ?? "");
  const razorpaySignature = String(b.razorpay_signature ?? "");

  if (!Number.isInteger(orderId) || orderId <= 0 || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  if (order.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ error: "Payment does not match this order." }, { status: 400 });
  }

  const config = await razorpayConfigured();
  if (!config) {
    return NextResponse.json({ error: "Payment gateway not configured." }, { status: 400 });
  }

  const expected = createHmac("sha256", config.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(razorpaySignature, "utf8");
  const signatureOk =
    expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);

  if (!signatureOk) {
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      status: "APPROVED",
      razorpayPaymentId,
    },
  });
  await db.payment.create({
    data: {
      orderId: order.id,
      method: "RAZORPAY",
      amount: order.total,
      status: "PAID",
      ref: razorpayPaymentId,
    },
  });
  await db.orderEvent.create({
    data: {
      orderId: order.id,
      status: "APPROVED",
      note: `Payment verified online (${razorpayPaymentId}) — order auto-approved`,
    },
  });

  // Email notifications (skipped automatically if not configured).
  try {
    const em = await orderEmailBody(order.id);
    if (em?.customerEmail) {
      await sendMail(
        em.customerEmail,
        `Payment received for order #${order.id} — thank you!`,
        `Hello ${em.customerName},\n\nWe received your payment and your order is confirmed.\n\n${em.body}\n\nWe will ship it shortly.`
      );
      await notifyAdmin(
        `PAID: order #${order.id} (${formatINR(order.total)})`,
        `An online payment was verified and the order is auto-approved.\n\n${em.body}`
      );
    }
  } catch {
    // ignore email errors
  }

  return NextResponse.json({ ok: true });
}
