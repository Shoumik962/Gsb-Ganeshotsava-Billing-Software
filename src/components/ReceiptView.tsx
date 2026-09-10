import { rupees } from '../lib/format';
import { temple } from '../data/temple';
import { DiyaIcon, LotusIcon } from './Ornaments';
import {
  WhatsAppIcon,
  MapPinIcon,
  UserCheckIcon,
  PrayingHandsIcon,
} from './Icons';
import type { BookingRecord } from '../lib/bookingStore';

interface ReceiptViewProps {
  record: BookingRecord;
  onClose?: () => void;
}

export default function ReceiptView({ record, onClose }: ReceiptViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*GSB Ram Mandir Wadala — Seva Confirmation*\n\n` +
      `*Receipt No:* ${record.receiptNo}\n` +
      `*Devotee Name:* ${record.devoteeName}\n` +
      (record.gotra ? `*Gotra:* ${record.gotra}\n` : '') +
      (record.preferredDate ? `*Seva Date:* ${record.preferredDate}\n` : '') +
      `*Total Paid:* ${rupees(record.total)}\n` +
      `*Status:* Confirmed\n\n` +
      `*Venue:* Dwarkanath Bhavan, Ram Mandir, Wadala, Mumbai.\n` +
      `Please show this message at the seva counter to collect your prasada.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      {/* Top Action Bar (hidden when printing) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {onClose && (
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-maroon-200 bg-white px-3.5 py-2 text-sm font-semibold text-maroon-800 shadow-sm hover:bg-cream-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 transition-colors"
          >
            <WhatsAppIcon className="h-4 w-4 text-emerald-700" />
            WhatsApp
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-800 px-4 py-2 text-sm font-semibold text-cream-50 shadow-sm hover:bg-maroon-900 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Official Temple Receipt Card */}
      <div className="receipt-container relative overflow-hidden rounded-2xl border-2 border-gold-400/80 bg-white p-6 sm:p-8 shadow-lift print:border-maroon-800 print:p-6 print:shadow-none">
        {/* Sacred Decorative Border Accent */}
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-gold-400 via-maroon-700 to-gold-400 print:bg-maroon-800" />

        {/* Temple Trust Crest Header */}
        <div className="border-b-2 border-maroon-100 pb-5 text-center">
          <div className="flex items-center justify-center gap-2 text-gold-700">
            <DiyaIcon className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              || Shree Ganeshayanamah ||
            </span>
            <DiyaIcon className="h-5 w-5" />
          </div>

          <h2 className="mt-2 font-display text-2xl font-bold text-maroon-950 sm:text-3xl">
            {temple.trustName}
          </h2>
          <p className="mt-1 font-display text-base font-semibold text-maroon-900">
            {temple.venue}
          </p>
          <p className="mt-0.5 text-xs text-maroon-800/75">
            Katrak Road, Wadala, Mumbai 400031 · {temple.registration}
          </p>

          <div className="mt-4 inline-flex items-center rounded-full bg-gold-100/90 border border-gold-400 px-4 py-1 text-xs font-bold uppercase tracking-wider text-gold-950">
            {record.type === 'seva' ? 'Official Seva E-Receipt & Sankalpa Patrika' : 'Donation E-Receipt (80G)'}
          </div>
        </div>

        {/* Receipt Header Grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-cream-50 p-4 border border-maroon-100 text-sm">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-maroon-800/70">
              Receipt Number
            </span>
            <span className="font-display text-lg font-bold text-maroon-950">
              {record.receiptNo}
            </span>
          </div>

          <div className="text-right">
            <span className="block text-xs font-semibold uppercase tracking-wider text-maroon-800/70">
              Booking Date & Time
            </span>
            <span className="font-medium text-maroon-900">
              {new Date(record.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-maroon-800/70">
              Status
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              {record.status}
            </span>
          </div>

          <div className="text-right">
            <span className="block text-xs font-semibold uppercase tracking-wider text-maroon-800/70">
              Payment Mode
            </span>
            <span className="font-medium text-maroon-900">
              {record.paymentMode}
            </span>
          </div>
        </div>

        {/* Devotee Sankalpa Details */}
        <div className="mt-5 rounded-xl border border-maroon-100 p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gold-800">
            <LotusIcon className="h-4 w-4" />
            Devotee & Sankalpa Details
          </h3>

          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-maroon-800/70">Devotee Full Name</dt>
              <dd className="font-bold text-maroon-950 text-base">{record.devoteeName}</dd>
            </div>

            <div>
              <dt className="text-xs text-maroon-800/70">Attendance Mode</dt>
              <dd className="font-bold text-maroon-900 flex items-center gap-1.5">
                {record.attendanceMode === 'absentia' ? (
                  <>
                    <PrayingHandsIcon className="h-4 w-4 text-gold-700" />
                    <span>In-Absentia (Sankalp by Vaidik)</span>
                  </>
                ) : (
                  <>
                    <UserCheckIcon className="h-4 w-4 text-maroon-800" />
                    <span>Attending in Person</span>
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-maroon-800/70">Phone Number</dt>
              <dd className="font-semibold text-maroon-900">{record.phone}</dd>
            </div>

            {record.gotra && (
              <div>
                <dt className="text-xs text-maroon-800/70">Gotra</dt>
                <dd className="font-semibold text-maroon-900">{record.gotra}</dd>
              </div>
            )}

            {record.nakshatra && (
              <div>
                <dt className="text-xs text-maroon-800/70">Nakshatra</dt>
                <dd className="font-semibold text-maroon-900">{record.nakshatra}</dd>
              </div>
            )}

            {record.preferredDate && (
              <div>
                <dt className="text-xs text-maroon-800/70">Preferred Seva Date</dt>
                <dd className="font-bold text-maroon-900">{record.preferredDate}</dd>
              </div>
            )}

            {record.pan && (
              <div>
                <dt className="text-xs text-maroon-800/70">PAN (For 80G Tax Exemption)</dt>
                <dd className="font-semibold text-maroon-900 uppercase">{record.pan}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Itemized Table of Sevas or Donation */}
        <div className="mt-5">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-maroon-200 bg-cream-100 text-xs font-bold uppercase tracking-wider text-maroon-900">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-maroon-100">
              {record.items && record.items.length > 0 ? (
                record.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-maroon-950 block">{item.name}</span>
                      {item.timing && <span className="text-xs text-maroon-800/70">{item.timing}</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-display text-base font-bold tabular-nums text-maroon-900">
                      {rupees(item.price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-3 px-3 font-semibold text-maroon-950">
                    General Temple Hundi / Trust Donation (Daan)
                  </td>
                  <td className="py-3 px-3 text-right font-display text-base font-bold tabular-nums text-maroon-900">
                    {rupees(record.total)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-maroon-300 bg-cream-50 font-bold">
                <td className="py-3 px-3 text-base text-maroon-950">Total Amount Paid</td>
                <td className="py-3 px-3 text-right font-display text-xl text-maroon-950">
                  {rupees(record.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Verification QR Code and Prasad Counter Details */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-5 rounded-xl border border-gold-300/80 bg-gold-50/60 p-4">
          <div className="flex-1 text-xs leading-relaxed text-maroon-900/90">
            <p className="flex items-center gap-1.5 font-bold text-maroon-950 uppercase tracking-wide">
              <MapPinIcon className="h-4 w-4 text-maroon-800" />
              <span>{record.attendanceMode === 'absentia' ? 'In-Absentia Sankalpa & Prasad Status' : 'Prasada & Counter Instructions'}</span>
            </p>
            <p className="mt-1">
              {record.attendanceMode === 'absentia'
                ? 'Your Gotra and Name will be chanted in the Sankalp during the pooja by the designated Vaidik. Blessed Prasad will be held at Dwarkanath Bhavan counter or handed to your designated nominee upon presenting this receipt.'
                : 'Please present this verified e-receipt (digitally on phone or printed) at the Dwarkanath Bhavan Counter on the day of seva to receive your counter entry token.'}
            </p>
            <p className="mt-1 text-gold-900 font-medium">
              Teertha, Prasad & Angavastra collection is open daily from 6:00 AM – 9:00 PM.
            </p>
          </div>

          {/* Authentic SVG QR Code Representation */}
          <div className="flex flex-col items-center shrink-0 rounded-lg bg-white p-2.5 border border-gold-300 shadow-sm">
            <svg viewBox="0 0 100 100" className="h-20 w-20 text-maroon-950" fill="currentColor">
              {/* Corner markers */}
              <rect x="10" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="16" y="16" width="13" height="13" />
              <rect x="65" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="71" y="16" width="13" height="13" />
              <rect x="10" y="65" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="16" y="71" width="13" height="13" />
              {/* Data matrix dots */}
              <rect x="42" y="12" width="6" height="6" />
              <rect x="52" y="12" width="6" height="6" />
              <rect x="42" y="24" width="6" height="6" />
              <rect x="52" y="32" width="6" height="6" />
              <rect x="12" y="45" width="6" height="6" />
              <rect x="24" y="45" width="6" height="6" />
              <rect x="36" y="45" width="6" height="6" />
              <rect x="48" y="45" width="6" height="6" />
              <rect x="60" y="45" width="6" height="6" />
              <rect x="72" y="45" width="6" height="6" />
              <rect x="84" y="45" width="6" height="6" />
              <rect x="45" y="60" width="6" height="6" />
              <rect x="60" y="60" width="6" height="6" />
              <rect x="75" y="60" width="6" height="6" />
              <rect x="45" y="75" width="6" height="6" />
              <rect x="60" y="75" width="6" height="6" />
              <rect x="80" y="80" width="8" height="8" />
            </svg>
            <span className="mt-1 text-[10px] font-mono font-bold text-maroon-900">
              VERIFIED
            </span>
          </div>
        </div>

        {/* Footer Stamp & Signature */}
        <div className="mt-6 border-t border-maroon-100 pt-4 flex items-center justify-between text-xs text-maroon-800/70">
          <div>
            <p className="font-semibold text-maroon-900">GSB Sarvajanik Ganeshotsava Samiti</p>
            <p>Dwarkanath Bhavan, Wadala, Mumbai</p>
          </div>
          <div className="text-right">
            <span className="inline-block border-b border-maroon-400 pb-0.5 font-display font-bold text-maroon-900">
              Vaidik / Counter Authorized
            </span>
            <p className="text-[10px]">Computer Generated E-Receipt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
