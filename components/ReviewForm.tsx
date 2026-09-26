"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm({
  productId,
  signedIn,
  existing,
}: {
  productId: number;
  signedIn: boolean;
  existing: { rating: number; text: string } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(existing?.text ?? "");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <p className="small muted">
        <a href="/login?next=/products">Sign in</a> to write a review.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the review.");
        setBusy(false);
        return;
      }
      setOk("Thank you! Your review has been saved.");
      setBusy(false);
      router.refresh();
    } catch {
      setError("Could not save the review. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="form-stack review-form" onSubmit={submit}>
      {error && <div className="banner banner-error">{error}</div>}
      {ok && <div className="banner banner-success">{ok}</div>}
      <div className="star-picker" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={n <= (hover || rating) ? "star filled" : "star"}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
          >
            ★
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="review-text">Your review</label>
        <textarea
          id="review-text"
          rows={3}
          maxLength={1000}
          required
          placeholder="What did you like or dislike?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
        {busy ? "Saving…" : existing ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}
