/**
 * Seva catalogue — single source of truth for the seva list and the cart.
 *
 * This is the file a backend integration replaces first: swap `sevas` for the
 * response of `GET /api/sevas` and keep the `Seva` shape identical, and every
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

export const sevas: Seva[] = [
  // ---- Major Sevas ----
  {
    id: 'sampoorna-ganeshotsava',
    name: 'Sampoorna Ganeshotsava Seva',
    price: 700000,
    category: 'major',
    exceptEkadashi: true,
  },
  {
    id: 'vishesh-seva',
    name: 'Vishesh Seva',
    price: 300000,
    category: 'major',
    exceptEkadashi: true,
  },
  {
    id: 'anna-dana-seva',
    name: 'Anna Dana Seva',
    price: 200000,
    category: 'major',
    exceptEkadashi: true,
  },
  {
    id: 'udayasthaman-seva',
    name: 'Udayasthaman Seva',
    price: 125000,
    category: 'major',
    exceptEkadashi: true,
  },
  {
    id: 'sarva-seva',
    name: 'Sarva Seva',
    price: 50000,
    category: 'major',
    exceptEkadashi: true,
  },
  {
    id: 'full-day-seva',
    name: 'Full Day Seva',
    price: 30000,
    category: 'major',
    exceptEkadashi: true,
  },
  {
    id: 'maha-anna-santarpana',
    name: 'Maha Anna Santarpana Seva',
    price: 15000,
    category: 'major',
    timing: '1:00 p.m.',
    exceptEkadashi: true,
  },
  {
    id: 'anna-santarpana',
    name: 'Anna Santarpana Seva',
    price: 10000,
    category: 'major',
    timing: '1:00 p.m.',
    exceptEkadashi: true,
  },

  // ---- Pooja & Naivedya ----
  {
    id: 'mooda-ganapati-pooja',
    name: 'Mooda Ganapati Pooja',
    price: 15000,
    category: 'pooja-naivedya',
    timing: '10:30 a.m. (individual batch)',
    exceptEkadashi: true,
  },
  {
    id: 'mooda-ganapati-samoohik',
    name: 'Mooda Ganapati Pooja (Samoohik)',
    price: 7500,
    category: 'pooja-naivedya',
    timing: '8:30 a.m.',
    exceptEkadashi: true,
  },
  {
    id: 'mahapooja-madhyanha',
    name: 'Mahapooja (Madhyanha)',
    price: 2500,
    category: 'pooja-naivedya',
    timing: '1:00 p.m.',
  },
  {
    id: 'ganahoma',
    name: 'Ganahoma',
    price: 3000,
    category: 'pooja-naivedya',
    timing: '7:00, 8:00, 9:00, 10:00 & 11:00 a.m.',
    note: 'Last batch starts at 11:00 a.m.',
    exceptEkadashi: true,
  },
  {
    id: 'ranga-pooja',
    name: 'Ranga Pooja',
    price: 1500,
    category: 'pooja-naivedya',
    timing: '6:30 p.m.',
    exceptEkadashi: true,
  },
  {
    id: 'pushpa-pooja',
    name: 'Pushpa Pooja',
    price: 1000,
    category: 'pooja-naivedya',
    timing: '7:00 p.m.',
  },
  {
    id: 'ratri-pooja',
    name: 'Ratri Pooja',
    price: 1000,
    category: 'pooja-naivedya',
    timing: '9:00 p.m.',
  },
  {
    id: 'atharvashirsha-parayan',
    name: 'Ganapati Atharvashirsha Parayan',
    price: 1100,
    category: 'pooja-naivedya',
    timing: '5:00 p.m.',
    note: 'Sankalp at 5:00 p.m.',
  },
  {
    id: 'apoopa-naivedya',
    name: 'Apoopa Naivedya',
    price: 2500,
    category: 'pooja-naivedya',
    timing: '1:00 p.m.',
    exceptEkadashi: true,
  },
  {
    id: 'modaka-naivedya',
    name: 'Modaka Naivedya',
    price: 2500,
    category: 'pooja-naivedya',
    timing: '1:00 p.m.',
    exceptEkadashi: true,
  },
  {
    id: 'panchakhadya-naivedya',
    name: 'Panchakhadya Naivedya',
    price: 500,
    category: 'pooja-naivedya',
    exceptEkadashi: true,
  },

  // ---- Individual Offerings ----
  {
    id: 'suvarna-arpan',
    name: 'Suvarna Arpan Seva',
    price: 11000,
    category: 'offerings',
    note: '1 gm gold',
  },
  {
    id: 'raupya-arpan',
    name: 'Raupya Arpan Seva',
    price: 7500,
    category: 'offerings',
    note: '50 gms silver',
  },
  {
    id: 'sarvalankar-seva',
    name: 'Sarvalankar Seva',
    price: 5000,
    category: 'offerings',
  },
  {
    id: 'suvarna-durva-arpan',
    name: 'Suvarna Durva Arpan Seva',
    price: 5000,
    category: 'offerings',
  },
  {
    id: 'tulabhar-kanuka',
    name: 'Tulabhar (Kanuka)',
    price: 500,
    category: 'offerings',
    timing: '9:30 a.m.–12:30 p.m. & 4:00–6:00 p.m.',
    note: 'Material cost not included',
    exceptEkadashi: true,
  },
  {
    id: 'deeparadhana-seva',
    name: 'Deeparadhana Seva',
    price: 500,
    category: 'offerings',
    timing: '6:30 p.m.',
  },
  {
    id: 'doorvarpan-seva',
    name: 'Doorvarpan Seva',
    price: 500,
    category: 'offerings',
  },
  {
    id: 'prasad-seva',
    name: 'Prasad Seva',
    price: 1000,
    category: 'offerings',
  },
];

/** Lookup used by the cart to resolve stored ids back to full seva records. */
export const sevaById = new Map(sevas.map((s) => [s.id, s]));

export const sevasByCategory = (category: SevaCategory): Seva[] =>
  sevas.filter((s) => s.category === category);
