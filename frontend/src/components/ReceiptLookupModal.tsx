import { useState } from 'react';
import { lookupReceipt } from '../lib/api';
import type { BookingRecord } from '../lib/bookingStore';
import ReceiptView from './ReceiptView';

interface ReceiptLookupModalProps { isOpen: boolean; onClose: () => void; }

export default function ReceiptLookupModal({ isOpen, onClose }: ReceiptLookupModalProps) {
  const [receiptNo, setReceiptNo] = useState('');
  const [phone, setPhone] = useState('');
  const [record, setRecord] = useState<BookingRecord | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setRecord(null);
    try { setRecord(await lookupReceipt(receiptNo.trim(), phone)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Receipt not found'); }
    finally { setLoading(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-maroon-950/75 p-4" role="dialog" aria-modal="true" aria-label="Lookup paid receipt">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-2xl font-bold text-maroon-950">Verified E-Receipt Lookup</h3>
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
      {record ? <ReceiptView record={record} onClose={() => setRecord(null)} /> : <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-maroon-800/80">Enter the complete receipt number and the same mobile number used at payment. Receipts are retrieved securely from the server, not this device.</p>
        <label className="block field-label">Receipt number
          <input className="field-input" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} placeholder="WAD… e.g. WAD1234567" required minLength={8}/>
        </label>
        <label className="block field-label">Mobile number
          <input className="field-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" required inputMode="tel"/>
        </label>
        {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button disabled={loading} className="btn-primary w-full" type="submit">{loading ? 'Searching…' : 'Find confirmed receipt'}</button>
      </form>}
    </div>
  </div>;
}
