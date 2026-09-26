"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccount({
  email,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (isAdmin) return null; // the owner account cannot be deleted

  if (done) {
    return (
      <div className="card form-stack danger-zone">
        <h2 className="section-title mt-0">Account deleted</h2>
        <p className="muted">
          Your account has been permanently deleted. You can close this page or create a new
          account anytime.
        </p>
        <a href="/" className="btn btn-primary">Back to the store</a>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, emailConfirmation, confirmText, acknowledged }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete the account. Please try again.");
        setBusy(false);
        return;
      }
      try {
        window.localStorage.removeItem("unic_cart");
        window.localStorage.removeItem("unic_wishlist");
      } catch {
        // ignore
      }
      setDone(true);
      setBusy(false);
      router.refresh();
    } catch {
      setError("Could not delete the account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="card form-stack danger-zone">
      <h2 className="section-title mt-0">Delete account</h2>
      <p className="muted small">
        This permanently removes your account and personal data. This action cannot be undone —
        it requires four confirmations for your safety.
      </p>
      {!open ? (
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
          I want to delete my account
        </button>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          {error && <div className="banner banner-error">{error}</div>}
          <div>
            <label htmlFor="del-password">1 · Confirm your password</label>
            <input
              id="del-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="del-email">2 · Type your account email ({email})</label>
            <input
              id="del-email"
              type="email"
              required
              value={emailConfirmation}
              onChange={(e) => setEmailConfirmation(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="del-confirm">3 · Type the word DELETE</label>
            <input
              id="del-confirm"
              type="text"
              required
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              4 · I understand this is permanent and cannot be undone
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn btn-danger" disabled={busy}>
              {busy ? "Deleting…" : "Permanently delete my account"}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
