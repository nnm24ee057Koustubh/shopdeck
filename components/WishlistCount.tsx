"use client";

import Link from "next/link";
import { useWishlist } from "./WishlistProvider";

export default function WishlistCount() {
  const { count } = useWishlist();
  return (
    <Link href="/wishlist" className="nav-link cart-link">
      Wishlist
      {count > 0 && <span className="cart-badge">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
