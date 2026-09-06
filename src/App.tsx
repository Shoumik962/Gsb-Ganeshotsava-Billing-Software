import { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSection from './components/HeroSection';
import SevaSection from './components/SevaSection';
import DonationForm from './components/DonationForm';
import AboutSection from './components/AboutSection';
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

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>(readTabFromHash);

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
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-maroon-900 focus:px-4 focus:py-2 focus:text-cream-50"
      >
        Skip to main content
      </a>

      <Header activeTab={activeTab} onNavigate={navigate} />

      <main id="main" className="flex-1">
        {activeTab === 'home' && <HeroSection onNavigate={navigate} />}

        {activeTab !== 'home' && (
          <div className="container-page py-10 sm:py-14">
            {activeTab === 'sevas' && <SevaSection />}
            {activeTab === 'donate' && <DonationForm />}
            {activeTab === 'about' && <AboutSection />}
          </div>
        )}
      </main>

      <Footer onNavigate={navigate} />
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
