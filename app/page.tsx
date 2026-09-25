import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      <section className="hero">
        <h1>Everything you love, in one deck.</h1>
        <p>
          Electronics, fashion, home, beauty and sports — at fair prices, delivered across India.
          Pay online or choose Cash on Delivery.
        </p>
        <Link href="/products" className="btn">
          Shop all products →
        </Link>
      </section>

      <section>
        <div className="chips">
          <Link href="/products" className="chip chip-active">
            All
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/products?cat=${c.slug}`} className="chip">
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <h2 className="section-title">Featured products</h2>
      {featured.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No products yet</div>
          <p>Check back soon — the store is being stocked.</p>
        </div>
      ) : (
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
