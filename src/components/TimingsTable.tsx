import { timings, sevadarGuidance } from '../data/timings';
import { SectionHeading } from './Ornaments';

/**
 * Pooja schedule, kept deliberately separate from the price list — timings
 * constrain when a devotee can actually attend, so they get their own table
 * rather than being mixed into the seva rows.
 */
export default function TimingsTable() {
  return (
    <section aria-labelledby="timings-heading">
      <SectionHeading
        eyebrow="Daily Schedule"
        title="Pooja & Seva Timings"
        subtitle="Sevas are performed at these hours through the festival. Please plan your visit around the time of the seva you have booked."
      />

      <div className="mt-8 overflow-hidden rounded-xl border border-maroon-100 bg-white shadow-soft">
        {/* Scrolls within its own container on narrow screens; the page body
            itself never scrolls sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <caption className="sr-only" id="timings-heading">
              Pooja and seva timings
            </caption>
            <thead>
              <tr className="border-b border-maroon-200 bg-cream-100">
                <th scope="col" className="px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold-800">
                  Seva
                </th>
                <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.14em] text-gold-800">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-maroon-100">
              {timings.map((row) => (
                <tr key={row.id} className="align-top">
                  <th scope="row" className="px-5 py-4 text-left">
                    <span className="block text-base font-medium leading-snug text-maroon-900">
                      {row.seva}
                    </span>
                    {row.note && (
                      <span className="mt-1 block text-sm font-normal text-maroon-800/70">
                        {row.note}
                      </span>
                    )}
                  </th>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-display text-lg font-semibold text-maroon-900">
                    {row.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gentle guidance, not an alarm banner. */}
      <aside className="mt-6 rounded-xl border border-gold-200 bg-gold-50/60 p-5">
        <h3 className="text-sm font-semibold text-maroon-900">A request to sevadars</h3>
        <p className="mt-2 text-sm leading-relaxed text-maroon-800/85">{sevadarGuidance}</p>
      </aside>
    </section>
  );
}
