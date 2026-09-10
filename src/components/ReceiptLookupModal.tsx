import { useState } from 'react';
import { findBooking, getSavedBookings, type BookingRecord } from '../lib/bookingStore';
import ReceiptView from './ReceiptView';
import { rupees } from '../lib/format';

interface ReceiptLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptLookupModal({ isOpen, onClose }: ReceiptLookupModalProps) {
  const [query, setQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BookingRecord | null>(null);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const results = query.trim() ? findBooking(query) : getSavedBookings();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-maroon-950/70 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lookup-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gold-300 my-8">
        {selectedRecord ? (
          <ReceiptView record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-maroon-100 pb-4">
              <div>
                <h3 id="lookup-title" className="font-display text-2xl font-bold text-maroon-950">
                  Find Booking & E-Receipt
                </h3>
                <p className="mt-1 text-xs text-maroon-800/80">
                  Search by Mobile Number, Receipt ID (e.g. SEVA-2024-XXXX), or Devotee Name
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-maroon-700 hover:bg-maroon-50 transition-colors"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter 10-digit Phone Number or Receipt ID..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearched(true);
                  }}
                  className="field-input pl-10 text-base"
                  autoFocus
                />
                <svg
                  viewBox="0 0 24 24"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-maroon-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Results List */}
            <div className="mt-6 max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {results.length > 0 ? (
                results.map((b) => (
                  <div
                    key={b.receiptNo}
                    onClick={() => setSelectedRecord(b)}
                    className="group cursor-pointer rounded-xl border border-maroon-200/80 bg-cream-50/80 p-4 transition-all hover:bg-white hover:border-gold-500 hover:shadow-md flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-maroon-950 text-base">
                          {b.devoteeName}
                        </span>
                        <span className="rounded bg-gold-100 px-2 py-0.5 text-[10px] font-bold text-gold-950 border border-gold-300">
                          {b.receiptNo}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-maroon-800/75">
                        {b.phone} · {b.items ? `${b.items.length} sevas` : 'Donation'} · {new Date(b.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display text-lg font-bold text-maroon-900 block">
                        {rupees(b.total)}
                      </span>
                      <span className="text-xs font-semibold text-gold-800 group-hover:underline">
                        View Receipt →
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-maroon-200 p-8 text-center bg-cream-50/50">
                  <p className="text-sm font-medium text-maroon-900">
                    {searched ? 'No bookings found matching your search.' : 'No previous bookings recorded on this device yet.'}
                  </p>
                  <p className="mt-1 text-xs text-maroon-800/70">
                    Book any seva from the portal and your official e-receipt will appear here automatically.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="mt-6 border-t border-maroon-100 pt-3 text-center">
              <p className="text-xs text-maroon-800/70">
                Official Temple Record System · GSB Sarvajanik Ganeshotsava Samiti, Wadala
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
