"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { id: number; name: string; price: number; imageUrl: string };

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setItems(data.products ?? []);
        setOpen(true);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : "/products");
  }

  return (
    <div className="search-bar" ref={boxRef}>
      <form onSubmit={submit} role="search">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder="Search for products, brands and more…"
          aria-label="Search products"
        />
        <button type="submit" aria-label="Search">🔍</button>
      </form>
      {open && (
        <div className="search-dropdown">
          {loading && <div className="search-hint">Searching…</div>}
          {!loading && items.length === 0 && q.trim().length >= 2 && (
            <div className="search-hint">No matches — press Enter to search everything.</div>
          )}
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              className="search-item"
              onClick={() => {
                setOpen(false);
                router.push(`/products/${p.id}`);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt="" />
              <span className="search-item-name">{p.name}</span>
              <span className="search-item-price">₹{Math.round(p.price / 100)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
