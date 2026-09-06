import { temple } from '../data/temple';
import { SectionHeading, OrnamentalDivider, DiyaIcon } from './Ornaments';

/**
 * About & Contact. This section carries most of the site's trust weight — a
 * real address, real people to call, and a plain statement of who runs the
 * temple — so it is built out fully rather than reduced to a footer line.
 */
export default function AboutSection() {
  return (
    <section aria-labelledby="about-heading">
      <SectionHeading
        eyebrow="About the Temple"
        title="Visit & Contact"
        subtitle={`${temple.name} is managed by ${temple.trustName}. The seva counter at the temple can help with any booking, in person or over the phone.`}
      />

      <OrnamentalDivider className="my-9" icon="diya" />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* --- Address & hours --- */}
        <div className="card p-6">
          <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-maroon-900">
            <DiyaIcon className="h-5 w-5 text-gold-600" />
            Temple Address
          </h3>
          <address className="mt-4 space-y-1 text-base not-italic leading-relaxed text-maroon-800/85">
            <div className="font-semibold text-maroon-900">{temple.name}</div>
            {temple.addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </address>

          <dl className="mt-5 space-y-3 border-t border-maroon-100 pt-5 text-sm">
            <div>
              <dt className="text-maroon-800/65">Seva counter</dt>
              <dd className="mt-0.5 font-medium text-maroon-900">{temple.officeHours}</dd>
            </div>
            <div>
              <dt className="text-maroon-800/65">Managed by</dt>
              <dd className="mt-0.5 font-medium text-maroon-900">{temple.trustName}</dd>
              <dd className="mt-0.5 text-xs text-maroon-800/60">{temple.registration}</dd>
            </div>
          </dl>
        </div>

        {/* --- Contact --- */}
        <div className="card p-6">
          <h3 className="font-display text-xl font-semibold text-maroon-900">Get in Touch</h3>
          <p className="mt-2 text-sm leading-relaxed text-maroon-800/80">
            If you are unsure which seva to book, or would like to book over the phone, please
            call the temple office. Someone at the counter will help you.
          </p>

          <div className="mt-5 space-y-3">
            <a
              href={`tel:${temple.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-3 rounded-lg border border-maroon-100 bg-cream-50 px-4 py-3.5 hover:border-maroon-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon-800 text-cream-50">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6.5 4h3l1.5 3.7-2 1.4a11 11 0 0 0 5.9 5.9l1.4-2 3.7 1.5v3a1.5 1.5 0 0 1-1.6 1.5C10.9 18.4 5.6 13.1 5 6.6A1.5 1.5 0 0 1 6.5 4Z" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-maroon-800/65">Temple office</span>
                <span className="block font-semibold text-maroon-900">{temple.phone}</span>
              </span>
            </a>

            <a
              href={`tel:${temple.altPhone.replace(/\s/g, '')}`}
              className="flex items-center gap-3 rounded-lg border border-maroon-100 bg-cream-50 px-4 py-3.5 hover:border-maroon-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon-800 text-cream-50">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6.5 4h3l1.5 3.7-2 1.4a11 11 0 0 0 5.9 5.9l1.4-2 3.7 1.5v3a1.5 1.5 0 0 1-1.6 1.5C10.9 18.4 5.6 13.1 5 6.6A1.5 1.5 0 0 1 6.5 4Z" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-maroon-800/65">Seva counter</span>
                <span className="block font-semibold text-maroon-900">{temple.altPhone}</span>
              </span>
            </a>

            <a
              href={`mailto:${temple.email}`}
              className="flex items-center gap-3 rounded-lg border border-maroon-100 bg-cream-50 px-4 py-3.5 hover:border-maroon-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon-800 text-cream-50">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                  <path d="m4 7 8 5.5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-maroon-800/65">Email</span>
                <span className="block break-all font-semibold text-maroon-900">{temple.email}</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* --- Map placeholder --- */}
      <div className="mt-6 card overflow-hidden">
        <div className="flex aspect-[16/7] w-full items-center justify-center bg-gradient-to-br from-cream-200 via-cream-100 to-gold-100">
          {/* TODO: replace with a real map embed (Google Maps iframe or equivalent). */}
          <div className="px-6 text-center">
            <svg viewBox="0 0 24 24" className="mx-auto h-9 w-9 text-maroon-700/50" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <p className="mt-3 text-sm font-medium text-maroon-800/75">
              Map of {temple.name}, {temple.addressLines[1]}
            </p>
            <p className="mt-1 text-xs text-maroon-800/55">Map embed to be added</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gold-200 bg-gold-50/60 p-5">
        <h3 className="text-sm font-semibold text-maroon-900">{temple.officialSiteNote}</h3>
        <p className="mt-2 text-sm leading-relaxed text-maroon-800/85">
          The temple has not appointed any agent or third-party website to collect seva or donation
          amounts. If anything about a payment request seems unclear, please call {temple.phone}{' '}
          before paying.
        </p>
      </div>
    </section>
  );
}
