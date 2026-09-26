import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { validateCoupon } from "@/lib/coupons";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to use a coupon." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const code = String(b.code ?? "");
  const subtotal = Number(b.subtotal);

  if (!Number.isInteger(subtotal) || subtotal < 0) {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }

  const result = await validateCoupon(code, subtotal);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code: result.code,
    discount: result.discount,
    description: result.description,
  });
}
