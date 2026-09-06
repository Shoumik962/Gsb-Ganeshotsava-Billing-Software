import { useState } from 'react';
import { categories, sevasByCategory, type SevaCategory } from '../data/sevas';
import { useCart } from '../hooks/useCart';
import SevaCard from './SevaCard';
import { rupees } from '../lib/format';

/**
 * The full seva catalogue, grouped by category. Groups are collapsible so the
 * list stays scannable on a phone; all are open by default on first paint so
 * nothing is hidden from someone who simply scrolls.
 */
export default function SevaList() {
  const { has, toggle } = useCart();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: SevaCategory) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-10">
      {categories.map((category) => {
        const items = sevasByCategory(category.id);
        const isCollapsed = collapsed[category.id];
        const priceFrom = Math.min(...items.map((s) => s.price));

        return (
          <section key={category.id} aria-labelledby={`group-${category.id}`}>
            <button
              onClick={() => toggleGroup(category.id)}
              aria-expanded={!isCollapsed}
              aria-controls={`group-panel-${category.id}`}
              className="flex w-full items-start justify-between gap-4 rounded-xl border border-maroon-100 bg-cream-50 px-4 py-4 text-left hover:bg-cream-200/60 sm:px-5"
            >
              <div className="min-w-0">
                <h3
                  id={`group-${category.id}`}
                  className="font-display text-2xl font-semibold text-maroon-900"
                >
                  {category.label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-maroon-800/75">{category.blurb}</p>
                <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-gold-700">
                  {items.length} sevas · from {rupees(priceFrom)}
                </p>
              </div>
              <svg
                viewBox="0 0 24 24"
                className={`mt-1 h-5 w-5 shrink-0 text-maroon-700 transition-transform ${
                  isCollapsed ? '' : 'rotate-180'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M6 9.5l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {!isCollapsed && (
              <ul id={`group-panel-${category.id}`} className="mt-4 space-y-3">
                {items.map((seva) => (
                  <SevaCard
                    key={seva.id}
                    seva={seva}
                    selected={has(seva.id)}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
