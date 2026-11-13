import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

interface PaymentModeInfo {
  mode: 'test' | 'live' | 'invalid';
  configured: boolean;
  demoCheckoutEnabled?: boolean;
  freeSimulation: boolean;
  notice: string;
}

/** All checkout pages disclose test-mode status before any simulated payment. */
export default function PaymentModeNotice() {
  const [info, setInfo] = useState<PaymentModeInfo | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let active = true;
    apiRequest<PaymentModeInfo>('/api/payments/config')
      .then((config) => { if (active) setInfo(config); })
      .catch(() => { if (active) setOffline(true); });
    return () => { active = false; };
  }, []);

  if (!info && !offline) return null;
  if (info?.mode === 'live' && info.configured) return null;
  return (
    <div role="status" className="border-y border-amber-400 bg-amber-50">
      <div className="container-page py-2.5 text-center text-xs sm:text-sm font-semibold text-amber-950">
        {offline ? 'Payment server is unavailable. Do not attempt checkout until the API is connected.'
          : info?.mode === 'test' && info.configured
            ? 'RAZORPAY TEST MODE — free simulated payment, no real money collected. Receipts are stamped TEST and are not valid for seva, donation or tax purposes.'
            : info?.demoCheckoutEnabled ? 'LOCAL DEMO ENABLED — Test bookings generate DEMO receipts without payment. Not valid for donations, seva collection or tax use.' : info?.notice || 'Checkout is unavailable.'}
      </div>
    </div>
  );
}
