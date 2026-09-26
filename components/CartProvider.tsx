"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: number;
  name: string;
  price: number; // paise
  qty: number;
  imageUrl: string;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "unic_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (it): it is CartItem =>
                typeof it === "object" &&
                it !== null &&
                typeof (it as CartItem).id === "number" &&
                typeof (it as CartItem).name === "string" &&
                typeof (it as CartItem).price === "number" &&
                typeof (it as CartItem).qty === "number" &&
                typeof (it as CartItem).imageUrl === "string"
            )
          );
        }
      }
    } catch {
      setItems([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // storage unavailable (private mode) — cart stays in memory
      }
    }
  }, [items, loaded]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: Math.min(99, i.qty + qty) } : i
        );
      }
      return [...prev, { ...item, qty: Math.max(1, Math.min(99, qty)) }];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: number, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, Math.min(99, Math.round(qty))) } : i
      )
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      add,
      remove,
      updateQty,
      clear,
    }),
    [items, add, remove, updateQty, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a CartProvider");
  return ctx;
}
