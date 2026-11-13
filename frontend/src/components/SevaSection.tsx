import { useState } from 'react';
import SevaList from './SevaList';
import CartSummary from './CartSummary';
import CartDrawer from './CartDrawer';
import SevaCheckoutForm from './SevaCheckoutForm';
import TimingsTable from './TimingsTable';
import { SectionHeading, OrnamentalDivider } from './Ornaments';
import heroDeityImage from '../assets/heroDeityImage.jpeg';

/**
 * The seva flow: browse and select from the list, with the cart always visible
 * (sidebar on desktop, sticky bar on mobile), then a checkout view that covers
 * the whole cart at once.
 */
export default function SevaSection() {
  const [checkingOut, setCheckingOut] = useState(false);

  const openCheckout = () => {
    setCheckingOut(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (checkingOut) {
    return <SevaCheckoutForm onBack={() => setCheckingOut(false)} />;
  }

  return (
    <div className="relative isolate">
      {/* Sacred atmospheric background with softly blurred Ganpati Bappa and warm gradient aura */}
      <div className="pointer-events-none absolute -top-8 -bottom-12 left-1/2 -translate-x-1/2 w-screen max-w-7xl overflow-hidden -z-10" aria-hidden="true">
        {/* Ambient warm radial golden glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[550px] w-[800px] rounded-full bg-gradient-to-b from-gold-300/25 via-gold-200/10 to-transparent blur-3xl opacity-70" />
        
        {/* Softly blurred Lord Ganesha deity presence */}
        <div className="absolute top-4 right-0 w-full sm:w-2/3 lg:w-1/2 h-[680px] opacity-[0.13] overflow-hidden">
          <img
            src={heroDeityImage}
            alt=""
            className="h-full w-full object-cover object-[52%_20%] filter blur-sm scale-105"
            style={{
              maskImage: 'radial-gradient(ellipse 85% 85% at 65% 35%, #000 25%, rgba(0,0,0,0.5) 60%, transparent 95%)',
              WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 65% 35%, #000 25%, rgba(0,0,0,0.5) 60%, transparent 95%)',
            }}
          />
        </div>
      </div>

      <SectionHeading
        eyebrow="Ganeshotsava"
        title="Book a Seva"
        subtitle="Choose any sevas you wish to offer. Each one you add appears in your seva list with its exact price, and you can review everything together before paying."
      />

      <OrnamentalDivider className="my-9" />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10">
        <div className="min-w-0">
          <SevaList />
        </div>

        {/* Desktop: cart stays in view while the devotee scrolls the list. */}
        <aside className="hidden lg:sticky lg:top-28 lg:block">
          <CartSummary onCheckout={openCheckout} />
        </aside>
      </div>

      <OrnamentalDivider className="my-14" icon="kalash" />

      <TimingsTable />

      {/* Mobile: sticky total bar + expandable drawer. Padding keeps the last
          seva row clear of the bar. */}
      <div className="h-24 lg:hidden" aria-hidden="true" />
      <CartDrawer onCheckout={openCheckout} />
    </div>
  );
}
