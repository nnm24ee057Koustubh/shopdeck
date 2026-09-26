import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to write a review." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const productId = Number(b.productId);
  const rating = Number(b.rating);
  const text = String(b.text ?? "").trim();

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Please choose a rating from 1 to 5 stars." }, { status: 400 });
  }
  if (text.length < 3 || text.length > 1000) {
    return NextResponse.json({ error: "Review text must be between 3 and 1000 characters." }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await db.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    update: { rating, text },
    create: { productId, userId: user.id, rating, text },
  });

  return NextResponse.json({ ok: true });
}
