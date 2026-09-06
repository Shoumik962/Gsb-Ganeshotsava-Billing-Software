import { temple } from '../data/temple';
import { OrnamentalDivider } from './Ornaments';
import type { TabId } from '../types';

export default function Footer({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  return (
    <footer className="mt-20 border-t border-maroon-100 bg-maroon-950 text-cream-200">
      <div className="container-page py-12">
        <OrnamentalDivider className="mb-10 opacity-60" icon="diya" />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="font-display text-xl font-semibold text-cream-50">{temple.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-cream-200/70">{temple.trustName}</p>
            <p className="mt-1 text-xs text-cream-200/50">{temple.registration}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">Visit</h4>
            <address className="mt-3 space-y-1 text-sm not-italic leading-relaxed text-cream-200/80">
              {temple.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-cream-200/80">
              <li>
                <a href={`tel:${temple.phone.replace(/\s/g, '')}`} className="hover:text-gold-200">
                  {temple.phone}
                </a>
              </li>
              <li>
                <a href={`tel:${temple.altPhone.replace(/\s/g, '')}`} className="hover:text-gold-200">
                  {temple.altPhone}
                </a>
              </li>
              <li>
                <a href={`mailto:${temple.email}`} className="break-all hover:text-gold-200">
                  {temple.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">Sections</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {(
                [
                  ['sevas', 'Book a Seva'],
                  ['donate', 'Offer a Donation'],
                  ['sevas', 'Pooja Timings'],
                  ['about', 'About & Contact'],
                ] as [TabId, string][]
              ).map(([tab, label]) => (
                <li key={label}>
                  <button onClick={() => onNavigate(tab)} className="text-cream-200/80 hover:text-gold-200">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Clone-site warning — a standard trust pattern for temple trusts. */}
        <div className="mt-10 rounded-xl border border-gold-700/40 bg-maroon-900/60 p-5">
          <p className="text-sm font-semibold text-gold-200">{temple.officialSiteNote}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-cream-200/70">
            The temple does not authorise any agent or third-party website to collect seva or
            donation amounts on its behalf. If you are asked to pay through any other channel,
            please call the temple office on {temple.phone} before paying.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-cream-200/10 pt-6 text-xs text-cream-200/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {temple.trustName}. All rights reserved.
          </p>
          <p>{temple.officeHours}</p>
        </div>
      </div>
    </footer>
  );
}
