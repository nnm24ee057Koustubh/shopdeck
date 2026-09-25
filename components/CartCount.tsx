"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export default function CartCount() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="nav-link cart-link">
      Cart
      {count > 0 && <span className="cart-badge">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
