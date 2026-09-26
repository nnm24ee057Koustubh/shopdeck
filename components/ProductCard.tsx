import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";

export type ProductCardData = {
  id: number;
  name: string;
  price: number;
  dealPrice?: number | null;
  badge?: string | null;
  imageUrl: string;
  stock: number;
  avgRating?: number | null;
  reviewCount?: number;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const deal = product.dealPrice != null && product.dealPrice < product.price ? product.dealPrice : null;
  const savePct = deal ? Math.round(((product.price - deal) / product.price) * 100) : 0;
  return (
    <div className={`product-card ${deal ? "product-card-deal" : ""}`}>
      <WishlistButton productId={product.id} />
      {product.badge && <span className="product-badge">{product.badge}</span>}
      {deal && <span className="product-deal-tag">{savePct}% OFF</span>}
      <Link href={`/products/${product.id}`} className="product-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-card-body">
        <Link href={`/products/${product.id}`} className="product-card-name">
          {product.name}
        </Link>
        {product.stock > 0 && product.stock <= 5 && (
          <div className="stock-badge-low">Only {product.stock} left</div>
        )}
        {typeof product.avgRating === "number" && (product.reviewCount ?? 0) > 0 && (
          <div className="rating-row">
            <span className="rating-stars">
              {"★".repeat(Math.round(product.avgRating))}
              {"☆".repeat(Math.max(0, 5 - Math.round(product.avgRating)))}
            </span>
            <span className="rating-count">{product.avgRating.toFixed(1)} ({product.reviewCount})</span>
          </div>
        )}
        <div className="product-card-price">
          {deal ? (
            <>
              <span className="price-now">₹{Math.round(deal / 100)}</span>
              <span className="price-mrp">₹{Math.round(product.price / 100)}</span>
            </>
          ) : (
            <span className="price-now">₹{Math.round(product.price / 100)}</span>
          )}
        </div>
        {product.stock > 0 ? (
          <AddToCartButton product={product} />
        ) : (
          <button type="button" className="btn" disabled>
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
}
