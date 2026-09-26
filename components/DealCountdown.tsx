"use client";

import { useEffect, useState } from "react";

function msLeftToday(): number {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime() - now.getTime();
}

export default function DealCountdown() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    setMs(msLeftToday());
    const t = setInterval(() => setMs(msLeftToday()), 1000);
    return () => clearInterval(t);
  }, []);

  if (ms === null) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="deal-countdown" aria-label="Deal ends in">
      <span className="deal-countdown-label">Ends in</span>
      <span className="deal-countdown-box">{pad(h)}</span>:
      <span className="deal-countdown-box">{pad(m)}</span>:
      <span className="deal-countdown-box">{pad(s)}</span>
    </div>
  );
}
