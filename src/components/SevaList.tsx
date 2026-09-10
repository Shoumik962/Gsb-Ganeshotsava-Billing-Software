import { useState, useMemo } from 'react';
import { categories, sevas, sevasByCategory, type SevaCategory } from '../data/sevas';
import { useCart } from '../hooks/useCart';
import SevaCard from './SevaCard';
import { rupees } from '../lib/format';

type FilterTab = 'all' | SevaCategory;

const POPULAR_SEVAS = [
  'ganahoma',
  'mahapooja-madhyanha',
  'mooda-ganapati-pooja',
  'modaka-naivedya',
  'tulabhar-kanuka',
];

export default function SevaList() {
  const { has, toggle } = useCart();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: SevaCategory) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // Filtered sevas based on search query
  const filteredSevas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return sevas.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.note && s.note.toLowerCase().includes(q)) ||
        (s.timing && s.timing.toLowerCase().includes(q)) ||
        s.price.toString().includes(q)
    );
  }, [searchQuery]);

  const visibleCategories = useMemo(() => {
    if (activeFilter === 'all') return categories;
    return categories.filter((c) => c.id === activeFilter);
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="rounded-2xl border border-gold-300/70 bg-gradient-to-r from-cream-50 via-white to-cream-50 p-4 sm:p-5 shadow-sm">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search seva by name, pooja type, or price (e.g. Ganahoma, Modak, 2500)..."
            className="field-input pl-11 pr-10 text-base shadow-sm focus:border-gold-500"
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gold-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-maroon-700 hover:bg-cream-200"
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveFilter('all');
              setSearchQuery('');
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-2xs ${
              activeFilter === 'all' && !searchQuery
                ? 'bg-maroon-800 text-cream-50 shadow'
                : 'bg-white text-maroon-900 border border-maroon-200/80 hover:bg-gold-50'
            }`}
          >
            All Sevas ({sevas.length})
          </button>

          {categories.map((cat) => {
            const catCount = sevasByCategory(cat.id).length;
            const isSelected = activeFilter === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveFilter(cat.id);
                  setSearchQuery('');
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  isSelected
                    ? 'bg-maroon-800 text-cream-50 shadow'
                    : 'bg-white text-maroon-900 border border-maroon-200/80 hover:bg-gold-50'
                }`}
              >
                {cat.label} ({catCount})
              </button>
            );
          })}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-3 border-t border-maroon-100/60 text-xs text-maroon-800/80">
          <span className="font-semibold text-gold-900">Popular:</span>
          {POPULAR_SEVAS.map((id) => {
            const seva = sevas.find((s) => s.id === id);
            if (!seva) return null;
            return (
              <button
                key={id}
                onClick={() => setSearchQuery(seva.name)}
                className="rounded-md bg-cream-100/90 border border-gold-300/50 px-2 py-0.5 text-maroon-900 hover:bg-gold-100 hover:border-gold-400 transition-colors font-medium"
              >
                {seva.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* When search is active, show matching results */}
      {filteredSevas !== null ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-maroon-900">
              Search Results ({filteredSevas.length} {filteredSevas.length === 1 ? 'seva' : 'sevas'})
            </h3>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-maroon-700 underline hover:text-maroon-950"
            >
              Show all categories
            </button>
          </div>

          {filteredSevas.length > 0 ? (
            <ul className="space-y-3">
              {filteredSevas.map((seva) => (
                <SevaCard
                  key={seva.id}
                  seva={seva}
                  selected={has(seva.id)}
                  onToggle={toggle}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-maroon-200 bg-cream-50/50 p-8 text-center">
              <p className="font-display text-lg font-semibold text-maroon-900">
                No sevas found matching “{searchQuery}”
              </p>
              <p className="mt-1 text-sm text-maroon-800/70">
                Try searching for “Ganahoma”, “Pooja”, “Naivedya” or clear the search.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="btn-secondary mt-4 text-xs py-2 px-4"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Categorized Group Accordions */
        <div className="space-y-8">
          {visibleCategories.map((category) => {
            const items = sevasByCategory(category.id);
            const isCollapsed = collapsed[category.id];
            const priceFrom = Math.min(...items.map((s) => s.price));

            return (
              <section key={category.id} aria-labelledby={`group-${category.id}`}>
                <button
                  onClick={() => toggleGroup(category.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`group-panel-${category.id}`}
                  className="group flex w-full items-start justify-between gap-4 rounded-xl border border-maroon-200/80 bg-gradient-to-r from-cream-50 via-white to-cream-50 px-5 py-4 text-left shadow-sm hover:shadow-md hover:border-gold-400 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="min-w-0">
                    <h3
                      id={`group-${category.id}`}
                      className="font-display text-2xl font-bold text-maroon-950 group-hover:text-maroon-900 transition-colors"
                    >
                      {category.label}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-maroon-900/80">{category.blurb}</p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gold-100/90 border border-gold-300/80 px-3 py-0.5 text-xs font-bold text-gold-950 shadow-2xs">
                      <span>{items.length} sevas</span>
                      <span className="text-gold-600">·</span>
                      <span>from {rupees(priceFrom)}</span>
                    </div>
                  </div>
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-100 border border-gold-300/60 group-hover:bg-maroon-800 group-hover:text-cream-50 group-hover:border-maroon-800 text-maroon-700 transition-colors">
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isCollapsed ? '' : 'rotate-180'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M6 9.5l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
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
      )}
    </div>
  );
}

