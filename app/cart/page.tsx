"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatINR } from "@/lib/format";

const FREE_SHIPPING_THRESHOLD = 49900; // ₹499 in paise
const SHIPPING_FEE = 4900; // ₹49 in paise

export default function CartPage() {
  const { items, updateQty, remove, count } = useCart();

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-title">Your cart is empty</div>
        <p>Browse the catalogue and add something you love.</p>
        <p className="mt-16">
          <Link href="/products" className="btn btn-primary">
            Start shopping
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">
        Your cart <span className="muted font-normal">({count} item{count === 1 ? "" : "s"})</span>
      </h1>
      <div className="cart-layout">
        <div className="card">
          {items.map((item) => (
            <div className="cart-line" key={item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.name} />
              <div>
                <div className="cart-line-name">{item.name}</div>
                <div className="muted small">{formatINR(item.price)} each</div>
                <div className="mt-8">
                  <div className="qty-stepper">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      disabled={item.qty <= 1}
                      onClick={() => updateQty(item.id, item.qty - 1)}
                    >
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      disabled={item.qty >= 99}
                      onClick={() => updateQty(item.id, item.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatINR(item.price * item.qty)}</div>
                <button type="button" className="btn btn-danger-outline btn-sm mt-8" onClick={() => remove(item.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="section-title mt-0">Order summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? "FREE" : formatINR(shipping)}</span>
          </div>
          {shipping > 0 && (
            <p className="small muted">
              Add {formatINR(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.
            </p>
          )}
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
          <Link href="/checkout" className="btn btn-primary btn-block mt-16">
            Proceed to Checkout
          </Link>
          <p className="small muted mt-8 text-right">
            <Link href="/products">Continue shopping</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
