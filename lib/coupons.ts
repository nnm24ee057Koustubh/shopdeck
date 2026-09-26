import { db } from "@/lib/db";

export type CouponResult =
  | { ok: true; code: string; discount: number; description: string }
  | { ok: false; error: string };

// Validates a coupon code against a subtotal (in paise) and returns the discount.
export async function validateCoupon(rawCode: string, subtotal: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return { ok: false, error: "This coupon is not valid." };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (subtotal < coupon.minOrder) {
    const min = coupon.minOrder / 100;
    return { ok: false, error: `This coupon needs a minimum order of ₹${min}.` };
  }

  let discount: number;
  let description: string;
  if (coupon.type === "PERCENT") {
    discount = Math.floor((subtotal * coupon.value) / 100);
    discount = Math.min(discount, subtotal);
    description = `${coupon.value}% off`;
  } else {
    discount = Math.min(coupon.value, subtotal);
    description = `₹${(coupon.value / 100).toFixed(0)} off`;
  }

  return { ok: true, code: coupon.code, discount, description };
}

export function couponDescription(type: string, value: number, minOrder: number): string {
  const main = type === "PERCENT" ? `${value}% off` : `₹${(value / 100).toFixed(0)} off`;
  return minOrder > 0 ? `${main} (min ₹${minOrder / 100})` : main;
}
