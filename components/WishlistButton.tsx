"use client";

import { useWishlist } from "./WishlistProvider";

export default function WishlistButton({ productId }: { productId: number }) {
  const { has, toggle } = useWishlist();
  const active = has(productId);
  return (
    <button
      type="button"
      aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
      className={`wishlist-btn ${active ? "wishlist-active" : ""}`}
      onClick={() => toggle(productId)}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
