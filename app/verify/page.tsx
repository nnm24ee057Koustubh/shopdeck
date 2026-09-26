"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const next = searchParams.get("next") || "/";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    initialEmail ? `We sent a 6-digit code to ${initialEmail}. Enter it below.` : ""
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.notRequired) {
          router.push("/login?next=" + encodeURIComponent(next));
          return;
        }
        setError(data.error ?? "Could not verify the code.");
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Could not verify. Please try again.");
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resend: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo(`A new code was sent to ${email}. It expires in 15 minutes.`);
      } else {
        setError(data.error ?? "Could not resend the code.");
      }
    } catch {
      setError("Could not resend the code.");
    }
    setBusy(false);
  }

  return (
    <div className="card auth-card">
      <h1 className="page-title">Verify your account</h1>
      {error && <div className="banner banner-error">{error}</div>}
      {info && <div className="banner banner-info">{info}</div>}
      <form className="form-stack" onSubmit={submit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="code">6-digit code</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="000000"
            className="otp-input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Verifying…" : "Verify and continue"}
        </button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={resend}>
          Resend code
        </button>
      </form>
      <p className="small muted mt-16">
        Checking your inbox? Also look in the spam folder. <Link href="/login">Back to login</Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
