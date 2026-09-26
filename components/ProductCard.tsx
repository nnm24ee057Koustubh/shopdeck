import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";

export type ProductCardData = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  avgRating?: number | null;
  reviewCount?: number;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <div className="product-card">
      <WishlistButton productId={product.id} />
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
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: product.price % 100 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          }).format(product.price / 100)}
        </div>
        <AddToCartButton
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
          }}
          disabled={product.stock <= 0}
        />
      </div>
    </div>
  );
}
