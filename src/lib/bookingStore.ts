export interface BookingRecord {
  id: string;
  receiptNo: string;
  type: 'seva' | 'donation';
  createdAt: string;
  devoteeName: string;
  phone: string;
  email?: string;
  gotra?: string;
  nakshatra?: string;
  preferredDate?: string;
  attendanceMode?: 'in-person' | 'absentia';
  pan?: string;
  items?: {
    id: string;
    name: string;
    price: number;
    timing?: string;
  }[];
  total: number;
  status: 'Confirmed' | 'Completed';
  paymentMode: 'Online Payment (UPI/Card)' | 'Counter Payment';
}

const STORAGE_KEY = 'gsb_ram_mandir_bookings';

export function getSavedBookings(): BookingRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as BookingRecord[];
  } catch {
    return [];
  }
}

export function saveBooking(record: BookingRecord): void {
  try {
    const existing = getSavedBookings();
    const updated = [record, ...existing.filter((b) => b.receiptNo !== record.receiptNo)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save booking to localStorage', err);
  }
}

export function findBooking(query: string): BookingRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = getSavedBookings();
  return all.filter((b) => {
    return (
      b.receiptNo.toLowerCase().includes(q) ||
      b.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      b.devoteeName.toLowerCase().includes(q)
    );
  });
}
