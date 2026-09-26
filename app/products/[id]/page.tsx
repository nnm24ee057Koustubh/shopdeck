import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import ProductPurchase from "@/components/ProductPurchase";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import ShareWhatsApp from "@/components/ShareWhatsApp";
import ReviewForm from "@/components/ReviewForm";
import { withRatings } from "@/lib/ratings";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      reviews: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!product || !product.active) notFound();
  const session = await getSession();
  const myReview = session
    ? product.reviews.find((r) => r.userId === session.id) ?? null
    : null;
  const avgRating = product.reviews.length
    ? Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10) / 10
    : null;

  const relatedRaw = await db.product.findMany({
    where: {
      active: true,
      id: { not: product.id },
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: { reviews: { select: { rating: true } } },
  });
  const related = withRatings(relatedRaw);

  const images = product.images
    ? product.images.split(",").map((s) => s.trim()).filter(Boolean)
    : [product.imageUrl];

  const deal =
    product.dealPrice !== null && product.dealPrice < product.price ? product.dealPrice : null;
  const savePct = deal ? Math.round(((product.price - deal) / product.price) * 100) : 0;
  const effectivePrice = deal ?? product.price;

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
        <ProductGallery images={images} alt={product.name} />

        <div>
          {product.category && (
            <Link href={`/products?cat=${product.category.slug}`} className="chip chip-active">
              {product.category.name}
            </Link>
          )}
          {product.badge && <span className="product-badge product-badge-inline">{product.badge}</span>}
          <h1>{product.name}</h1>
          {avgRating !== null && (
            <div className="rating-row">
              <span className="rating-stars">
                {"★".repeat(Math.round(avgRating))}
                {"☆".repeat(Math.max(0, 5 - Math.round(avgRating)))}
              </span>
              <span className="rating-count">
                {avgRating.toFixed(1)} · {product.reviews.length} review
                {product.reviews.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
          <div className={stockClass}>{stockText}</div>
          <div className="deal-pricing">
            <span className="deal-price">{formatINR(effectivePrice)}</span>
            {deal !== null && (
              <>
                <span className="deal-mrp">{formatINR(product.price)}</span>
                <span className="deal-save">{savePct}% OFF</span>
              </>
            )}
          </div>
          <p className="muted" style={{ whiteSpace: "pre-line" }}>
            {product.description}
          </p>
          <div className="mt-24">
            <ProductPurchase
              product={{
                id: product.id,
                name: product.name,
                price: effectivePrice,
                imageUrl: product.imageUrl,
              }}
              stock={product.stock}
            />
          </div>
          <div className="mt-16">
            <ShareWhatsApp text={`${product.name} — ${formatINR(effectivePrice)} on Unic`} />
          </div>
          <ul className="detail-perks">
            <li>🚚 Free delivery on orders above ₹499</li>
            <li>💳 Pay online (UPI / cards) or Cash on Delivery</li>
            <li>📦 Order updates straight to your account</li>
          </ul>
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

      <section className="mt-24">
        <h2 className="section-title">
          Reviews{" "}
          {avgRating !== null && (
            <span className="rating-row">
              <span className="rating-stars">
                {"★".repeat(Math.round(avgRating))}
                {"☆".repeat(Math.max(0, 5 - Math.round(avgRating)))}
              </span>
              <span className="rating-count">
                {avgRating.toFixed(1)} · {product.reviews.length} review
                {product.reviews.length === 1 ? "" : "s"}
              </span>
            </span>
          )}
        </h2>
        <div className="card review-section">
          <ReviewForm
            productId={product.id}
            signedIn={Boolean(session)}
            existing={myReview ? { rating: myReview.rating, text: myReview.text } : null}
          />
          {product.reviews.length === 0 ? (
            <p className="muted mt-16">
              No reviews yet. Be the first to share what you think!
            </p>
          ) : (
            <ul className="review-list">
              {product.reviews.map((r) => (
                <li key={r.id} className="review-item">
                  <div className="review-head">
                    <span className="rating-stars">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(Math.max(0, 5 - r.rating))}
                    </span>
                    <span className="muted small">{r.user.name}</span>
                  </div>
                  {r.text && <p className="review-text">{r.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
