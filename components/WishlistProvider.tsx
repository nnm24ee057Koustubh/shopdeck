"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "unic_wishlist";

type WishlistContextValue = {
  ids: number[];
  has: (id: number) => boolean;
  toggle: (id: number) => void;
  count: number;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const persist = (next: number[]) => {
    setIds(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const has = (id: number) => ids.includes(id);
  const toggle = (id: number) =>
    persist(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  return (
    <WishlistContext.Provider value={{ ids, has, toggle, count: ids.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
