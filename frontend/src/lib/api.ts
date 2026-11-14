/** Browser API client. No fake payments, no client-side receipt issuance. */
import type { BookingRecord } from './bookingStore';

export interface DevoteeDetails {
  name: string; gotra: string; nakshatra: string; phone: string; email: string;
  preferredDate: string; attendanceMode?: 'in-person' | 'absentia'; address?: string;
}
export interface DonorDetails { name: string; phone: string; email: string; address?: string; }
export interface SevaBookingPayload { sevaIds: string[]; devotee: DevoteeDetails; amount: number; }
export interface DonationPayload { amount: number; donor: DonorDetails; }
export interface SubmitResult { ok: true; receipt: BookingRecord; }

const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new Error('Cannot connect to the API. Check that the FastAPI server is running.');
  }
  let data: unknown = null;
  try { data = await response.json(); } catch { /* non-JSON gateway error */ }
  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? (data as { detail: unknown }).detail : null;
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${response.status})`);
  }
  return data as T;
}

interface GatewayOrder {
  order_id: string; razorpay_order_id: string; key_id: string;
  amount_paise: number; currency: string; name: string; email?: string; phone: string; paymentMode: 'test' | 'live';
}
interface GatewayResult { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }
interface RazorpayCheckout {
  open(): void;
  on(name: string, cb: (event: unknown) => void): void;
}
declare global {
  interface Window { Razorpay?: new(options: Record<string, unknown>) => RazorpayCheckout }
}
let widgetLoad: Promise<void> | undefined;
function loadWidget(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!widgetLoad) widgetLoad = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => window.Razorpay ? resolve() : reject(new Error('Payment checkout unavailable'));
    script.onerror = () => reject(new Error('Could not load the Razorpay payment window'));
    document.head.appendChild(script);
  }).catch((error) => { widgetLoad = undefined; throw error; });
  return widgetLoad;
}
function openCheckout(order: GatewayOrder): Promise<GatewayResult> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) return reject(new Error('Payment widget not loaded'));
    let settled = false;
    const resolveOnce = (response: GatewayResult) => { if (!settled) { settled = true; resolve(response); } };
    const rejectOnce = (message: string) => { if (!settled) { settled = true; reject(new Error(message)); } };
    const widget = new window.Razorpay({
      key: order.key_id, order_id: order.razorpay_order_id,
      amount: order.amount_paise, currency: order.currency,
      name: 'Wadala Ganeshotsav', description: order.paymentMode === 'test' ? 'TEST MODE — no real money charged' : 'Secure payment',
      prefill: { name: order.name, email: order.email || '', contact: order.phone },
      handler: resolveOnce,
      modal: { ondismiss: () => rejectOnce('Payment window closed; no receipt has been issued.') },
    });
    widget.on('payment.failed', () => rejectOnce('Payment failed. If money was debited, contact the temple with your payment reference.'));
    widget.open();
  });
}
async function createAndPay(purpose: 'seva'|'donation', payload: SevaBookingPayload|DonationPayload): Promise<SubmitResult> {
  // Request the signed payment order from our server before opening checkout.
  // Server recalculates seva amounts from the authoritative price catalogue.
  const token=purpose==='seva'?sessionStorage.getItem('ganesh_devotee_token')||'':undefined;
  if (purpose==='seva' && !token) throw new Error('Create an account or sign in under My Account before booking a seva.');
  const order = await apiRequest<GatewayOrder>('/api/payments/orders', {
    method: 'POST', body: JSON.stringify({ purpose, ...payload }),
  },token);
  await loadWidget();
  const gateway = await openCheckout(order);
  const confirmed = await apiRequest<{ ok: true; receipt: BookingRecord }>('/api/payments/verify', {
    method: 'POST', body: JSON.stringify({ order_id: order.order_id, ...gateway }),
  });
  return confirmed;
}
export async function submitSevaBooking(payload: SevaBookingPayload): Promise<SubmitResult> { return createAndPay('seva', payload); }
export async function submitSevaDemo(payload: SevaBookingPayload): Promise<SubmitResult> {
  const token=sessionStorage.getItem('ganesh_devotee_token');
  if(!token)throw new Error('Sign in under My Account before creating a demo seva booking.');
  return apiRequest<SubmitResult>('/api/payments/demo-checkout',{
    method:'POST',body:JSON.stringify({purpose:'seva',...payload}),
  },token);
}
export async function submitDonation(payload: DonationPayload): Promise<SubmitResult> { return createAndPay('donation', payload); }
export async function lookupReceipt(receiptNo: string, phone: string): Promise<BookingRecord> {
  return apiRequest('/api/receipts/lookup', { method:'POST', body:JSON.stringify({ receipt_no: receiptNo, phone }) });
}
