import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getSettings, razorpayConfigured } from "@/lib/settings";
import { validateCoupon } from "@/lib/coupons";
import { sendMail, notifyAdmin, orderEmailBody } from "@/lib/email";

const FREE_SHIPPING_THRESHOLD = 49900; // ₹499 in paise
const SHIPPING_FEE = 4900; // ₹49 in paise

// GET returns the checkout payment configuration (used by the checkout page).
export async function GET() {
  const settings = await getSettings();
  const configured = await razorpayConfigured();
  return NextResponse.json({
    razorpayEnabled: Boolean(configured),
    storeName: settings.storeName,
    upiVpa: settings.upiVpa ?? "",
    razorpayMeUrl: settings.razorpayMeUrl ?? "",
  });
}

type ParsedItem = { productId: number; qty: number };

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to place an order." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  // --- items ---
  const rawItems = Array.isArray(b.items) ? b.items : [];
  const merged = new Map<number, number>();
  for (const raw of rawItems) {
    const it = (raw ?? {}) as Record<string, unknown>;
    const productId = Number(it.productId);
    const qty = Number(it.qty);
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: "Invalid product in cart." }, { status: 400 });
    }
    if (!Number.isInteger(qty) || qty <= 0 || qty > 99) {
      return NextResponse.json({ error: "Invalid quantity." }, { status: 400 });
    }
    merged.set(productId, Math.min(99, (merged.get(productId) ?? 0) + qty));
  }
  const items: ParsedItem[] = Array.from(merged.entries()).map(([productId, qty]) => ({
    productId,
    qty,
  }));
  if (items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  // --- address ---
  const a = (b.address ?? {}) as Record<string, unknown>;
  const s = (v: unknown): string => String(v ?? "").trim();
  const address = {
    shipName: s(a.shipName),
    shipPhone: s(a.shipPhone),
    shipLine1: s(a.shipLine1),
    shipLine2: s(a.shipLine2),
    shipCity: s(a.shipCity),
    shipState: s(a.shipState),
    shipPincode: s(a.shipPincode),
  };
  if (
    !address.shipName ||
    address.shipPhone.length < 10 ||
    !address.shipLine1 ||
    !address.shipCity ||
    !address.shipState ||
    !/^\d{6}$/.test(address.shipPincode)
  ) {
    return NextResponse.json({ error: "Please provide a complete delivery address." }, { status: 400 });
  }

  // --- method ---
  const method = String(b.method ?? "");
  if (method !== "COD" && method !== "RAZORPAY") {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  // --- recompute prices server-side from the DB ---
  const ids = items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true } });
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { error: "Some items in your cart are no longer available." },
        { status: 400 }
      );
    }
    if (product.stock < item.qty) {
      return NextResponse.json(
        {
          error: `Only ${product.stock} unit${product.stock === 1 ? "" : "s"} of “${product.name}” left in stock.`,
        },
        { status: 400 }
      );
    }
  }

  const subtotal = items.reduce((sum, i) => sum + (byId.get(i.productId)?.price ?? 0) * i.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  // --- coupon (validated again on the server) ---
  const couponCode = String(b.couponCode ?? "").trim();
  let discount = 0;
  if (couponCode) {
    const result = await validateCoupon(couponCode, subtotal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    discount = result.discount;
    await db.coupon.update({
      where: { code: result.code },
      data: { usedCount: { increment: 1 } },
    }).catch(() => undefined);
  }

  const total = Math.max(0, subtotal + shipping - discount);

  // --- create the order ---
  const last = await db.order.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const orderId = (last?.id ?? 0) + 1;

  const order = await db.order.create({
    data: {
      id: orderId,
      userId: user.id,
      status: "PLACED",
      total,
      couponCode: couponCode || null,
      discount,
      paymentMethod: method,
      paymentStatus: method === "COD" ? "COD_PENDING" : "PENDING",
      ...address,
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          name: byId.get(i.productId)!.name,
          price: byId.get(i.productId)!.price,
          qty: i.qty,
        })),
      },
      events: {
        create: {
          status: "PLACED",
          note: method === "COD" ? "Order placed — Cash on Delivery" : "Order placed — awaiting online payment",
        },
      },
    },
  });

  // Reserve stock.
  await Promise.all(
    items.map((i) =>
      db.product.update({
        where: { id: i.productId },
        data: { stock: { decrement: i.qty } },
      })
    )
  );

  // Email notifications (skipped automatically if GMAIL_USER/GMAIL_APP_PASSWORD are not set).
  try {
    const em = await orderEmailBody(order.id);
    if (em?.customerEmail) {
      await sendMail(
        em.customerEmail,
        `Order #${order.id} placed — thank you!`,
        `Hi ${order.shipName},\n\nThanks for your order!\n\n${em.body}\n\nWe will confirm your order shortly. You can track it on the website.`
      );
      await notifyAdmin(
        `New order #${order.id} — ${method === "COD" ? "Cash on Delivery" : "online payment"}`,
        `You have received a new order.\n\n${em.body}`
      );
    }
  } catch {
    // never block order creation on email failure
  }

  // --- COD: done ---
  if (method === "COD") {
    return NextResponse.json({ orderId: order.id });
  }

  // --- Razorpay: create a gateway order ---
  const config = await razorpayConfigured();
  if (!config) {
    return NextResponse.json(
      { error: "Online payments are not configured yet. Please choose Cash on Delivery." },
      { status: 400 }
    );
  }

  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  let rzpOrder: { id?: string };
  try {
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: total,
        currency: "INR",
        receipt: String(order.id),
        payment_capture: 1,
      }),
    });
    rzpOrder = (await rzpRes.json()) as { id?: string };
    if (!rzpRes.ok || !rzpOrder.id) {
      throw new Error("Razorpay order creation failed");
    }
  } catch {
    // Keep the order for reconciliation but tell the customer to use COD.
    return NextResponse.json(
      { error: "Could not reach the payment gateway. Please try again or choose Cash on Delivery." },
      { status: 502 }
    );
  }

  await db.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: rzpOrder.id },
  });

  return NextResponse.json({
    orderId: order.id,
    razorpayOrderId: rzpOrder.id,
    amount: total,
    keyId: config.keyId,
  });
}
