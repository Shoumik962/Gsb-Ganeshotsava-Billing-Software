import { useState } from 'react';
import { rupees } from '../lib/format';
import { temple } from '../data/temple';
import { submitDonation, type DonorDetails } from '../lib/api';
import { SectionHeading, OrnamentalDivider } from './Ornaments';

/** Standard preset amounts on Indian donation sites. */
const PRESETS = [101, 501, 1001, 5001];

const EMPTY: DonorDetails = { name: '', phone: '', email: '', pan: '', address: '' };

type Stage = 'form' | 'review' | 'done';

/**
 * General donation (hundi) — deliberately separate from the seva cart. A
 * donation is just an amount; it has no date, slot or sankalp details.
 */
export default function DonationForm() {
  const [stage, setStage] = useState<Stage>('form');
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [donor, setDonor] = useState<DonorDetails>(EMPTY);
  const [errors, setErrors] = useState<{ amount?: string; name?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);

  const amount = preset ?? (custom ? Number(custom) : 0);

  const set = (key: keyof DonorDetails, value: string) => {
    setDonor((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const choosePreset = (value: number) => {
    setPreset(value);
    setCustom('');
    setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const changeCustom = (value: string) => {
    // Digits only — donations are whole rupees.
    const cleaned = value.replace(/[^0-9]/g, '');
    setCustom(cleaned);
    setPreset(null);
    setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const goToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!amount || amount < 1) next.amount = 'Please choose or enter a donation amount.';
    if (!donor.name.trim()) next.name = 'Please enter your name.';
    if (!donor.phone.trim()) next.phone = 'Please enter a phone number.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setStage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePay = async () => {
    setSubmitting(true);
    const result = await submitDonation({ amount, donor });
    setPaidAmount(amount);
    setReceiptNo(result.receiptNo);
    setSubmitting(false);
    setStage('done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setStage('form');
    setPreset(null);
    setCustom('');
    setDonor(EMPTY);
    setReceiptNo(null);
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
            Thank You for Your Donation
          </h2>
          <p className="mt-2 text-base leading-relaxed text-maroon-800/80">
            {temple.trustName} gratefully acknowledges your offering of{' '}
            <strong className="text-maroon-900">{rupees(paidAmount)}</strong>.
          </p>

          <div className="mt-6 rounded-lg bg-cream-100 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
              Receipt Number
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-maroon-900">{receiptNo}</p>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-maroon-800/75">
            A receipt has been sent to {donor.email || 'the contact details provided'}.
            {donor.pan
              ? ' Your 80G receipt will be issued against the PAN you provided.'
              : ' For an 80G receipt, please share your PAN with the temple office.'}
          </p>

          <button onClick={reset} className="btn-secondary mt-7 w-full sm:w-auto">
            Make Another Donation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <SectionHeading
        eyebrow="Daan"
        title="Offer a Donation"
        subtitle="A general offering to the temple — no date or time slot needed. If you would like a specific pooja performed in your name, book a seva instead."
      />

      <OrnamentalDivider className="my-8" />

      {stage === 'form' ? (
        <form onSubmit={goToReview} className="card p-5 sm:p-7" noValidate>
          <fieldset>
            <legend className="field-label mb-3 text-base">
              Donation amount <span className="text-maroon-700">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => choosePreset(value)}
                  aria-pressed={preset === value}
                  className={`rounded-lg border px-3 py-3.5 text-base font-semibold transition-colors ${
                    preset === value
                      ? 'border-maroon-800 bg-maroon-800 text-cream-50'
                      : 'border-maroon-200 bg-white text-maroon-800 hover:border-maroon-400'
                  }`}
                >
                  {rupees(value)}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label htmlFor="custom-amount" className="field-label">
                Or enter another amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-maroon-700">
                  ₹
                </span>
                <input
                  id="custom-amount"
                  type="text"
                  inputMode="numeric"
                  className="field-input pl-9"
                  value={custom}
                  onChange={(e) => changeCustom(e.target.value)}
                  aria-describedby={errors.amount ? 'amount-error' : undefined}
                  aria-invalid={Boolean(errors.amount)}
                />
              </div>
            </div>
            {errors.amount && (
              <p id="amount-error" className="mt-1.5 text-sm text-maroon-700">
                {errors.amount}
              </p>
            )}
          </fieldset>

          <div className="mt-6 space-y-5 border-t border-maroon-100 pt-6">
            <div>
              <label htmlFor="donor-name" className="field-label">
                Your name <span className="text-maroon-700">*</span>
              </label>
              <input
                id="donor-name"
                className="field-input"
                value={donor.name}
                onChange={(e) => set('name', e.target.value)}
                autoComplete="name"
                aria-describedby={errors.name ? 'donor-name-error' : undefined}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p id="donor-name-error" className="mt-1.5 text-sm text-maroon-700">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="donor-phone" className="field-label">
                Phone number <span className="text-maroon-700">*</span>
              </label>
              <input
                id="donor-phone"
                type="tel"
                inputMode="tel"
                className="field-input"
                value={donor.phone}
                onChange={(e) => set('phone', e.target.value)}
                autoComplete="tel"
                aria-describedby={errors.phone ? 'donor-phone-error' : undefined}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && (
                <p id="donor-phone-error" className="mt-1.5 text-sm text-maroon-700">
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="donor-email" className="field-label">
                Email <span className="font-normal text-maroon-700/60">(optional — for your receipt)</span>
              </label>
              <input
                id="donor-email"
                type="email"
                className="field-input"
                value={donor.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="donor-pan" className="field-label">
                PAN <span className="font-normal text-maroon-700/60">(optional — for an 80G receipt)</span>
              </label>
              <input
                id="donor-pan"
                className="field-input uppercase"
                value={donor.pan}
                onChange={(e) => set('pan', e.target.value.toUpperCase())}
              />
              <p className="mt-1.5 text-sm text-maroon-800/70">
                Donations to {temple.trustName} are eligible for deduction under Section 80G.
              </p>
            </div>

            <div>
              <label htmlFor="donor-address" className="field-label">
                Address <span className="font-normal text-maroon-700/60">(optional)</span>
              </label>
              <input
                id="donor-address"
                className="field-input"
                value={donor.address}
                onChange={(e) => set('address', e.target.value)}
                autoComplete="street-address"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary mt-7 w-full">
            Continue to Review
          </button>
        </form>
      ) : (
        <div className="card p-5 sm:p-7">
          <h3 className="font-display text-2xl font-semibold text-maroon-900">
            Review Your Donation
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-maroon-800/75">
            Nothing is charged until you choose to proceed.
          </p>

          <div className="mt-6 rounded-lg bg-cream-100 px-5 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
              Donation Amount
            </p>
            <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-maroon-900">
              {rupees(amount)}
            </p>
            <p className="mt-1.5 text-xs text-maroon-800/65">
              No processing fee or additional charge is added.
            </p>
          </div>

          <dl className="mt-6 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            {(
              [
                ['Name', donor.name],
                ['Phone', donor.phone],
                ['Email', donor.email],
                ['PAN', donor.pan],
                ['Address', donor.address],
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

          <button onClick={handlePay} disabled={submitting} className="btn-primary mt-7 w-full">
            {submitting ? 'Processing…' : `Proceed to Pay ${rupees(amount)}`}
          </button>
          <button
            onClick={() => setStage('form')}
            className="mt-3 w-full text-center text-sm font-semibold text-maroon-800 hover:text-maroon-950"
          >
            Edit donation details
          </button>
        </div>
      )}
    </div>
  );
}
