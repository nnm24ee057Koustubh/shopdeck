"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { formatINR } from "@/lib/format";

type Me = { id: number; email: string; name: string; phone: string | null; role: string };
type CheckoutConfig = { razorpayEnabled: boolean; storeName: string; upiVpa: string };

type Address = {
  shipName: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
};

const EMPTY_ADDRESS: Address = {
  shipName: "",
  shipPhone: "",
  shipLine1: "",
  shipLine2: "",
  shipCity: "",
  shipState: "",
  shipPincode: "",
};

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; contact?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const FREE_SHIPPING_THRESHOLD = 49900;
const SHIPPING_FEE = 4900;

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();

  const [me, setMe] = useState<Me | null>(null);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [method, setMethod] = useState<"RAZORPAY" | "COD">("RAZORPAY");
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.status === 401) {
          router.replace("/login?next=/checkout");
          return;
        }
        const meData: { user?: Me } = await meRes.json();
        const user = meData.user ?? null;
        if (cancelled) return;
        setMe(user);
        if (user) {
          setAddress((a) => ({
            ...a,
            shipName: user.name ?? "",
            shipPhone: user.phone ?? "",
          }));
        }
        const cfgRes = await fetch("/api/orders");
        const cfg: CheckoutConfig = await cfgRes.json();
        if (cancelled) return;
        setConfig(cfg);
        setMethod(cfg.razorpayEnabled ? "RAZORPAY" : "COD");
      } catch {
        if (!cancelled) setError("Could not load checkout. Please refresh and try again.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  const addressValid = useMemo(
    () =>
      address.shipName.trim().length > 0 &&
      address.shipPhone.trim().length >= 10 &&
      address.shipLine1.trim().length > 0 &&
      address.shipCity.trim().length > 0 &&
      address.shipState.trim().length > 0 &&
      /^\d{6}$/.test(address.shipPincode.trim()),
    [address]
  );

  function update(field: keyof Address, value: string) {
    setAddress((a) => ({ ...a, [field]: value }));
  }

  async function placeOrder() {
    setError("");
    if (cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!addressValid) {
      setError("Please fill in all address fields (pincode must be 6 digits).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ productId: i.id, qty: i.qty })),
          address,
          method,
        }),
      });
      const data: {
        orderId?: number;
        razorpayOrderId?: string;
        amount?: number;
        keyId?: string;
        error?: string;
      } = await res.json();

      if (!res.ok || !data.orderId) {
        setError(data.error ?? "Could not place the order. Please try again.");
        setBusy(false);
        return;
      }

      if (method === "COD") {
        cart.clear();
        router.push(`/orders/${data.orderId}?placed=1`);
        return;
      }

      // Razorpay flow
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setError("Could not load Razorpay checkout. Please retry, or choose Cash on Delivery.");
        setBusy(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: data.keyId ?? "",
        amount: data.amount ?? total,
        currency: "INR",
        name: config?.storeName ?? "ShopDeck",
        description: `Order #${data.orderId}`,
        order_id: data.razorpayOrderId ?? "",
        prefill: {
          name: address.shipName,
          contact: address.shipPhone,
          email: me?.email,
        },
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          try {
            const vres = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (vres.ok) {
              cart.clear();
              router.push(`/orders/${data.orderId}?placed=1`);
            } else {
              setError(
                "Payment verification failed. If money was deducted from your account it will be auto-refunded by the bank."
              );
              setBusy(false);
            }
          } catch {
            setError("Payment verification failed. Please contact support with your payment details.");
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      rzp.open();
    } catch {
      setError("Something went wrong while placing the order. Please try again.");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="empty-state">
        <p>Loading checkout…</p>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-title">Your cart is empty</div>
        <p>Add some products before checking out.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Checkout</h1>
      {error && <div className="banner banner-error">{error}</div>}

      <div className="cart-layout">
        <div className="form-stack">
          <div className="card">
            <h2 className="section-title mt-0">Delivery address</h2>
            <div className="form-stack">
              <div className="form-grid">
                <div>
                  <label htmlFor="shipName">Full name</label>
                  <input
                    id="shipName"
                    type="text"
                    value={address.shipName}
                    onChange={(e) => update("shipName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="shipPhone">Phone</label>
                  <input
                    id="shipPhone"
                    type="tel"
                    value={address.shipPhone}
                    onChange={(e) => update("shipPhone", e.target.value)}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="shipLine1">Address line 1</label>
                <input
                  id="shipLine1"
                  type="text"
                  value={address.shipLine1}
                  onChange={(e) => update("shipLine1", e.target.value)}
                  placeholder="House / flat number, street"
                  required
                />
              </div>
              <div>
                <label htmlFor="shipLine2">Address line 2 (optional)</label>
                <input
                  id="shipLine2"
                  type="text"
                  value={address.shipLine2}
                  onChange={(e) => update("shipLine2", e.target.value)}
                  placeholder="Landmark, area"
                />
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="shipCity">City</label>
                  <input
                    id="shipCity"
                    type="text"
                    value={address.shipCity}
                    onChange={(e) => update("shipCity", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="shipState">State</label>
                  <input
                    id="shipState"
                    type="text"
                    value={address.shipState}
                    onChange={(e) => update("shipState", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="shipPincode">Pincode</label>
                <input
                  id="shipPincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={address.shipPincode}
                  onChange={(e) => update("shipPincode", e.target.value)}
                  placeholder="6-digit pincode"
                  required
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="section-title mt-0">Payment method</h2>
            {config?.razorpayEnabled ? (
              <div className="form-stack">
                <label className={`radio-option ${method === "RAZORPAY" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="method"
                    checked={method === "RAZORPAY"}
                    onChange={() => setMethod("RAZORPAY")}
                  />
                  <span>
                    <span className="radio-title">Pay online with Razorpay (UPI / Cards / Netbanking)</span>
                    <span className="radio-desc">
                      Secure payment via Razorpay. Your order is approved instantly after payment.
                    </span>
                  </span>
                </label>
                <label className={`radio-option ${method === "COD" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="method"
                    checked={method === "COD"}
                    onChange={() => setMethod("COD")}
                  />
                  <span>
                    <span className="radio-title">Cash on Delivery</span>
                    <span className="radio-desc">
                      Pay in cash when the order is delivered. The store will confirm your order first.
                    </span>
                  </span>
                </label>
              </div>
            ) : (
              <div className="form-stack">
                <label className="radio-option selected">
                  <input type="radio" name="method" checked readOnly />
                  <span>
                    <span className="radio-title">Cash on Delivery</span>
                    <span className="radio-desc">
                      Pay in cash when the order is delivered. The store will confirm your order first.
                    </span>
                  </span>
                </label>
                <div className="banner banner-info">
                  Online payments coming soon — admin has not configured Razorpay yet.
                  {config?.upiVpa ? ` You can also UPI the exact amount to ${config.upiVpa}.` : ""}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mt-0">Order summary</h2>
          {cart.items.map((i) => (
            <div className="summary-row" key={i.id}>
              <span>
                {i.name} × {i.qty}
              </span>
              <span>{formatINR(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? "FREE" : formatINR(shipping)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block mt-16"
            disabled={busy}
            onClick={placeOrder}
          >
            {busy
              ? "Placing order…"
              : method === "COD"
                ? `Place order · ${formatINR(total)}`
                : `Pay ${formatINR(total)} online`}
          </button>
          <p className="small muted mt-8">
            {me ? `Ordering as ${me.email}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
