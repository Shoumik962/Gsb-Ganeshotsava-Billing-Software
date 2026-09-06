import { useEffect, useState } from 'react';
import { useCart } from '../hooks/useCart';
import { rupees } from '../lib/format';
import CartSummary from './CartSummary';

/**
 * Mobile cart: a sticky bottom bar that always shows the count and running
 * total, expanding into a drawer with the full list. Hidden on desktop, where
 * the sidebar CartSummary is always on screen instead.
 */
export default function CartDrawer({ onCheckout }: { onCheckout: () => void }) {
  const { count, total } = useCart();
  const [open, setOpen] = useState(false);

  // Don't leave an empty drawer open after the last seva is removed.
  useEffect(() => {
    if (count === 0) setOpen(false);
  }, [count]);

  // Lock background scroll while the drawer is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (count === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-maroon-200 bg-cream-50 shadow-lift lg:hidden">
        <div className="container-page flex items-center gap-3 py-3">
          <button
            onClick={() => setOpen(true)}
            className="min-w-0 flex-1 text-left"
            aria-expanded={open}
          >
            <span className="block text-xs font-medium text-maroon-800/75">
              {count} {count === 1 ? 'seva' : 'sevas'} selected · view list
            </span>
            <span className="block font-display text-xl font-semibold tabular-nums text-maroon-900">
              {rupees(total)}
            </span>
          </button>
          <button onClick={onCheckout} className="btn-primary shrink-0 px-5 py-3">
            Checkout
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Selected sevas">
          <button
            className="absolute inset-0 bg-maroon-950/50"
            onClick={() => setOpen(false)}
            aria-label="Close seva list"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-2xl bg-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-maroon-100 bg-white px-5 py-3">
              <span className="text-sm font-semibold text-maroon-900">Selected Sevas</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-maroon-700 hover:bg-maroon-50"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <CartSummary
              variant="drawer"
              onCheckout={() => {
                setOpen(false);
                onCheckout();
              }}
            />
            {/* Clears the sticky bar so the last row stays tappable. */}
            <div className="h-20" />
          </div>
        </div>
      )}
    </>
  );
}
