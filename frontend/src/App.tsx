import { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSection from './components/HeroSection';
import SevaSection from './components/SevaSection';
import DonationForm from './components/DonationForm';
import AboutSection from './components/AboutSection';
import OperationsPortal from './components/OperationsPortal';
import AdminPortal from './components/AdminPortal';
import AccountPortal from './components/AccountPortal';
import { apiRequest } from './lib/api';
import ReceiptLookupModal from './components/ReceiptLookupModal';
import PaymentModeNotice from './components/PaymentModeNotice';
import { CartProvider } from './hooks/useCart';
import { isTabId, type TabId } from './types';

/**
 * Single page, four sections, no router. The active tab is mirrored into the
 * URL hash so a devotee can bookmark or share "the sevas page" — but the hash
 * is only ever read on load, so switching tabs stays instant.
 */
function readTabFromHash(): TabId {
  const hash = window.location.hash.replace('#', '');
  return isTabId(hash) ? hash : 'home';
}

type SiteSettings = {
  announcement: string;
  hero_title: string;
  booking_enabled: boolean;
  donations_enabled: boolean;
  contact_phone: string;
  temple_image_url?: string;
};

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>(readTabFromHash);
  const [largeText, setLargeText] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [site, setSite] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const fetchSite = () => {
      apiRequest<SiteSettings>('/api/site/settings').then(setSite).catch(() => {});
    };
    fetchSite();
    window.addEventListener('ganesh:image-updated', fetchSite);
    return () => window.removeEventListener('ganesh:image-updated', fetchSite);
  }, [activeTab]);

  const navigate = (tab: TabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', tab === 'home' ? ' ' : `#${tab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep back/forward and manual hash edits working.
  useEffect(() => {
    const onHashChange = () => setActiveTab(readTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className={`flex min-h-screen flex-col transition-all ${largeText ? 'senior-text-mode' : ''}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-maroon-900 focus:px-4 focus:py-2 focus:text-cream-50"
      >
        Skip to main content
      </a>

      <Header
        activeTab={activeTab}
        onNavigate={navigate}
        onOpenLookup={() => setLookupOpen(true)}
        largeText={largeText}
        onToggleLargeText={() => setLargeText((v) => !v)}
        templeImageUrl={site?.temple_image_url}
      />

      {site?.announcement && (
        <div className="bg-gold-100 border-b border-gold-300">
          <div className="container-page py-2 text-center text-xs sm:text-sm font-semibold text-maroon-900">
            {site.announcement} {site.contact_phone&&<span> · Contact: {site.contact_phone}</span>}
          </div>
        </div>
      )}
      {(activeTab === 'sevas' || activeTab === 'donate') && <PaymentModeNotice />}

      <main id="main" className="flex-1">
        {activeTab === 'home' && (
          <>
            {site?.hero_title && (
              <div className="bg-cream-100 py-2 text-center font-bold text-maroon-950">
                {site.hero_title}
              </div>
            )}
            <HeroSection onNavigate={navigate} templeImageUrl={site?.temple_image_url} />
          </>
        )}

        {activeTab !== 'home' && (
          <div className="container-page py-10 sm:py-14">
            {activeTab === 'sevas' && (site?.booking_enabled===false ? <div className="card p-6">Seva booking is temporarily unavailable.</div> : <SevaSection />)}
            {activeTab === 'donate' && (site?.donations_enabled===false ? <div className="card p-6">Donations are temporarily unavailable.</div> : <DonationForm />)}
            {activeTab === 'about' && <AboutSection />}
            {activeTab === 'staff' && <OperationsPortal />}
            {activeTab === 'admin' && <AdminPortal />}
            {activeTab === 'account' && <AccountPortal />}
          </div>
        )}
      </main>

      <Footer onNavigate={navigate} />

      <ReceiptLookupModal
        isOpen={lookupOpen}
        onClose={() => setLookupOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <AppShell />
    </CartProvider>
  );
}
