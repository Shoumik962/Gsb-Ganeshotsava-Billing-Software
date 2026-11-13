/**
 * Seva catalogue — single source of truth for the seva list and the cart.
 *
 * Types and category labels only. The backend owns the pricing catalogue; request the
 * records from `GET /api/sevas` and keep the `Seva` shape identical, and every
 * consuming component (SevaList, CartSummary, SevaCheckoutForm) keeps working.
 * Cart entries reference sevas by `id`, so ids must stay stable across edits.
 */

export type SevaCategory = 'major' | 'pooja-naivedya' | 'offerings';

export interface Seva {
  /** Stable identifier — the cart stores these, never array indices. */
  id: string;
  name: string;
  /** Whole rupees. Formatted for display with formatINR(). */
  price: number;
  category: SevaCategory;
  /** Scheduled time, where the seva has a fixed slot. */
  timing?: string;
  /** Any additional condition worth surfacing on the card. */
  note?: string;
  /** Not performed on Ekadashi — rendered as a small caveat chip. */
  exceptEkadashi?: boolean;
}

export interface CategoryMeta {
  id: SevaCategory;
  label: string;
  blurb: string;
}

export const categories: CategoryMeta[] = [
  {
    id: 'major',
    label: 'Major Sevas',
    blurb: 'Whole-day and festival-scale sevas performed in the devotee’s name.',
  },
  {
    id: 'pooja-naivedya',
    label: 'Pooja & Naivedya',
    blurb: 'Daily poojas and offerings of naivedya at their appointed hour.',
  },
  {
    id: 'offerings',
    label: 'Individual Offerings',
    blurb: 'Smaller personal offerings that may be made on any day of the festival.',
  },
];

