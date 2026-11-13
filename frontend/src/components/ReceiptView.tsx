import { rupees } from '../lib/format';
import { temple } from '../data/temple';
import { DiyaIcon, LotusIcon } from './Ornaments';
import heroDeityImage from '../assets/heroDeityImage.jpeg';
import {
  WhatsAppIcon,
  MapPinIcon,
  UserCheckIcon,
  PrayingHandsIcon,
  InstagramIcon,
  YouTubeIcon,
  FacebookIcon,
} from './Icons';
import type { BookingRecord } from '../lib/bookingStore';

interface ReceiptViewProps {
  record: BookingRecord;
  onClose?: () => void;
}

export default function ReceiptView({ record, onClose }: ReceiptViewProps) {
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/gsbsarvajanikganeshotsava';
  const youtubeUrl = import.meta.env.VITE_YOUTUBE_URL || 'https://www.youtube.com/gsbsarvajanikganeshotsava';
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || 'https://www.facebook.com/gsbsarvajanikganeshotsava';

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = (record.isTest ? '*TEST ONLY — NOT A REAL PAYMENT OR VALID RECEIPT*\n\n' : '') +
      `*GSB Ram Mandir Wadala — ${record.type === 'seva' ? 'Seva' : 'Donation'} Confirmation*\n\n` +
      `*Receipt No:* ${record.receiptNo}\n` +
      `*Devotee Name:* ${record.devoteeName}\n` +
      (record.gotra ? `*Gotra:* ${record.gotra}\n` : '') +
      (record.preferredDate ? `*Seva Date:* ${record.preferredDate}\n` : '') +
      `*${record.isTest ? 'Simulated Amount' : 'Total Paid'}:* ${rupees(record.total)}\n` +
      `*Status:* ${record.isTest ? 'TEST CAPTURE SIMULATED (NOT PAID)' : 'Confirmed'}\n\n` +
      `*Venue:* Dwarkanath Bhavan, Ram Mandir, Wadala, Mumbai.\n` +
      (record.isTest ? 'SAMPLE ONLY: Not redeemable, not proof of donation, no tax benefit.' : 'For seva bookings, present the confirmed receipt at the temple counter.');
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

      {/* Server-issued receipt; test mode is visibly marked on-screen AND in print. */}
      <div className="receipt-container relative overflow-hidden rounded-2xl border-2 border-gold-400/80 bg-white p-5 sm:p-7 shadow-lift print:border-maroon-800 print:p-4 print:shadow-none">
        {record.isTest && (
          <div className="mb-4 print:mb-2 rounded-xl border-4 print:border-2 border-red-700 bg-red-50 px-4 py-3 print:py-1.5 text-center text-red-900">
            <p className="font-display text-xl sm:text-2xl print:text-base font-black tracking-wider leading-tight">TEST RECEIPT — NOT VALID</p>
            <p className="mt-0.5 text-xs sm:text-sm print:text-[10px] font-bold">RAZORPAY SANDBOX · NO REAL MONEY RECEIVED</p>
            <p className="mt-0.5 text-[11px] sm:text-xs print:text-[9px] font-semibold">Not for tax deductions, seva/prasad collection, or accounting.</p>
          </div>
        )}
        {/* Sacred Decorative Border Accent */}
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-gold-400 via-maroon-700 to-gold-400 print:bg-maroon-800" />

        {/* Temple Trust Crest Header */}
        <div className="border-b-2 border-maroon-100 pb-3 print:pb-2 text-center">
          {/* Sacred Deity Image for Screen & Print */}
          <div className="mb-2 print:mb-1 flex justify-center">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 print:h-12 print:w-12 overflow-hidden rounded-full border-2 border-gold-500 shadow-md ring-2 ring-gold-200/80 bg-cream-50 print:border-maroon-800 print:shadow-none print:ring-0">
              <img
                src={heroDeityImage}
                alt="Shree Ganpati Bappa"
                className="h-full w-full object-cover object-[52%_25%]"
                style={{
                  printColorAdjust: 'exact',
                  WebkitPrintColorAdjust: 'exact',
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-gold-700">
            <DiyaIcon className="h-4 w-4 print:h-3 print:w-3" />
            <span className="text-[11px] sm:text-xs print:text-[9px] font-semibold uppercase tracking-[0.2em]">
              || Shree Ganeshayanamah ||
            </span>
            <DiyaIcon className="h-4 w-4 print:h-3 print:w-3" />
          </div>

          <h2 className="mt-1 font-display text-xl sm:text-2xl print:text-lg font-bold text-maroon-950 leading-tight">
            {temple.trustName}
          </h2>
          <p className="mt-0.5 font-display text-sm sm:text-base print:text-xs font-semibold text-maroon-900">
            {temple.venue}
          </p>
          <p className="text-[11px] print:text-[9px] text-maroon-800/75">
            Katrak Road, Wadala, Mumbai 400031 · {temple.registration}
          </p>

          <div className="mt-2 inline-flex items-center rounded-full bg-gold-100/90 border border-gold-400 px-3 py-0.5 text-[11px] print:text-[9px] font-bold uppercase tracking-wider text-gold-950">
            {record.isTest ? 'Test Payment Receipt (Sample)' : (record.type === 'seva' ? 'Seva E-Receipt & Sankalpa Patrika' : 'Donation E-Receipt')}
          </div>
        </div>

        {/* Receipt Header Grid */}
        <div className="mt-3 print:mt-2 grid grid-cols-2 gap-2 rounded-xl bg-cream-50 p-3 print:p-2 border border-maroon-100 text-xs print:text-[10px]">
          <div>
            <span className="block text-[10px] print:text-[8px] font-semibold uppercase tracking-wider text-maroon-800/70">
              Receipt Number
            </span>
            <span className="font-display text-sm sm:text-base print:text-xs font-bold text-maroon-950 break-all">
              {record.receiptNo}
            </span>
          </div>

          <div className="text-right">
            <span className="block text-[10px] print:text-[8px] font-semibold uppercase tracking-wider text-maroon-800/70">
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
            <span className="block text-[10px] print:text-[8px] font-semibold uppercase tracking-wider text-maroon-800/70">
              Status
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {record.status}
            </span>
          </div>

          <div className="text-right">
            <span className="block text-[10px] print:text-[8px] font-semibold uppercase tracking-wider text-maroon-800/70">
              Payment Mode
            </span>
            <span className="font-medium text-maroon-900">
              {record.paymentMode}
            </span>
          </div>
        </div>

        {/* Devotee Sankalpa Details */}
        <div className="mt-3 print:mt-2 rounded-xl border border-maroon-100 p-3 print:p-2">
          <h3 className="flex items-center gap-1.5 text-[11px] print:text-[9px] font-bold uppercase tracking-[0.16em] text-gold-800">
            <LotusIcon className="h-3.5 w-3.5 print:h-3 print:w-3" />
            Devotee & Sankalpa Details
          </h3>

          <dl className="mt-2 grid gap-x-4 gap-y-1.5 print:gap-y-0.5 text-xs print:text-[10px] sm:grid-cols-2">
            <div>
              <dt className="text-[10px] print:text-[8px] text-maroon-800/70">Devotee Full Name</dt>
              <dd className="font-bold text-maroon-950 text-sm print:text-xs">{record.devoteeName}</dd>
            </div>

            <div>
              <dt className="text-[10px] print:text-[8px] text-maroon-800/70">Attendance Mode</dt>
              <dd className="font-bold text-maroon-900 flex items-center gap-1">
                {record.attendanceMode === 'absentia' ? (
                  <>
                    <PrayingHandsIcon className="h-3.5 w-3.5 print:h-3 print:w-3 text-gold-700" />
                    <span>In-Absentia (Sankalp by Vaidik)</span>
                  </>
                ) : (
                  <>
                    <UserCheckIcon className="h-3.5 w-3.5 print:h-3 print:w-3 text-maroon-800" />
                    <span>Attending in Person</span>
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-[10px] print:text-[8px] text-maroon-800/70">Phone Number</dt>
              <dd className="font-semibold text-maroon-900">{record.phone}</dd>
            </div>

            {record.gotra && (
              <div>
                <dt className="text-[10px] print:text-[8px] text-maroon-800/70">Gotra</dt>
                <dd className="font-semibold text-maroon-900">{record.gotra}</dd>
              </div>
            )}

            {record.nakshatra && (
              <div>
                <dt className="text-[10px] print:text-[8px] text-maroon-800/70">Nakshatra</dt>
                <dd className="font-semibold text-maroon-900">{record.nakshatra}</dd>
              </div>
            )}

            {record.preferredDate && (
              <div>
                <dt className="text-[10px] print:text-[8px] text-maroon-800/70">Preferred Seva Date</dt>
                <dd className="font-bold text-maroon-900">{record.preferredDate}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Itemized Table of Sevas or Donation */}
        <div className="mt-3 print:mt-2">
          <table className="w-full border-collapse text-left text-xs print:text-[10px]">
            <thead>
              <tr className="border-b-2 border-maroon-200 bg-cream-100 text-[10px] print:text-[9px] font-bold uppercase tracking-wider text-maroon-900">
                <th className="py-1.5 px-2.5 print:py-1 print:px-2">Description</th>
                <th className="py-1.5 px-2.5 print:py-1 print:px-2 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-maroon-100">
              {record.items && record.items.length > 0 ? (
                record.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 px-2.5 print:py-1 print:px-2">
                      <span className="font-semibold text-maroon-950 block">{item.name}</span>
                      {item.timing && <span className="text-[10px] print:text-[8px] text-maroon-800/70">{item.timing}</span>}
                    </td>
                    <td className="py-2 px-2.5 print:py-1 print:px-2 text-right font-display text-sm print:text-xs font-bold tabular-nums text-maroon-900">
                      {rupees(item.price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-2 px-2.5 print:py-1 print:px-2 font-semibold text-maroon-950">
                    General Temple Hundi / Trust Donation (Daan)
                  </td>
                  <td className="py-2 px-2.5 print:py-1 print:px-2 text-right font-display text-sm print:text-xs font-bold tabular-nums text-maroon-900">
                    {rupees(record.total)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-maroon-300 bg-cream-50 font-bold">
                <td className="py-2 px-2.5 print:py-1 print:px-2 text-xs print:text-[11px] text-maroon-950">Total Amount Paid</td>
                <td className="py-2 px-2.5 print:py-1 print:px-2 text-right font-display text-base print:text-sm text-maroon-950">
                  {rupees(record.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Verification and Prasad Counter Details */}
        <div className="mt-3 print:mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-gold-300/80 bg-gold-50/60 p-3 print:p-2 text-xs print:text-[9px]">
          <div className="flex-1 leading-snug text-maroon-900/90">
            <p className="flex items-center gap-1 font-bold text-maroon-950 uppercase tracking-wide">
              <MapPinIcon className="h-3.5 w-3.5 print:h-3 print:w-3 text-maroon-800" />
              <span>{record.isTest ? 'Sandbox Test Information' : (record.attendanceMode === 'absentia' ? 'In-Absentia Sankalpa & Prasad' : 'Prasada & Counter Details')}</span>
            </p>
            <p className="mt-0.5">
              {record.isTest
                ? 'Simulated Razorpay payment for developer testing. Does not entitle anyone to seva, prasad or entry.'
                : record.attendanceMode === 'absentia'
                  ? 'Your Gotra & Name will be chanted in Sankalp by the Vaidik. Blessed Prasad will be held at Dwarkanath Bhavan counter.'
                  : 'Please present your confirmed e-receipt (digitally on phone or printed) at Dwarkanath Bhavan counter for verification.'}
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-gold-300 bg-white px-3 py-1.5 text-center text-[10px] print:text-[8px] text-maroon-900">
            <p className="font-bold">{record.isTest ? 'TEST TRANSACTION' : 'Payment Reference'}</p>
            <p className="font-mono max-w-[160px] truncate">{record.paymentReference || record.receiptNo}</p>
          </div>
        </div>

        {/* Official Social Media Channels on Receipt */}
        <div className="mt-3 print:mt-2 rounded-xl border border-gold-300/70 bg-gradient-to-r from-cream-50 via-gold-50/40 to-cream-50 p-2.5 print:p-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] print:text-[8px] font-bold uppercase tracking-[0.15em] text-gold-900">
            <span>Official Social Channels · GSB Wadala Ganeshotsav</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs print:text-[9px]">
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-maroon-950 hover:text-gold-700 transition-colors"
              >
                <FacebookIcon className="h-3.5 w-3.5 print:h-2.5 print:w-2.5 text-blue-700" />
                <span>facebook.com/gsbsarvajanikganeshotsava</span>
              </a>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-maroon-950 hover:text-gold-700 transition-colors"
              >
                <YouTubeIcon className="h-3.5 w-3.5 print:h-2.5 print:w-2.5 text-red-600" />
                <span>youtube.com/gsbsarvajanikganeshotsava</span>
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-maroon-950 hover:text-gold-700 transition-colors"
              >
                <InstagramIcon className="h-3.5 w-3.5 print:h-2.5 print:w-2.5 text-pink-600" />
                <span>instagram.com/gsbsarvajanikganeshotsava</span>
              </a>
            )}
          </div>
        </div>

        {/* Footer Stamp & Signature */}
        <div className="mt-3 print:mt-2 border-t border-maroon-100 pt-2 print:pt-1.5 flex items-center justify-between text-xs print:text-[9px] text-maroon-800/70">
          <div>
            <p className="font-semibold text-maroon-900">GSB Sarvajanik Ganeshotsava Samiti</p>
            <p className="text-[10px] print:text-[8px]">Dwarkanath Bhavan, Katrak Road, Wadala, Mumbai 400031</p>
          </div>
          <div className="text-right">
            <span className="inline-block border-b border-maroon-400 pb-0.5 font-display font-bold text-maroon-900">
              Vaidik / Counter Authorized
            </span>
            <p className="text-[10px] print:text-[8px]">{record.isTest ? 'TEST SAMPLE — NEVER VALID' : 'Computer Generated E-Receipt'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
