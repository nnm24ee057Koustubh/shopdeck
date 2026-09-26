import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/products?ids=1,2,3 — returns active products (all, or by ids).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  const products = await db.product.findMany({
    where: ids.length > 0 ? { id: { in: ids }, active: true } : { active: true },
    orderBy: { createdAt: "desc" },
    take: ids.length > 0 ? 100 : 12,
    select: { id: true, name: true, price: true, imageUrl: true, stock: true },
  });

  return NextResponse.json({ products });
}
