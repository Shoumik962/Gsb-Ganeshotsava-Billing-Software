/** Receipt view contract. Authoritative records are stored in PostgreSQL and served by FastAPI. */
export interface BookingRecord {
  id: string;
  receiptNo: string;
  customerId?: string;
  devoteeCode?: string;
  type: 'seva' | 'donation';
  createdAt: string;
  devoteeName: string;
  phone: string;
  address?: string;
  email?: string;
  gotra?: string;
  nakshatra?: string;
  preferredDate?: string;
  attendanceMode?: 'in-person' | 'absentia';
  pan?: string;
  items?: { id: string; name: string; price: number; timing?: string; }[];
  total: number;
  status: string;
  isTest: boolean;
  paymentEnvironment: 'test' | 'live' | 'unknown' | 'demo';
  isDemo?: boolean;
  paymentReference?: string;
  paymentMode: string;
}
