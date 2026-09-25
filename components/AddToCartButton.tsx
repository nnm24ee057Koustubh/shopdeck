"use client";

import { useCart, type CartItem } from "./CartProvider";

type Props = {
  product: Omit<CartItem, "qty">;
  disabled?: boolean;
  label?: string;
};

export default function AddToCartButton({ product, disabled, label = "Add to Cart" }: Props) {
  const { add } = useCart();
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={disabled}
      onClick={() => add(product, 1)}
    >
      {disabled ? "Out of Stock" : label}
    </button>
  );
}
