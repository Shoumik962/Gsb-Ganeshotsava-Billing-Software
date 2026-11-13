/** Daily pooja schedule, shown as its own table rather than mixed into prices. */

export interface TimingRow {
  id: string;
  seva: string;
  time: string;
  note?: string;
}

export const timings: TimingRow[] = [
  { id: 't-ganahoma', seva: 'Ganahoma', time: '7:00, 8:00, 9:00, 10:00 & 11:00 a.m.', note: 'Last batch starts 11:00 a.m.' },
  { id: 't-mooda-samoohik', seva: 'Mooda Ganapati (Samoohik + Individual morning batch)', time: '8:30 a.m.' },
  { id: 't-mooda-individual', seva: 'Mooda Ganapati (Individual)', time: '10:30 a.m.' },
  { id: 't-tulabhar', seva: 'Tulabhar', time: '9:30 a.m.–12:30 p.m. & 4:00–6:00 p.m.', note: 'Except on Ekadashi' },
  { id: 't-mahapooja', seva: 'Mahapooja, Anna Santarpan & Apoopa / Modaka Naivedya', time: '1:00 p.m.' },
  { id: 't-ranga', seva: 'Ranga Pooja / Deeparadhana', time: '6:30 p.m.' },
  { id: 't-pushpa', seva: 'Pushpa Pooja', time: '7:00 p.m.' },
  { id: 't-ratri', seva: 'Ratri Pooja', time: '9:00 p.m.' },
];

export const sevadarGuidance =
  'Sevadars are requested to co-operate by adhering to Pooja timings. Sevadars should reach at least 30 minutes before the scheduled time — if they reach after the scheduled time, Pooja on their behalf will be done by the designated Vaidik.';

/** Shown in the hero as "at a glance" — the handful people ask about most. */
export const glanceTimings: TimingRow[] = [
  timings[0],
  timings[4],
  timings[5],
  timings[7],
];
