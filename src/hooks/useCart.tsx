import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { sevaById, type Seva } from '../data/sevas';

/**
 * Cart state for seva booking.
 *
 * Sevas are inherently quantity-1 — you don't book "2× Sarva Seva" — so the
 * cart is a set of seva ids, not a list of line items with counts. Everything
 * else (the resolved seva records, the total) is derived, which keeps the
 * persisted shape trivial to send to a backend later:
 *
 *   POST /api/bookings  { sevaIds: string[], devotee: {...} }
 */

interface CartContextValue {
  /** Selected seva ids, in the order they were added. */
  sevaIds: string[];
  /** Resolved seva records for rendering the cart. */
  items: Seva[];
  count: number;
  total: number;
  has: (id: string) => boolean;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  toggle: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [sevaIds, setSevaIds] = useState<string[]>([]);

  const addToCart = useCallback((id: string) => {
    if (!sevaById.has(id)) return;
    setSevaIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setSevaIds((prev) => prev.filter((s) => s !== id));
  }, []);

  const toggle = useCallback((id: string) => {
    if (!sevaById.has(id)) return;
    setSevaIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }, []);

  const clearCart = useCallback(() => setSevaIds([]), []);

  const items = useMemo(
    () => sevaIds.map((id) => sevaById.get(id)).filter((s): s is Seva => Boolean(s)),
    [sevaIds],
  );

  const total = useMemo(() => items.reduce((sum, s) => sum + s.price, 0), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      sevaIds,
      items,
      count: items.length,
      total,
      has: (id: string) => sevaIds.includes(id),
      addToCart,
      removeFromCart,
      toggle,
      clearCart,
    }),
    [sevaIds, items, total, addToCart, removeFromCart, toggle, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a <CartProvider>');
  return ctx;
}
