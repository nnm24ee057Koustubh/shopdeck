import nodemailer from "nodemailer";
import { db } from "./db";
import { getSettings } from "./settings";
import { formatINR, statusLabel } from "./format";

const PLACEHOLDER_EMAIL = "support@shopdeck.local";

function transport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const t = transport();
  const from = process.env.GMAIL_USER;
  if (!t || !from) return; // email not configured — silently skip
  try {
    await t.sendMail({ from: `"Unic" <${from}>`, to, subject, text });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

export async function notifyAdmin(subject: string, text: string): Promise<void> {
  const settings = await getSettings();
  const to =
    settings.contactEmail && settings.contactEmail !== PLACEHOLDER_EMAIL
      ? settings.contactEmail
      : process.env.GMAIL_USER;
  if (!to) return;
  await sendMail(to, subject, text);
}

export async function orderEmailBody(
  orderId: number
): Promise<{ customerEmail: string | null; customerName: string; body: string } | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  if (!order) return null;
  const lines = [
    `Order #${order.id}`,
    ...order.items.map((i) => `  - ${i.name} x ${i.qty} — ${formatINR(i.price * i.qty)}`),
    `Total: ${formatINR(order.total)} (${order.paymentMethod === "COD" ? "Cash on Delivery" : "Online payment"})`,
    `Ship to: ${order.shipName}, ${order.shipLine1}${order.shipLine2 ? `, ${order.shipLine2}` : ""}, ${order.shipCity}, ${order.shipState} ${order.shipPincode} (Ph: ${order.shipPhone})`,
  ];
  return {
    customerEmail: order.user.email,
    customerName: order.user.name,
    body: lines.join("\n"),
  };
}

export async function notifyCustomerStatus(orderId: number, status: string): Promise<void> {
  const em = await orderEmailBody(orderId);
  if (!em?.customerEmail) return;
  const label = statusLabel(status);
  await sendMail(
    em.customerEmail,
    `Your Unic order #${orderId} is now ${label}`,
    `Hello ${em.customerName},\n\nYour order status has been updated.\n\n${em.body}\n\nCurrent status: ${label}\n\nThank you for shopping with us.`
  );
}
