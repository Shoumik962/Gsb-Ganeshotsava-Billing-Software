import { useState } from 'react';
import { rupees, numberToWordsIndian } from '../lib/format';
import { temple } from '../data/temple';
import { DiyaIcon } from './Ornaments';
import heroDeityImage from '../assets/heroDeityImage.jpeg';
import {
  WhatsAppIcon,
  InstagramIcon,
  YouTubeIcon,
  FacebookIcon,
} from './Icons';
import type { BookingRecord } from '../lib/bookingStore';

interface ReceiptViewProps {
  record: BookingRecord;
  onClose?: () => void;
}

function formatDate(isoOrDateString?: string): string {
  if (!isoOrDateString) {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
  }
  // If already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateString)) {
    const [y, m, d] = isoOrDateString.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(isoOrDateString);
  if (isNaN(d.getTime())) return isoOrDateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function ReceiptView({ record, onClose }: ReceiptViewProps) {
  const [copied, setCopied] = useState(false);

  const instagramUrl = 'https://www.instagram.com/gsbsarvajanikganeshotsava';
  const youtubeUrl = 'https://www.youtube.com/gsbsarvajanikganeshotsava';
  const facebookUrl = 'https://www.facebook.com/gsbsarvajanikganeshotsava';

  // Ensure Customer ID follows WADXXXXXXX (10 characters: WAD + 7 digits)
  const customerId =
    record.customerId ||
    record.devoteeCode ||
    (record.phone && record.phone.replace(/\D/g, '').length >= 7
      ? `WAD${record.phone.replace(/\D/g, '').slice(-7)}`
      : 'WAD1730401');

  // Ensure Receipt No displays cleanly
  const receiptNo = record.receiptNo;
  const formattedDate = formatDate(record.createdAt);
  const sevaDate = formatDate(record.preferredDate || record.createdAt);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text =
      `*${temple.trustName}*\n` +
      `RECEIPT NO: ${receiptNo}\n` +
      `CUSTOMER ID: ${customerId}\n` +
      `DEVOTEE: ${record.devoteeName}\n` +
      `DATE: ${formattedDate}\n` +
      `AMOUNT: ₹${record.total} (${numberToWordsIndian(record.total)})\n` +
      `VENUE: ${temple.officeAddress}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const sevaDetails =
      record.items && record.items.length > 0
        ? record.items.map((i) => `• ${i.name} (${rupees(i.price)})`).join('\n')
        : '• General Temple Hundi / Trust Donation (Daan)';

    const text =
      (record.isTest ? '*TEST RECEIPT — SIMULATED / NOT A REAL PAYMENT*\n\n' : '') +
      `*${temple.trustName}*\n` +
      `Dwarkanath Bhavan, Ram Mandir Complex, Wadala, Mumbai 400031\n\n` +
      `*RECEIPT NO :* ${receiptNo}\n` +
      `*CUSTOMER ID :* ${customerId}\n` +
      `*DATE :* ${formattedDate}\n\n` +
      `*RECEIVED with thanks from :* ${record.devoteeName}\n` +
      (record.address ? `*ADDRESS :* ${record.address}\n` : '') +
      `*MOBILE NO :* ${record.phone}\n` +
      (record.gotra ? `*GOTRA :* ${record.gotra}\n` : '') +
      (record.nakshatra ? `*NAKSHATRA :* ${record.nakshatra}\n` : '') +
      `\n*BOOKING DETAILS :*\n` +
      `*TYPE :* ${record.type === 'seva' ? 'SEVA' : 'DONATION'}\n` +
      `*DATE OF SEVA :* ${sevaDate}\n` +
      `*ITEMS :*\n${sevaDetails}\n` +
      `*TOTAL AMOUNT :* ${rupees(record.total)} {${numberToWordsIndian(record.total)}}\n` +
      `*PAYMENT MODE :* ${record.paymentMode}\n` +
      (record.paymentReference ? `*TRANSACTION NO :* ${record.paymentReference}\n` : '') +
      `\n*(Kindly quote your Customer ID in future communication)*\n\n` +
      `Donation to this Trust is exempted u/s. 80G | PAN : ${temple.pan}\n` +
      `Website: ${temple.website}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-up print:m-0 print:max-w-none">
      {/* Top Action Bar (hidden in print) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        {onClose && (
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-maroon-200 bg-white px-3.5 py-2 text-sm font-semibold text-maroon-800 shadow-sm hover:bg-cream-100 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-maroon-300 bg-white px-3 py-2 text-sm font-semibold text-maroon-900 shadow-sm hover:bg-cream-50 transition-colors"
            title="Copy Receipt Summary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 transition-colors"
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

      {/* Official PDF-Format Receipt Container */}
      <div
        className="receipt-container relative overflow-hidden rounded-xl border-2 border-gold-400 bg-white p-5 sm:p-7 shadow-lift print:border-none print:p-0 print:shadow-none"
        style={{
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}
      >
        {/* Test banner if in developer sandbox */}
        {record.isTest && (
          <div className="mb-3 rounded-lg border-2 border-red-600 bg-red-50/80 p-2 text-center text-red-900 print:mb-2 print:py-1">
            <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">
              TEST / DEMO RECEIPT — NO REAL PAYMENT COLLECTED (FOR TESTING ONLY)
            </span>
          </div>
        )}

        {/* 1. Header with Logos and Trust Identity */}
        <div className="border-b-2 border-maroon-900/20 pb-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Emblem / Diya Crest */}
            <div className="shrink-0 flex flex-col items-center justify-center">
              <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 border-gold-500 bg-amber-50/60 shadow-xs print:h-16 print:w-16">
                <DiyaIcon className="h-9 w-9 sm:h-12 sm:w-12 text-maroon-800 print:h-10 print:w-10" />
              </div>
              <span className="mt-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-maroon-900">
                Estd. 1954
              </span>
            </div>

            {/* Center Trust Details */}
            <div className="flex-1 text-center px-1">
              <h1 className="font-display text-lg sm:text-2xl print:text-xl font-black tracking-tight text-red-700 uppercase leading-snug">
                G.S.B. Sarvajanik Ganeshotsava Samiti{' '}
                <span className="text-sm sm:text-lg font-bold normal-case text-maroon-800">(Regd.)</span>
              </h1>
              <p className="mt-0.5 text-[11px] sm:text-xs print:text-[10px] font-semibold text-gray-800">
                {temple.registration}
              </p>
              <p className="mt-0.5 text-[11px] sm:text-xs print:text-[9.5px] text-gray-800 leading-tight">
                <strong>Office Add.:</strong> {temple.officeAddress}
              </p>
              <p className="mt-0.5 text-[10px] sm:text-xs print:text-[9px] text-gray-700 leading-tight">
                <strong>Tel.:</strong> {temple.phone} • <strong>Mobile:</strong> {temple.mobile} •{' '}
                <strong>E-mail:</strong> {temple.email} • <strong>Website:</strong> {temple.website}
              </p>
            </div>

            {/* Right Deity Medallion */}
            <div className="shrink-0 flex flex-col items-center justify-center">
              <div className="h-14 w-14 sm:h-20 sm:w-20 overflow-hidden rounded-full border-2 border-gold-500 shadow-xs print:h-16 print:w-16">
                <img
                  src={heroDeityImage}
                  alt="Lord Ganesha"
                  className="h-full w-full object-cover object-[52%_25%]"
                  style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                />
              </div>
              <span className="mt-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-gold-900">
                Ram Mandir
              </span>
            </div>
          </div>

          {/* Golden Divider Bar */}
          <div className="mt-2.5 h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 print:bg-amber-500" />
        </div>

        {/* 2. Metadata Bar: RECEIPT NO | CUSTOMER ID | DATE */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border-b-2 border-gray-300 pb-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-gray-900 print:text-xs">
          <div>
            <span className="text-gray-600">RECEIPT NO : </span>
            <span className="font-mono text-red-700 tracking-wider font-extrabold">{receiptNo}</span>
          </div>
          <div className="sm:text-center">
            <span className="text-gray-600">CUSTOMER ID : </span>
            <span className="font-mono text-maroon-900 tracking-wider font-extrabold">{customerId}</span>
          </div>
          <div className="sm:text-right">
            <span className="text-gray-600">DATE : </span>
            <span className="font-mono text-gray-900">{formattedDate}</span>
          </div>
        </div>

        {/* 3. Received with thanks from Shri/Smt/Ms. */}
        <div className="mt-3.5 space-y-1.5 text-xs sm:text-sm text-gray-900 print:text-xs">
          <p className="text-gray-600 font-medium">RECEIVED with thanks from Shri/Smt/Ms.</p>

          <div className="grid grid-cols-1 gap-1 pl-1">
            <div className="flex">
              <span className="w-28 shrink-0 font-bold uppercase text-gray-800">NAME :</span>
              <span className="font-bold text-gray-950 uppercase">{record.devoteeName}</span>
            </div>

            <div className="flex">
              <span className="w-28 shrink-0 font-bold uppercase text-gray-800">ADDRESS :</span>
              <span className="font-medium text-gray-900">
                {record.address || 'Dwarkanath Bhavan, Shree Ram Mandir Complex, Wadala, Mumbai 400031'}
              </span>
            </div>

            <div className="flex items-center">
              <span className="w-28 shrink-0 font-bold uppercase text-gray-800">MOBILE NO :</span>
              <span className="font-bold font-mono text-gray-900">{record.phone}</span>
              {record.gotra && (
                <span className="ml-6 text-gray-700">
                  <strong className="text-gray-800">GOTRA :</strong> {record.gotra}
                </span>
              )}
              {record.nakshatra && (
                <span className="ml-4 text-gray-700">
                  <strong className="text-gray-800">NAKSHATRA :</strong> {record.nakshatra}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Booking Detail Section */}
        <div className="mt-4 border-t border-gray-200 pt-3 text-xs sm:text-sm text-gray-900 print:text-xs">
          <p className="font-bold uppercase tracking-wider text-maroon-900">
            {record.type === 'seva' ? 'SEVA BOOKING DETAIL:' : 'DONATION BOOKING DETAIL:'}
          </p>

          <div className="mt-2 space-y-1.5 pl-1">
            <div className="flex">
              <span className="w-28 shrink-0 font-bold uppercase text-gray-800">TYPE :</span>
              <span className="font-bold uppercase text-gray-900">
                {record.type === 'seva' ? 'SEVA BOOKING' : 'DONATION'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline">
              <span className="w-28 shrink-0 font-bold uppercase text-gray-800">PAYMENT MODE :</span>
              <span className="font-medium text-gray-900">
                {record.paymentMode.toUpperCase()} | TRANSACTION NO ({record.paymentReference || record.receiptNo}) | TRANSACTION DATE ({formattedDate})
              </span>
            </div>

            <div className="flex flex-wrap items-baseline pt-0.5">
              <span className="w-28 shrink-0 font-bold uppercase text-gray-800">AMOUNT :</span>
              <span className="font-bold text-gray-950 font-mono text-sm sm:text-base print:text-sm">
                {record.total} Rs.{' '}
                <span className="font-sans font-medium text-xs sm:text-sm text-gray-800">
                  {`{IN WORD : ${numberToWordsIndian(record.total)}}`}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 5. 80G Tax Exemption & Education/Medical Aid Notice Box (Iconic Blue Box from PDF) */}
        <div className="mt-4 rounded-xl border-2 border-blue-600 bg-blue-50/50 p-2.5 sm:p-3 text-center print:mt-3 print:py-2">
          <p className="font-bold text-xs sm:text-sm print:text-xs uppercase tracking-wider text-blue-900">
            {temple.aidFundsNotice}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs print:text-[10px] font-semibold text-blue-800">
            {temple.section80GText}
          </p>
        </div>

        {/* 6. Computer Generated Disclaimer */}
        <div className="mt-2 text-center text-[10px] sm:text-xs print:text-[9.5px] text-gray-600 italic">
          This is a computer generated receipt. No signature required.
        </div>

        {/* 7. Bottom Itemized Table (Matches bottom 3-column table of PDF receipt) */}
        <div className="mt-3.5 print:mt-2.5">
          <table className="w-full border-collapse border border-gray-400 text-left text-xs sm:text-sm print:text-xs">
            <thead>
              <tr className="border-b border-gray-400 bg-gray-100 font-bold uppercase text-[10px] sm:text-xs text-gray-800">
                <th className="border-r border-gray-400 px-3 py-1.5 w-1/3">Devotee Name</th>
                <th className="border-r border-gray-400 px-3 py-1.5 w-5/12">Name of Seva / Purpose</th>
                <th className="px-3 py-1.5 w-1/4">Date of Seva</th>
              </tr>
            </thead>
            <tbody>
              {record.items && record.items.length > 0 ? (
                record.items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-gray-300">
                    <td className="border-r border-gray-300 px-3 py-2 font-semibold text-gray-900 uppercase">
                      {record.devoteeName}
                    </td>
                    <td className="border-r border-gray-300 px-3 py-2 text-gray-900">
                      <span className="font-bold">{item.name}</span>
                      {item.timing && <span className="text-xs text-gray-600 block">Timing: {item.timing}</span>}
                      <span className="text-xs font-mono font-medium text-gray-700 block">
                        Amount: {rupees(item.price)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-medium text-gray-900">
                      {record.preferredDate ? formatDate(record.preferredDate) : formattedDate}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 px-3 py-2 font-semibold text-gray-900 uppercase">
                    {record.devoteeName}
                  </td>
                  <td className="border-r border-gray-300 px-3 py-2 text-gray-900">
                    <span className="font-bold">General Temple Hundi / Trust Donation (Daan)</span>
                    <span className="text-xs font-mono font-medium text-gray-700 block">
                      Amount: {rupees(record.total)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono font-medium text-gray-900">
                    {formattedDate}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 8. Sevadar Notice & Prasad Instructions (from reference document) */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-2 text-[11px] sm:text-xs print:text-[10px] text-gray-700">
          <div>
            <p className="font-bold text-maroon-900">
              (Kindly quote your Customer ID: <span className="font-mono text-red-700 font-extrabold">{customerId}</span> in future communication)
            </p>
            <p className="text-gray-600 mt-0.5">
              {record.attendanceMode === 'absentia'
                ? 'Sankalp performed in-absentia by Vaidik. Blessed Prasad can be collected at Dwarkanath Bhavan counter.'
                : 'Present this official e-receipt at Dwarkanath Bhavan counter for Seva Prasadam.'}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block border-b border-gray-400 pb-0.5 font-bold text-gray-900">
              Board of Trustees & Celebration Committee
            </span>
            <p className="text-[10px] text-gray-600">G.S.B. Sarvajanik Ganeshotsava Samiti, Wadala</p>
          </div>
        </div>

        {/* 9. Official Social Media Channels */}
        <div className="mt-3 border-t border-gray-200 pt-2 text-center text-[10px] sm:text-xs print:text-[9px] text-gray-600">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="font-semibold text-gray-800">Follow us on social media:</span>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
            >
              <FacebookIcon className="h-3.5 w-3.5 text-blue-700" />
              <span>facebook.com/gsbsarvajanikganeshotsava</span>
            </a>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
            >
              <YouTubeIcon className="h-3.5 w-3.5 text-red-600" />
              <span>youtube.com/gsbsarvajanikganeshotsava</span>
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-pink-600 hover:underline"
            >
              <InstagramIcon className="h-3.5 w-3.5 text-pink-600" />
              <span>instagram.com/gsbsarvajanikganeshotsava</span>
            </a>
          </div>
          <p className="mt-1 font-mono text-[9.5px] print:text-[8.5px] text-gray-500">
            Official Portal: {temple.website} · Wadala Ram Mandir Complex
          </p>
        </div>
      </div>
    </div>
  );
}
