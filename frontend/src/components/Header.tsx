import { useState } from 'react';
import { temple } from '../data/temple';
import { useCart } from '../hooks/useCart';
import heroDeityImage from '../assets/heroDeityImage.jpeg';
import {
  ReceiptIcon,
  TempleIcon,
  HomeIcon,
  HeartHandIcon,
  InfoIcon,
  PhoneIcon,
  UserCheckIcon,
} from './Icons';
import { LotusIcon } from './Ornaments';
import type { TabId } from '../types';

interface NavItem {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: HomeIcon },
  { id: 'sevas', label: 'Sevas', shortLabel: 'Sevas', icon: LotusIcon },
  { id: 'donate', label: 'Offer Daan', shortLabel: 'Donate', icon: HeartHandIcon },
  { id: 'about', label: 'About & Contact', shortLabel: 'About', icon: InfoIcon },
  { id: 'staff', label: 'Staff Operations', shortLabel: 'Staff', icon: UserCheckIcon },
  { id: 'admin', label: 'Admin Portal', shortLabel: 'Admin', icon: UserCheckIcon },
  { id: 'account', label: 'My Account', shortLabel: 'Account', icon: UserCheckIcon },
];

interface HeaderProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  onOpenLookup: () => void;
  largeText: boolean;
  onToggleLargeText: () => void;
  templeImageUrl?: string;
}

export default function Header({
  activeTab,
  onNavigate,
  onOpenLookup,
  largeText,
  onToggleLargeText,
  templeImageUrl,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();
  const deitySrc = templeImageUrl
    ? (templeImageUrl.startsWith('http') ? templeImageUrl : `${import.meta.env.VITE_API_URL || ''}${templeImageUrl}`)
    : heroDeityImage;

  const go = (tab: TabId) => {
    onNavigate(tab);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gold-300/60 bg-cream-50/95 backdrop-blur-md supports-[backdrop-filter]:bg-cream-50/85 shadow-sm transition-all">
      {/* Top Banner Strip: Live Counter Status + Official Trust + Helpline + Accessibility Toggle */}
      <div className="bg-gradient-to-r from-maroon-950 via-maroon-900 to-maroon-950 text-cream-100 border-b border-gold-800/40">
        <div className="container-page flex items-center justify-between gap-2 py-1.5 text-[11px] sm:text-xs">
          {/* Live Status indicator */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-emerald-300/30" />
            </span>
            <span className="font-medium text-cream-100 flex items-center gap-1.5">
              <span className="text-gold-300 font-bold uppercase tracking-wider text-[10px] bg-maroon-800/80 px-1.5 py-0.5 rounded border border-gold-500/30">
                Portal
              </span>
              <span className="text-cream-50 truncate max-w-[200px] sm:max-w-none">Devotee Portal · Wadala Ganeshotsav</span>
            </span>
          </div>

          {/* Quick Helpline & Accessibility Controls */}
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3 ml-auto">
            <a
              href={`tel:${temple.phone.replace(/\s/g, '')}`}
              className="hidden md:inline-flex items-center gap-1.5 text-cream-200/90 hover:text-gold-300 transition-colors"
            >
              <PhoneIcon className="h-3 w-3 text-gold-400 shrink-0" />
              <span>Helpline: {temple.phone}</span>
            </a>

            <span className="hidden md:inline text-gold-700/80">|</span>

            {/* Senior font size button */}
            <button
              onClick={onToggleLargeText}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-maroon-800/80 px-2.5 py-0.5 text-[11px] font-bold text-gold-300 hover:bg-maroon-700 hover:border-gold-400 transition-all shadow-2xs active:scale-95"
              title="Toggle Large Text for Senior Citizens & Easier Reading"
              aria-label="Toggle text size"
            >
              <span className="font-serif font-bold text-xs">Aa</span>
              <span>{largeText ? 'Standard' : 'Larger Font'}</span>
            </button>

            <span className="hidden lg:inline text-cream-200/40">|</span>
            <span className="hidden lg:inline font-medium text-gold-300/90 tracking-wide text-[11px] truncate max-w-[220px] xl:max-w-none">
              {temple.trustName}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="container-page flex h-16 sm:h-20 items-center justify-between gap-3 lg:gap-4">
        {/* Brand / Logo Section */}
        <button
          onClick={() => go('home')}
          className="group flex shrink-0 items-center gap-2.5 sm:gap-3 text-left focus:outline-none"
          aria-label={`${temple.name} — return to home`}
        >
          {/* Ornate Deity Crest with Gold Halo Frame */}
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-gold-400 to-gold-200 opacity-60 blur-[2px] group-hover:opacity-100 transition-opacity" />
            <div className="relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center overflow-hidden rounded-full border-2 border-gold-400 bg-cream-100 shadow-md ring-1 ring-maroon-900/10">
              <img
                src={deitySrc}
                alt={temple.name}
                className="h-full w-full object-cover object-[52%_25%] transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center shrink-0">
            <span className="font-display text-base sm:text-lg xl:text-xl font-bold leading-tight text-maroon-950 group-hover:text-maroon-800 transition-colors whitespace-nowrap">
              {temple.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-gold-900">
                Dwarkanath Bhavan · {temple.festival}
              </span>
            </div>
          </div>
        </button>

        {/* Center Floating Pill Navigation */}
        <nav
          className="hidden items-center rounded-full border border-gold-300/70 bg-cream-100/90 p-1 shadow-inner backdrop-blur-sm lg:flex shrink-0"
          aria-label="Main Navigation"
        >
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 rounded-full px-2.5 py-1.5 2xl:px-3.5 2xl:py-2 text-xs 2xl:text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-maroon-800 via-maroon-900 to-maroon-800 text-cream-50 shadow-md shadow-maroon-950/20'
                    : 'text-maroon-900/85 hover:bg-white hover:text-maroon-950 hover:shadow-2xs'
                }`}
                title={item.label}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    isActive ? 'text-gold-300' : 'text-gold-700'
                  }`}
                />
                <span className="hidden 2xl:inline">{item.label}</span>
                <span className="2xl:hidden">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Find Receipt & Seva Cart & Mobile Toggle */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {/* E-Receipt & Booking Lookup Pill Button */}
          <button
            onClick={onOpenLookup}
            className="group relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-gold-400/90 bg-gradient-to-b from-gold-50 via-gold-100/80 to-gold-200/90 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-maroon-950 shadow-sm hover:from-gold-100 hover:to-gold-300 hover:border-gold-500 hover:shadow-md transition-all active:scale-95 whitespace-nowrap shrink-0"
            title="Search past seva bookings and print official e-receipt"
          >
            <ReceiptIcon className="h-4 w-4 text-gold-800 group-hover:scale-110 transition-transform shrink-0" />
            <span className="hidden sm:inline">Find Receipt</span>
            <span className="sm:hidden">Receipt</span>
          </button>

          {/* Cart button */}
          {count > 0 && (
            <button
              onClick={() => go('sevas')}
              className="flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-full border border-maroon-700 bg-gradient-to-r from-maroon-800 to-maroon-900 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-cream-50 shadow-md hover:from-maroon-700 hover:to-maroon-800 transition-all active:scale-95 animate-fade-up whitespace-nowrap"
              title="View your selected Sevas"
            >
              <TempleIcon className="h-4 w-4 text-gold-300 shrink-0" />
              <span className="hidden sm:inline">Sevas</span>
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gold-400 px-1.5 text-xs font-extrabold text-maroon-950 shadow-inner">
                {count}
              </span>
            </button>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-300/80 bg-cream-100/80 p-2 text-maroon-900 hover:bg-cream-200 hover:border-gold-400 transition-colors lg:hidden shadow-2xs"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Redesigned Mobile Drawer Menu */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-gold-300/70 bg-gradient-to-b from-cream-50 via-white to-cream-50 shadow-xl lg:hidden animate-fade-up"
          aria-label="Mobile Navigation"
        >
          <div className="container-page py-4 space-y-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-base font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-maroon-800 to-maroon-900 text-cream-50 shadow-md'
                      : 'text-maroon-900 hover:bg-cream-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-gold-300' : 'text-gold-700'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="text-xs font-semibold text-gold-300 uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-2 border-t border-maroon-100">
              <button
                onClick={() => {
                  onOpenLookup();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-gold-400 bg-gold-50/90 px-4 py-3 text-left text-base font-bold text-maroon-950 shadow-sm hover:bg-gold-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ReceiptIcon className="h-5 w-5 text-gold-800" />
                  <span>Find Booking & E-Receipt</span>
                </div>
                <span className="text-xs text-gold-900 font-semibold">Search →</span>
              </button>
            </div>

            {/* Quick Contact snippet in mobile drawer */}
            <div className="mt-3 rounded-xl bg-cream-100/80 p-3.5 border border-gold-300/50 text-xs text-maroon-900/80 flex items-center justify-between">
              <div>
                <p className="font-bold text-maroon-950">{temple.name}</p>
                <p className="text-[11px] text-maroon-800/70">{temple.officeHours}</p>
              </div>
              <a
                href={`tel:${temple.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1 rounded-lg bg-maroon-800 px-3 py-1.5 text-xs font-bold text-cream-50 shadow-sm"
              >
                <PhoneIcon className="h-3 w-3 text-gold-300" />
                Call
              </a>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
