import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import ProductPurchase from "@/components/ProductPurchase";
import ProductCard from "@/components/ProductCard";
import ShareWhatsApp from "@/components/ShareWhatsApp";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const product = await db.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product || !product.active) notFound();

  const related = await db.product.findMany({
    where: {
      active: true,
      id: { not: product.id },
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const stockClass =
    product.stock <= 0 ? "stock-out" : product.stock < 5 ? "stock-low" : "stock-ok";
  const stockText =
    product.stock <= 0
      ? "Out of stock"
      : product.stock < 5
        ? `Only ${product.stock} left in stock`
        : `In stock (${product.stock} available)`;

  return (
    <div>
      <p className="small mb-16">
        <Link href="/products" className="muted">
          ← Back to all products
        </Link>
      </p>
      <div className="product-detail">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="detail-image" src={product.imageUrl} alt={product.name} />

        <div>
          {product.category && (
            <Link href={`/products?cat=${product.category.slug}`} className="chip chip-active">
              {product.category.name}
            </Link>
          )}
          <h1>{product.name}</h1>
          <div className={stockClass}>{stockText}</div>
          <div className="price-lg">{formatINR(product.price)}</div>
          <p className="muted" style={{ whiteSpace: "pre-line" }}>
            {product.description}
          </p>
          <div className="mt-24">
            <ProductPurchase
              product={{
                id: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
              }}
              stock={product.stock}
            />
          </div>
          <div className="mt-16">
            <ShareWhatsApp text={`${product.name} — ${formatINR(product.price)} on Unic`} />
          </div>
          <p className="small muted mt-16">
            Free delivery on orders above ₹499 · Pay online or Cash on Delivery
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="section-title">You may also like</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
