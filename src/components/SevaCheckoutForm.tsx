import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { rupees } from '../lib/format';
import { temple } from '../data/temple';
import { sevadarGuidance } from '../data/timings';
import { submitSevaBooking, type DevoteeDetails } from '../lib/api';
import { OrnamentalDivider } from './Ornaments';
import type { Seva } from '../data/sevas';

type Stage = 'details' | 'review' | 'done';

const EMPTY: DevoteeDetails = {
  name: '',
  gotra: '',
  nakshatra: '',
  phone: '',
  email: '',
  preferredDate: '',
};

export default function SevaCheckoutForm({ onBack }: { onBack: () => void }) {
  const { items, total, clearCart, count } = useCart();
  const [stage, setStage] = useState<Stage>('details');
  const [details, setDetails] = useState<DevoteeDetails>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof DevoteeDetails, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);
  // Captured before the cart is cleared, so the confirmation can still list them.
  const [booked, setBooked] = useState<{ items: Seva[]; total: number }>({ items: [], total: 0 });

  const set = (key: keyof DevoteeDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof DevoteeDetails, string>> = {};
    if (!details.name.trim()) next.name = 'Please enter the devotee’s name.';
    if (!details.phone.trim()) next.phone = 'Please enter a phone number so the temple can reach you.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePay = async () => {
    setSubmitting(true);
    const snapshot = { items: [...items], total };
    const result = await submitSevaBooking({
      sevaIds: items.map((s) => s.id),
      devotee: details,
      amount: total,
    });
    setBooked(snapshot);
    setReceiptNo(result.receiptNo);
    setSubmitting(false);
    setStage('done');
    clearCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (stage === 'done' && receiptNo) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-maroon-50 text-maroon-800">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h2 className="mt-5 font-display text-3xl font-semibold text-maroon-900">
            Seva Booking Confirmed
          </h2>
          <p className="mt-2 text-base leading-relaxed text-maroon-800/80">
            Thank you, {details.name}. Your sevas have been recorded at {temple.name}.
          </p>

          <div className="mt-6 rounded-lg bg-cream-100 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
              Receipt Number
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-maroon-900">{receiptNo}</p>
          </div>

          <ul className="mt-6 divide-y divide-maroon-100 text-left">
            {booked.items.map((seva) => (
              <li key={seva.id} className="flex items-start justify-between gap-4 py-2.5">
                <span className="text-sm text-maroon-900">{seva.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-maroon-900">
                  {rupees(seva.price)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-maroon-200 pt-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-maroon-800">
              Total Paid
            </span>
            <span className="font-display text-xl font-semibold tabular-nums text-maroon-900">
              {rupees(booked.total)}
            </span>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-maroon-800/75">
            A receipt has been sent to {details.email || 'the contact details provided'}. Please
            carry this receipt number to the seva counter, and reach the temple at least 30 minutes
            before the scheduled time.
          </p>

          <button onClick={onBack} className="btn-secondary mt-7 w-full sm:w-auto">
            Back to Sevas
          </button>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <p className="text-base text-maroon-800/80">Your seva list is empty.</p>
        <button onClick={onBack} className="btn-secondary mt-5">
          Browse Sevas
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => (stage === 'review' ? setStage('details') : onBack())}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-maroon-800 hover:text-maroon-950"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {stage === 'review' ? 'Edit details' : 'Back to seva list'}
      </button>

      {/* Two visible steps — the devotee always knows a review comes before payment. */}
      <ol className="mb-7 flex items-center gap-3 text-sm font-medium" aria-label="Checkout progress">
        {(['details', 'review'] as const).map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span
              className={`flex items-center gap-2 ${
                stage === s ? 'text-maroon-900' : 'text-maroon-800/50'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  stage === s ? 'bg-maroon-800 text-cream-50' : 'bg-maroon-100 text-maroon-700'
                }`}
              >
                {i + 1}
              </span>
              {s === 'details' ? 'Your details' : 'Review & pay'}
            </span>
            {i === 0 && <span className="h-px w-6 bg-maroon-200" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {stage === 'details' ? (
        <form onSubmit={goToReview} className="card p-5 sm:p-7" noValidate>
          <h2 className="font-display text-2xl font-semibold text-maroon-900">Devotee Details</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-maroon-800/75">
            The sankalp is made in this name. Gotra and nakshatra are optional — leave them blank
            if you are unsure and the vaidik will proceed with the name alone.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="devotee-name" className="field-label">
                Devotee’s full name <span className="text-maroon-700">*</span>
              </label>
              <input
                id="devotee-name"
                className="field-input"
                value={details.name}
                onChange={(e) => set('name', e.target.value)}
                autoComplete="name"
                aria-describedby={errors.name ? 'devotee-name-error' : undefined}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p id="devotee-name-error" className="mt-1.5 text-sm text-maroon-700">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="gotra" className="field-label">
                  Gotra <span className="font-normal text-maroon-700/60">(optional)</span>
                </label>
                <input
                  id="gotra"
                  className="field-input"
                  value={details.gotra}
                  onChange={(e) => set('gotra', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="nakshatra" className="field-label">
                  Nakshatra <span className="font-normal text-maroon-700/60">(optional)</span>
                </label>
                <input
                  id="nakshatra"
                  className="field-input"
                  value={details.nakshatra}
                  onChange={(e) => set('nakshatra', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="field-label">
                Phone number <span className="text-maroon-700">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                className="field-input"
                value={details.phone}
                onChange={(e) => set('phone', e.target.value)}
                autoComplete="tel"
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && (
                <p id="phone-error" className="mt-1.5 text-sm text-maroon-700">
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="field-label">
                Email <span className="font-normal text-maroon-700/60">(optional — for your receipt)</span>
              </label>
              <input
                id="email"
                type="email"
                className="field-input"
                value={details.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="preferred-date" className="field-label">
                Preferred date <span className="font-normal text-maroon-700/60">(optional)</span>
              </label>
              <input
                id="preferred-date"
                type="date"
                className="field-input"
                value={details.preferredDate}
                onChange={(e) => set('preferredDate', e.target.value)}
              />
              <p className="mt-1.5 text-sm text-maroon-800/70">
                Sevas marked “Except on Ekadashi” are not performed on that day. The temple office
                will call you to confirm the date.
              </p>
            </div>
          </div>

          <button type="submit" className="btn-primary mt-7 w-full">
            Continue to Review
          </button>
        </form>
      ) : (
        <div className="card p-5 sm:p-7">
          <h2 className="font-display text-2xl font-semibold text-maroon-900">Review Your Booking</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-maroon-800/75">
            Please check every seva and the total below. Nothing is charged until you choose to
            proceed.
          </p>

          <OrnamentalDivider className="my-6" />

          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
            Sevas Selected
          </h3>
          <ul className="mt-3 divide-y divide-maroon-100">
            {items.map((seva) => (
              <li key={seva.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-maroon-900">{seva.name}</p>
                  {seva.timing && <p className="mt-0.5 text-xs text-maroon-800/65">{seva.timing}</p>}
                  {seva.exceptEkadashi && (
                    <p className="mt-0.5 text-xs text-gold-800">Not performed on Ekadashi</p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-maroon-900">
                  {rupees(seva.price)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t-2 border-maroon-200 pt-4">
            <span className="text-sm font-semibold uppercase tracking-wide text-maroon-800">
              Total Payable
            </span>
            <span className="font-display text-3xl font-semibold tabular-nums text-maroon-900">
              {rupees(total)}
            </span>
          </div>
          <p className="mt-1.5 text-right text-xs text-maroon-800/65">
            No processing fee or additional charge is added to this amount.
          </p>

          <OrnamentalDivider className="my-6" />

          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
            Devotee Details
          </h3>
          <dl className="mt-3 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            {(
              [
                ['Name', details.name],
                ['Phone', details.phone],
                ['Gotra', details.gotra],
                ['Nakshatra', details.nakshatra],
                ['Email', details.email],
                ['Preferred date', details.preferredDate],
              ] as [string, string][]
            )
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-maroon-800/65">{label}</dt>
                  <dd className="font-medium text-maroon-900">{value}</dd>
                </div>
              ))}
          </dl>

          <p className="mt-6 rounded-lg bg-cream-100 px-4 py-3.5 text-sm leading-relaxed text-maroon-800/80">
            {sevadarGuidance}
          </p>

          <button onClick={handlePay} disabled={submitting} className="btn-primary mt-6 w-full">
            {submitting ? 'Processing…' : `Proceed to Pay ${rupees(total)}`}
          </button>
          <button
            onClick={() => setStage('details')}
            className="mt-3 w-full text-center text-sm font-semibold text-maroon-800 hover:text-maroon-950"
          >
            Edit devotee details
          </button>
        </div>
      )}
    </div>
  );
}
