import { temple } from '../data/temple';
import { OrnamentalDivider } from './Ornaments';
import { ZapIcon, CardIcon, LockIcon, CertificateIcon, PhoneIcon, InstagramIcon, YouTubeIcon, FacebookIcon } from './Icons';
import type { TabId } from '../types';

export default function Footer({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/gsbsarvajanikganeshotsava';
  const youtubeUrl = import.meta.env.VITE_YOUTUBE_URL || 'https://www.youtube.com/gsbsarvajanikganeshotsava';
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || 'https://www.facebook.com/gsbsarvajanikganeshotsava';

  return (
    <footer className="mt-20 border-t border-maroon-100 bg-maroon-950 text-cream-200">
      <div className="container-page py-12">
        <OrnamentalDivider className="mb-10 opacity-60" icon="diya" />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="font-display text-xl font-semibold text-cream-50">{temple.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-cream-200/70">{temple.trustName}</p>
            <p className="mt-1 text-xs text-cream-200/50">{temple.registration}</p>

            {/* Social Media Links */}
            <div className="mt-5">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
                Connect With Us
              </span>
              <div className="mt-2.5 flex items-center gap-2.5">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-maroon-800 bg-maroon-900/80 text-cream-200 hover:border-gold-400 hover:bg-gold-500/20 hover:text-gold-300 transition-all hover:scale-105"
                    aria-label="Instagram"
                    title="Follow on Instagram"
                  >
                    <InstagramIcon className="h-4 w-4" />
                  </a>
                )}
                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-maroon-800 bg-maroon-900/80 text-cream-200 hover:border-gold-400 hover:bg-gold-500/20 hover:text-gold-300 transition-all hover:scale-105"
                    aria-label="YouTube"
                    title="Subscribe on YouTube"
                  >
                    <YouTubeIcon className="h-4 w-4" />
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-maroon-800 bg-maroon-900/80 text-cream-200 hover:border-gold-400 hover:bg-gold-500/20 hover:text-gold-300 transition-all hover:scale-105"
                    aria-label="Facebook"
                    title="Connect on Facebook"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
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
                <a href={`tel:${temple.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-gold-200">
                  <PhoneIcon className="h-3.5 w-3.5 text-gold-400" />
                  <span>{temple.phone}</span>
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
                  <button onClick={() => onNavigate(tab)} className="text-cream-200/80 hover:text-gold-200 transition-colors">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Official Trust & Payment Badges without emojis */}
        <div className="mt-8 rounded-xl border border-maroon-800 bg-maroon-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <span className="font-bold text-gold-300 uppercase tracking-wider">
              Official & Secure Portal
            </span>
            <div className="flex flex-wrap items-center gap-3 text-cream-200/90 font-medium">
              <span className="inline-flex items-center gap-1.5 rounded bg-maroon-950 px-2.5 py-1 border border-maroon-800">
                <ZapIcon className="h-3.5 w-3.5 text-gold-400" />
                <span>Instant UPI (GPay, PhonePe, Paytm, BHIM)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded bg-maroon-950 px-2.5 py-1 border border-maroon-800">
                <CardIcon className="h-3.5 w-3.5 text-gold-400" />
                <span>RuPay & NetBanking</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded bg-maroon-950 px-2.5 py-1 border border-maroon-800">
                <LockIcon className="h-3.5 w-3.5 text-gold-400" />
                <span>256-Bit SSL Encrypted</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded bg-maroon-950 px-2.5 py-1 border border-maroon-800">
                <CertificateIcon className="h-3.5 w-3.5 text-gold-400" />
                <span>Section 80G Tax Exempted</span>
              </span>
            </div>
          </div>
        </div>

        {/* Clone-site warning */}
        <div className="mt-6 rounded-xl border border-gold-700/40 bg-maroon-900/60 p-5">
          <p className="text-sm font-semibold text-gold-200">{temple.officialSiteNote}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-cream-200/70">
            The temple does not authorise any agent or third-party website to collect seva or
            donation amounts on its behalf. If you are asked to pay through any other channel,
            please call the temple office on {temple.phone} before paying.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-cream-200/10 pt-6 text-xs text-cream-200/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {temple.trustName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-cream-200/70 font-medium">
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold-300 transition-colors">
                Instagram
              </a>
            )}
            {youtubeUrl && (
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold-300 transition-colors">
                YouTube
              </a>
            )}
            {facebookUrl && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold-300 transition-colors">
                Facebook
              </a>
            )}
          </div>
          <p>{temple.officeHours}</p>
        </div>
      </div>
    </footer>
  );
}
