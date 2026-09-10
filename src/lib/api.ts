/**
 * ============================================================================
 * BACKEND INTEGRATION POINT
 * ============================================================================
 * Every network call the site will ever make lives in this file. Right now
 * both functions are mocked — they wait briefly and return a fake receipt
 * number. No component below this layer knows that: they await a promise and
 * render whatever comes back, so swapping in the real implementation is a
 * change to this file alone.
 *
 * When the backend and payment gateway exist:
 *   1. Replace the body of each function with the real fetch + Razorpay flow.
 *   2. Keep the argument and return shapes below unchanged.
 *   3. Add error handling — the callers currently assume success, so they will
 *      need a rejected-promise path once real failures are possible.
 */

export interface DevoteeDetails {
  name: string;
  gotra: string;
  nakshatra: string;
  phone: string;
  email: string;
  preferredDate: string;
  attendanceMode?: 'in-person' | 'absentia';
}

export interface SevaBookingPayload {
  /** Ids from data/sevas.ts — the server re-prices these; never trust `amount`. */
  sevaIds: string[];
  devotee: DevoteeDetails;
  /** Client-side total, sent for display reconciliation only. */
  amount: number;
}

export interface DonorDetails {
  name: string;
  phone: string;
  email: string;
  /** Optional, for an 80G receipt. Not validated client-side. */
  pan: string;
  address: string;
}

export interface DonationPayload {
  amount: number;
  donor: DonorDetails;
}

export interface SubmitResult {
  ok: true;
  receiptNo: string;
}

/** Stand-in for the receipt number the backend will issue. */
const mockReceiptNo = (prefix: string): string =>
  `${prefix}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Book every seva currently in the cart.
 *
 * TODO: replace with real payment gateway + backend call
 *   const order = await fetch('/api/bookings', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *   }).then((r) => r.json());
 *   // then hand order.razorpayOrderId to the Razorpay checkout widget and
 *   // confirm the signature server-side before showing a receipt.
 */
export async function submitSevaBooking(payload: SevaBookingPayload): Promise<SubmitResult> {
  console.info('[mock] seva booking submitted', payload);
  await delay(900);
  return { ok: true, receiptNo: mockReceiptNo('SEVA') };
}

/**
 * Record a general donation (hundi) — a separate flow from seva booking.
 *
 * TODO: replace with real payment gateway + backend call
 *   POST /api/donations, then the same Razorpay order + verification flow.
 */
export async function submitDonation(payload: DonationPayload): Promise<SubmitResult> {
  console.info('[mock] donation submitted', payload);
  await delay(900);
  return { ok: true, receiptNo: mockReceiptNo('DAAN') };
}
