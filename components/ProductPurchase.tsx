"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

type Props = {
  product: { id: number; name: string; price: number; imageUrl: string };
  stock: number;
};

export default function ProductPurchase({ product, stock }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const outOfStock = stock <= 0;
  const max = Math.min(stock, 99);

  return (
    <div>
      <div className="qty-stepper">
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={outOfStock || qty <= 1}
          onClick={() => setQty((q) => Math.max(1, q - 1))}
        >
          −
        </button>
        <span>{qty}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={outOfStock || qty >= max}
          onClick={() => setQty((q) => Math.min(max, q + 1))}
        >
          +
        </button>
      </div>
      <div className="mt-16" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={outOfStock}
          onClick={() => {
            add(product, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
        {added && <span className="stock-ok">Added to cart ✓</span>}
      </div>
    </div>
  );
}
