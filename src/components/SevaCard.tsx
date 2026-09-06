import { rupees } from '../lib/format';
import type { Seva } from '../data/sevas';

interface SevaCardProps {
  seva: Seva;
  selected: boolean;
  onToggle: (id: string) => void;
}

/**
 * One seva row. Price is right-aligned so a devotee can scan the price column
 * straight down the list; caveats sit inline as small chips rather than being
 * buried in fine print at the bottom of the page.
 */
export default function SevaCard({ seva, selected, onToggle }: SevaCardProps) {
  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:gap-5 sm:p-5 ${
        selected ? 'border-maroon-300 bg-maroon-50/60' : 'border-maroon-100 bg-white hover:border-maroon-200'
      }`}
    >
      <div className="min-w-0 flex-1">
        <h4 className="font-display text-lg font-semibold leading-snug text-maroon-900">{seva.name}</h4>

        {(seva.timing || seva.note || seva.exceptEkadashi) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {seva.timing && (
              <span className="inline-flex items-center gap-1.5 text-sm text-maroon-800/80">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 1.8" strokeLinecap="round" />
                </svg>
                {seva.timing}
              </span>
            )}
            {seva.note && <span className="text-sm text-maroon-800/70">{seva.note}</span>}
            {seva.exceptEkadashi && (
              <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-medium text-gold-800">
                Except on Ekadashi
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <p className="font-display text-xl font-semibold tabular-nums text-maroon-900 sm:w-32 sm:text-right">
          {rupees(seva.price)}
        </p>

        <button
          onClick={() => onToggle(seva.id)}
          aria-pressed={selected}
          className={`shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
            selected
              ? 'border border-maroon-300 bg-white text-maroon-800 hover:bg-maroon-50'
              : 'bg-maroon-800 text-cream-50 hover:bg-maroon-900'
          }`}
        >
          {selected ? (
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Added
            </span>
          ) : (
            'Add'
          )}
        </button>
      </div>

      <span className="sr-only">
        {selected ? `${seva.name} is in your seva list.` : ''}
      </span>
    </li>
  );
}
