"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { useWishlist } from "@/components/WishlistProvider";

type Product = { id: number; name: string; price: number; imageUrl: string; stock: number };

export default function WishlistPage() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [ids]);

  return (
    <div>
      <h1 className="section-title">My wishlist</h1>
      {loading ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">Your wishlist is empty</div>
          <p>Tap the ♡ on any product to save it here for later.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
