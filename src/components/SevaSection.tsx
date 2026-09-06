import { useState } from 'react';
import SevaList from './SevaList';
import CartSummary from './CartSummary';
import CartDrawer from './CartDrawer';
import SevaCheckoutForm from './SevaCheckoutForm';
import TimingsTable from './TimingsTable';
import { SectionHeading, OrnamentalDivider } from './Ornaments';

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
    <div>
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
