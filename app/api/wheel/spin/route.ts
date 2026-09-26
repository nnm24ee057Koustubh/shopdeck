import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { pickPrize, spinCouponDescription } from "@/lib/wheel";

export const dynamic = "force-dynamic";

// GET — has this account already spun?
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ signedIn: false, spun: false });
  }
  const spin = await db.wheelSpin.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    signedIn: true,
    spun: Boolean(spin),
    prize: spin?.prize ?? null,
    couponCode: spin?.couponCode ?? null,
  });
}

// POST — spin the wheel (once per account, ever).
export async function POST() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to spin the wheel." }, { status: 401 });
  }

  const existing = await db.wheelSpin.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json(
      { error: "You have already spun the wheel. One spin per account!" },
      { status: 409 }
    );
  }

  const prize = pickPrize();
  let couponCode = "";

  if (prize.couponType) {
    // Personal one-time coupon so it cannot be shared around.
    couponCode = `SPIN-${randomBytes(4).toString("hex").toUpperCase()}`;
    await db.coupon.create({
      data: {
        code: couponCode,
        type: prize.couponType,
        value: prize.value,
        minOrder: prize.minOrder,
        active: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  await db.wheelSpin.create({
    data: { userId: user.id, prize: prize.label, couponCode },
  });

  return NextResponse.json({
    prize: prize.label,
    hasCoupon: Boolean(couponCode),
    couponCode,
    description: couponCode ? spinCouponDescription(prize) : "",
    couponType: prize.couponType,
    value: prize.value,
    minOrder: prize.minOrder,
  });
}
