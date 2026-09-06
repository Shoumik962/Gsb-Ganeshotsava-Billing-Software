import { useCart } from '../hooks/useCart';
import { rupees } from '../lib/format';
import { LotusIcon } from './Ornaments';

interface CartSummaryProps {
  onCheckout: () => void;
  /** Rendered inside the mobile drawer, where the panel supplies its own frame. */
  variant?: 'sidebar' | 'drawer';
}

/**
 * Running list of selected sevas with a visible total. The total is never
 * hidden behind a step — the devotee sees the exact amount before they ever
 * reach the payment screen.
 */
export default function CartSummary({ onCheckout, variant = 'sidebar' }: CartSummaryProps) {
  const { items, total, removeFromCart, clearCart, count } = useCart();

  return (
    <div className={variant === 'sidebar' ? 'card p-5' : 'p-5'}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-maroon-900">
          <LotusIcon className="h-5 w-5 text-gold-600" />
          Your Sevas
        </h3>
        {count > 0 && (
          <button
            onClick={clearCart}
            className="text-sm font-medium text-maroon-700 underline underline-offset-2 hover:text-maroon-900"
          >
            Clear all
          </button>
        )}
      </div>

      {count === 0 ? (
        <p className="mt-4 rounded-lg bg-cream-100 px-4 py-5 text-sm leading-relaxed text-maroon-800/75">
          No sevas selected yet. Choose any seva from the list and it will appear here with a
          running total.
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-maroon-100">
            {items.map((seva) => (
              <li key={seva.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-maroon-900">{seva.name}</p>
                  {seva.timing && (
                    <p className="mt-0.5 text-xs text-maroon-800/65">{seva.timing}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-maroon-900">
                    {rupees(seva.price)}
                  </span>
                  <button
                    onClick={() => removeFromCart(seva.id)}
                    className="rounded-md p-1.5 text-maroon-600 hover:bg-maroon-50 hover:text-maroon-900"
                    aria-label={`Remove ${seva.name}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t-2 border-maroon-200 pt-4">
            <span className="text-sm font-semibold uppercase tracking-wide text-maroon-800">
              Total
            </span>
            <span className="font-display text-2xl font-semibold tabular-nums text-maroon-900">
              {rupees(total)}
            </span>
          </div>

          <button onClick={onCheckout} className="btn-primary mt-4 w-full">
            Proceed to Checkout
          </button>

          <p className="mt-3 text-center text-xs leading-relaxed text-maroon-800/65">
            You will see a full review of every seva and the total before any payment is made.
          </p>
        </>
      )}
    </div>
  );
}
