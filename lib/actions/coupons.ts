"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function createCoupon(formData: FormData): Promise<void> {
  await requireAdmin();

  const redirectTo = String(formData.get("redirectTo") ?? "/admin/coupons");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "PERCENT");
  const valueRupees = parseFloat(String(formData.get("value") ?? "0"));
  const minOrderRupees = parseFloat(String(formData.get("minOrder") ?? "0"));
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

  if (!/^[A-Z0-9]{3,20}$/.test(code)) {
    redirect(`${redirectTo}?error=code`);
  }
  if (type !== "PERCENT" && type !== "FLAT") {
    redirect(`${redirectTo}?error=type`);
  }
  if (!Number.isFinite(valueRupees) || valueRupees <= 0) {
    redirect(`${redirectTo}?error=value`);
  }
  if (type === "PERCENT" && (valueRupees < 1 || valueRupees > 90)) {
    redirect(`${redirectTo}?error=percent`);
  }

  const value = type === "PERCENT" ? Math.round(valueRupees) : Math.round(valueRupees * 100);
  const minOrder = Math.round((Number.isFinite(minOrderRupees) ? minOrderRupees : 0) * 100);
  const expiresAt = expiresAtRaw ? new Date(`${expiresAtRaw}T23:59:59`) : null;

  const existing = await db.coupon.findUnique({ where: { code } });
  if (existing) {
    redirect(`${redirectTo}?error=duplicate`);
  }

  await db.coupon.create({ data: { code, type, value, minOrder, expiresAt } });
  revalidatePath("/admin/coupons");
  redirect(`${redirectTo}?saved=1`);
}

export async function toggleCoupon(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id) || id <= 0) return;
  const coupon = await db.coupon.findUnique({ where: { id } });
  if (!coupon) return;
  await db.coupon.update({ where: { id }, data: { active: !coupon.active } });
  revalidatePath("/admin/coupons");
}
