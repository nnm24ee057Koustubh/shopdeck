import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ products: [] });

  const products = await db.product.findMany({
    where: { active: true, name: { contains: q } },
    take: 6,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, price: true, imageUrl: true },
  });

  return NextResponse.json({ products });
}
