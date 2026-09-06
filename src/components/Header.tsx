import { useState } from 'react';
import { temple } from '../data/temple';
import { useCart } from '../hooks/useCart';
import { KalashIcon } from './Ornaments';
import type { TabId } from '../types';

const NAV: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'sevas', label: 'Sevas' },
  { id: 'donate', label: 'Donate' },
  { id: 'about', label: 'About & Contact' },
];

interface HeaderProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

export default function Header({ activeTab, onNavigate }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();

  const go = (tab: TabId) => {
    onNavigate(tab);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-maroon-100 bg-cream-50/95 backdrop-blur supports-[backdrop-filter]:bg-cream-50/80">
      {/* Trust strip — the official-site claim is the first thing a devotee sees. */}
      <div className="bg-maroon-900 text-cream-100">
        <div className="container-page flex items-center justify-center gap-2 py-1.5 text-center text-[11px] sm:text-xs">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
          <span>{temple.officialSiteNote}</span>
        </div>
      </div>

      <div className="container-page flex h-16 items-center justify-between gap-4 sm:h-20">
        <button
          onClick={() => go('home')}
          className="flex items-center gap-3 text-left"
          aria-label={`${temple.name} — go to home`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-300 bg-cream-100 text-maroon-800 sm:h-11 sm:w-11">
            <KalashIcon className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold leading-tight text-maroon-900 sm:text-xl">
              {temple.name}
            </span>
            <span className="hidden text-[11px] uppercase tracking-[0.14em] text-gold-700 sm:block">
              {temple.festival} Sevas
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === item.id
                  ? 'bg-maroon-800 text-cream-50'
                  : 'text-maroon-800 hover:bg-maroon-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Cart is reachable from every section, never hidden. */}
          {count > 0 && (
            <button
              onClick={() => go('sevas')}
              className="flex items-center gap-2 rounded-lg border border-gold-300 bg-gold-50 px-3 py-2.5 text-sm font-semibold text-maroon-900 hover:bg-gold-100"
            >
              <span aria-hidden="true">🛕</span>
              <span className="hidden sm:inline">Sevas selected</span>
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-maroon-800 px-1.5 text-xs text-cream-50">
                {count}
              </span>
            </button>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg border border-maroon-200 p-2.5 text-maroon-800 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-maroon-100 bg-cream-50 lg:hidden" aria-label="Mobile">
          <div className="container-page flex flex-col py-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`rounded-lg px-4 py-3.5 text-left text-base font-semibold ${
                  activeTab === item.id ? 'bg-maroon-800 text-cream-50' : 'text-maroon-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
