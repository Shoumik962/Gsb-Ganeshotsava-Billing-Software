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
      className={`group relative flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5 transition-all duration-300 ease-out overflow-hidden ${
        selected
          ? 'border-gold-400 bg-gradient-to-r from-gold-50/95 via-cream-50 to-gold-50/40 shadow-md ring-1 ring-gold-400/50 -translate-y-0.5'
          : 'border-maroon-100/90 bg-white/95 backdrop-blur-sm shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-maroon-950/10 hover:border-gold-400'
      }`}
    >
      {/* Golden indicator bar on the left */}
      <div
        className={`absolute left-0 inset-y-0 w-1.5 transition-all duration-300 ${
          selected
            ? 'bg-gradient-to-b from-maroon-700 via-maroon-900 to-maroon-800 opacity-100'
            : 'bg-gradient-to-b from-gold-400 to-gold-600 opacity-0 group-hover:opacity-100'
        }`}
      />

      <div className="min-w-0 flex-1 pl-1 sm:pl-0">
        <h4 className="font-display text-lg sm:text-xl font-bold leading-snug text-maroon-950 group-hover:text-maroon-900 transition-colors">
          {seva.name}
        </h4>

        {(seva.timing || seva.note || seva.exceptEkadashi) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {seva.timing && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-cream-100/90 border border-gold-300/60 px-2.5 py-1 text-xs font-semibold text-maroon-900 shadow-2xs">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 shrink-0 text-gold-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 1.8" strokeLinecap="round" />
                </svg>
                {seva.timing}
              </span>
            )}
            {seva.exceptEkadashi && (
              <span className="rounded-md bg-gold-100/90 border border-gold-300/80 px-2.5 py-1 text-xs font-bold text-gold-950 shadow-2xs">
                Except on Ekadashi
              </span>
            )}
            {seva.note && (
              <span className="text-xs font-medium text-maroon-800/80 italic">
                {seva.note}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-maroon-100/60 pt-3 sm:border-t-0 sm:pt-0 sm:justify-end">
        <p className="font-display text-2xl font-bold tabular-nums text-maroon-950 sm:w-32 sm:text-right group-hover:text-maroon-900 transition-colors">
          {rupees(seva.price)}
        </p>

        <button
          onClick={() => onToggle(seva.id)}
          aria-pressed={selected}
          className={`shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm active:scale-95 ${
            selected
              ? 'border border-maroon-300 bg-white text-maroon-900 hover:bg-maroon-50 hover:border-maroon-400'
              : 'bg-maroon-800 text-cream-50 hover:bg-maroon-900 hover:shadow-md'
          }`}
        >
          {selected ? (
            <span className="inline-flex items-center gap-1.5 font-bold">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-maroon-800" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Added
            </span>
          ) : (
            '+ Add Seva'
          )}
        </button>
      </div>

      <span className="sr-only">
        {selected ? `${seva.name} is in your seva list.` : ''}
      </span>
    </li>
  );
}
