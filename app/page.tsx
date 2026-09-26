import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import DealCountdown from "@/components/DealCountdown";
import { withRatings } from "@/lib/ratings";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

const CATEGORY_EMOJI: Record<string, string> = {
  electronics: "🎧",
  fashion: "👕",
  home: "🏠",
  beauty: "💄",
  sports: "🏏",
};

export default async function HomePage() {
  const [categories, rawNew, rawTop] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { reviews: { select: { rating: true } } },
    }),
    db.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      include: { reviews: { select: { rating: true } } },
      take: 40,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const newArrivals = withRatings(rawNew);
  const top = withRatings(rawTop)
    .filter((p) => (p.reviewCount ?? 0) > 0)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    .slice(0, 4);
  const bestsellers = top.length > 0 ? top : newArrivals.slice(0, 4);

  // Deal of the Day: an active product with a deal price lower than its price.
  const dealRaw = await db.product.findFirst({
    where: { active: true, stock: { gt: 0 }, dealPrice: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  const deal = dealRaw && dealRaw.dealPrice !== null && dealRaw.dealPrice < dealRaw.price ? dealRaw : null;

  return (
    <div>
      <section className="hero">
        <h1>Unique finds for everything you love.</h1>
        <p>
          Electronics, fashion, home, beauty and sports — at fair prices, delivered across India.
          Pay online or choose Cash on Delivery.
        </p>
        <Link href="/products" className="btn">
          Shop all products →
        </Link>
        <div className="hero-actions">
          <Link href="/wheel" className="hero-wheel-cta">
            🎡 Spin & Win a coupon — one free spin per account
          </Link>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-inner">
          <div className="trust-item"><span>🚚</span> Free delivery above ₹499</div>
          <div className="trust-item"><span>🔒</span> 100% secure payments</div>
          <div className="trust-item"><span>💵</span> Cash on Delivery available</div>
          <div className="trust-item"><span>↩️</span> Easy order support</div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Shop by category</h2>
        <div className="cat-tiles">
          {categories.map((c) => (
            <Link key={c.id} href={`/products?cat=${c.slug}`} className="cat-tile">
              <span className="cat-tile-emoji">{CATEGORY_EMOJI[c.slug] ?? "🛍️"}</span>
              <span className="cat-tile-name">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {deal && (
        <section className="deal-banner">
          <div className="deal-banner-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={deal.imageUrl} alt={deal.name} />
          </div>
          <div className="deal-banner-body">
            <div className="deal-tag">⚡ DEAL OF THE DAY</div>
            <h2>{deal.name}</h2>
            <div className="deal-pricing">
              <span className="deal-price">{formatINR(deal.dealPrice!)}</span>
              <span className="deal-mrp">{formatINR(deal.price)}</span>
              <span className="deal-save">
                {Math.round(((deal.price - deal.dealPrice!) / deal.price) * 100)}% OFF
              </span>
            </div>
            <DealCountdown />
            <Link href={`/products/${deal.id}`} className="btn btn-primary">
              Grab the deal →
            </Link>
          </div>
        </section>
      )}

      {bestsellers.length > 0 && (
        <section>
          <h2 className="section-title">⭐ Top picks</h2>
          <div className="product-grid">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">New arrivals</h2>
        {newArrivals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No products yet</div>
            <p>Check back soon — the store is being stocked.</p>
          </div>
        ) : (
          <div className="product-grid">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
