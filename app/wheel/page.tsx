"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WHEEL_PRIZES } from "@/lib/wheel";

const SEG = 360 / WHEEL_PRIZES.length;

type SpinResult = {
  prize: string;
  hasCoupon: boolean;
  couponCode: string;
  description: string;
};

export default function WheelPage() {
  const [signedIn, setSignedIn] = useState(true);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [previous, setPrevious] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/wheel/spin")
      .then((r) => r.json())
      .then((d) => {
        setSignedIn(Boolean(d.signedIn));
        setAlreadySpun(Boolean(d.spun));
        if (d.spun && d.prize) {
          setPrevious({ prize: d.prize, hasCoupon: Boolean(d.couponCode), couponCode: d.couponCode ?? "", description: "" });
        }
      })
      .catch(() => setSignedIn(false));
  }, []);

  async function spin() {
    setError("");
    setResult(null);
    setCopied(false);
    if (alreadySpun) {
      setError("You have already used your spin. One spin per account!");
      return;
    }
    setSpinning(true);
    try {
      const res = await fetch("/api/wheel/spin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not spin. Please try again.");
        setSpinning(false);
        setAlreadySpun(true);
        return;
      }
      // Rotate the wheel so the winning segment lands under the pointer.
      const index = WHEEL_PRIZES.findIndex((p) => p.label === data.prize);
      const target = 360 * 5 + (360 - (index * SEG + SEG / 2)) + (Math.random() * 20 - 10);
      setRotation(target);
      setTimeout(() => {
        setResult(data);
        setSpinning(false);
        setAlreadySpun(true);
      }, 4200);
    } catch {
      setError("Could not spin. Please try again.");
      setSpinning(false);
    }
  }

  function copyCode() {
    if (result?.couponCode) {
      navigator.clipboard?.writeText(result.couponCode).catch(() => undefined);
      setCopied(true);
    }
  }

  const gradient = WHEEL_PRIZES.map((p, i) => `${p.color} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(", ");

  return (
    <div className="wheel-page">
      <h1 className="page-title">🎡 Spin & Win</h1>
      <p className="muted">
        One spin per account. Win a personal coupon code and use it at checkout — valid for 30 days.
      </p>
      {error && <div className="banner banner-error">{error}</div>}

      {!signedIn ? (
        <div className="empty-state">
          <div className="empty-title">Sign in to spin</div>
          <p>
            <Link href="/login?next=/wheel">Log in</Link> or{" "}
            <Link href="/register?next=/wheel">create an account</Link> to get your spin.
          </p>
        </div>
      ) : (
        <div className="wheel-wrap">
          <div className="wheel-pointer">▼</div>
          <div
            ref={wheelRef}
            className="wheel"
            style={{
              background: `conic-gradient(${gradient})`,
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {WHEEL_PRIZES.map((p, i) => (
              <span
                key={i}
                className="wheel-label"
                style={{
                  transform: `rotate(${i * SEG + SEG / 2}deg) translateY(-105px)`,
                  color: p.text,
                }}
              >
                {p.label}
              </span>
            ))}
          </div>

          <button type="button" className="btn btn-primary wheel-btn" onClick={spin} disabled={spinning || alreadySpun}>
            {spinning ? "Spinning…" : alreadySpun ? "Already spun" : "SPIN THE WHEEL"}
          </button>

          {result && (
            <div className={`card wheel-result ${result.hasCoupon ? "wheel-won" : "wheel-nowin"}`}>
              {result.hasCoupon ? (
                <>
                  <h2>🎉 You won: {result.prize}!</h2>
                  <p>{result.description}</p>
                  <div className="coupon-code" onClick={copyCode} title="Click to copy">
                    {result.couponCode}
                  </div>
                  <p className="small muted">
                    {copied ? "Copied! " : "Tap the code to copy. "}
                    Use it at checkout.
                  </p>
                  <Link href="/products" className="btn btn-primary">
                    Start shopping →
                  </Link>
                </>
              ) : (
                <>
                  <h2>{result.prize} 😅</h2>
                  <p>No coupon this time — but there are always great prices on the store.</p>
                  <Link href="/products" className="btn btn-outline">
                    Browse products
                  </Link>
                </>
              )}
            </div>
          )}

          {previous && !result && (
            <div className="card wheel-result">
              <h2>Your spin</h2>
              <p>
                {previous.prize}
                {previous.couponCode ? (
                  <>
                    {" "}— your coupon code:{" "}
                    <span className="coupon-code" onClick={copyCode}>
                      {previous.couponCode}
                    </span>
                  </>
                ) : (
                  " — no coupon this time."
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
