import { temple } from '../data/temple';
import { glanceTimings } from '../data/timings';
import { DiyaIcon, OrnamentalDivider } from './Ornaments';
import { ZapIcon, CertificateIcon } from './Icons';
import heroDeityImage from '../assets/heroDeityImage.jpeg';
import type { TabId } from '../types';

export default function HeroSection({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Cream ground the image dissolves into at its edges. */}
      <div className="absolute inset-0 bg-cream-100" aria-hidden="true" />

      {/*
        Ganpati Bappa, filling the section edge to edge.
        Feathered on every edge so it dissolves seamlessly into the cream background.
      */}
      <div className="absolute inset-0 hidden lg:block lg:left-[44%]" aria-hidden="true">
        <img
          src={heroDeityImage}
          alt="Shree Ganpati Bappa"
          className="h-full w-full object-cover object-[52%_25%]"
          style={{
            maskImage:
              'radial-gradient(ellipse 85% 80% at 52% 40%, #000 50%, rgba(0,0,0,0.5) 75%, transparent 95%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 85% 80% at 52% 40%, #000 50%, rgba(0,0,0,0.5) 75%, transparent 95%)',
          }}
        />
        {/* Feather the inner (left) edge into the copy column. */}
        <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-cream-100 via-cream-100/70 to-transparent" />
        {/* Soften the top and bottom seams into the header and next section. */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cream-100 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-cream-100 to-transparent" />
      </div>

      <div className="container-page relative pb-14 pt-6 sm:pb-16 lg:py-20">
        {/* Mobile: Deity image full-width block above the copy */}
        <div className="relative -mx-5 mb-6 sm:-mx-6 lg:hidden">
          <img
            src={heroDeityImage}
            alt="Shree Ganpati Bappa"
            className="h-[44vh] max-h-[24rem] min-h-[16rem] w-full object-cover object-[50%_25%]"
            style={{
              maskImage:
                'radial-gradient(ellipse 90% 84% at 50% 46%, #000 54%, rgba(0,0,0,0.5) 78%, transparent 96%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 90% 84% at 50% 46%, #000 54%, rgba(0,0,0,0.5) 78%, transparent 96%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cream-100 to-transparent" />
        </div>

        {/* Copy Column */}
        <div className="max-w-xl animate-fade-up text-center lg:max-w-[32rem] lg:text-left">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/80 bg-gradient-to-r from-cream-50 via-white to-gold-50/60 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-gold-900 shadow-sm backdrop-blur-sm">
              <DiyaIcon className="h-4 w-4 text-gold-600 animate-pulse" />
              <span>{temple.festival} · Sevas Open</span>
            </div>
          </div>

          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-maroon-950 sm:text-5xl lg:text-6xl leading-[1.08]">
            {temple.name}
          </h1>

          <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-900 sm:text-sm">
            {temple.trustName} · Dwarkanath Bhavan
          </p>

          <p className="mt-4 text-base leading-relaxed text-maroon-900/90 sm:text-lg">
            Sarve santu niramayah. You are welcome to book a seva in your name or offer a
            donation to the temple — both take only a minute, and the exact amount is shown
            before you pay.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <button onClick={() => onNavigate('sevas')} className="btn-primary sm:px-8 shadow-md hover:shadow-lg transition-all">
              Book a Seva
            </button>
            <button
              onClick={() => onNavigate('donate')}
              className="btn-secondary bg-cream-50/95 backdrop-blur-sm sm:px-8 shadow-sm hover:shadow-md transition-all"
            >
              Offer a Donation
            </button>
          </div>

          {/* Trust Highlights without emojis */}
          <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-medium text-maroon-900/85">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-50/80 px-2.5 py-1 border border-maroon-200/60">
              <ZapIcon className="h-3.5 w-3.5 text-gold-700" />
              <span>Instant UPI & RuPay</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-50/80 px-2.5 py-1 border border-maroon-200/60">
              <CertificateIcon className="h-3.5 w-3.5 text-gold-700" />
              <span>Section 80G Tax Exemption</span>
            </span>
          </div>
        </div>

        <OrnamentalDivider className="mt-14 lg:mt-20" icon="kalash" />

        {/* --- Key timings at a glance --- */}
        <div className="relative mt-12">
          <div className="text-center">
            <span className="inline-block rounded-full bg-white/30 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-900 border border-gold-400/70 shadow-sm backdrop-blur-md">
              Daily Schedule
            </span>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-maroon-950 drop-shadow-sm">
              Today at the Temple
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-maroon-900/90 font-medium drop-shadow-sm">
              Key pooja and aarti timings for devotees
            </p>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {glanceTimings.map((row) => (
              <div
                key={row.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/40 bg-white/15 p-5 text-center shadow-xl backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-2 hover:bg-white/25 hover:border-gold-400/70 hover:shadow-2xl overflow-hidden"
                style={{ boxShadow: '0 4px 24px rgba(109,38,32,0.10), inset 0 1px 0 rgba(255,255,255,0.35)' }}
              >
                {/* Gold shimmer top line on hover */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Subtle inner glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                
                <div className="relative">
                  <span className="mx-auto mb-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/40 text-gold-900 border border-gold-400/60 group-hover:bg-maroon-800/90 group-hover:text-cream-50 group-hover:border-maroon-700 transition-colors duration-300 shadow-sm backdrop-blur-sm">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 7.5V12l3 1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <dt className="text-sm font-bold leading-snug text-maroon-950 drop-shadow-sm group-hover:text-maroon-900 transition-colors">
                    {row.seva}
                  </dt>
                </div>

                <dd className="relative mt-3.5 inline-block rounded-lg border border-gold-400/60 bg-white/30 px-3 py-1.5 font-display text-lg font-bold text-maroon-950 shadow-sm backdrop-blur-sm group-hover:bg-gold-100/60 group-hover:border-gold-500 transition-colors">
                  {row.time}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-center text-sm font-medium text-maroon-950/90 drop-shadow-sm">
            Full pooja schedule with complete details is listed with the{' '}
            <button
              onClick={() => onNavigate('sevas')}
              className="font-bold text-maroon-950 underline underline-offset-4 hover:text-maroon-700"
            >
              seva list
            </button>
            .
          </p>
        </div>

        {/* --- How It Works for Devotees --- */}
        <div className="mt-16 rounded-2xl border border-white/30 bg-white/15 p-6 sm:p-8 backdrop-blur-md shadow-xl"
          style={{ boxShadow: '0 8px 40px rgba(109,38,32,0.12), inset 0 1px 0 rgba(255,255,255,0.3)' }}
        >
          {/* Soft inner top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent rounded-t-2xl" />

          <div className="text-center">
            <span className="inline-block rounded-full bg-white/30 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-950 border border-gold-400/60 backdrop-blur-sm">
              Simple & Transparent
            </span>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-maroon-950 drop-shadow-sm">
              How to Book Your Seva
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-maroon-900/90 font-medium drop-shadow-sm">
              3 effortless steps for devotees in Mumbai and worldwide
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: 1,
                title: 'Select Seva & Sankalp',
                body: 'Choose your pooja, select Attendance Mode (In-Person or In-Absentia), and enter Gotra & Name.',
              },
              {
                step: 2,
                title: 'Instant Official E-Receipt',
                body: 'Receive your official receipt with verification QR code, print slip, and 1-click WhatsApp share.',
              },
              {
                step: 3,
                title: 'Pooja & Prasad Collection',
                body: 'Attend at Dwarkanath Bhavan or have the Sankalp chanted by the Vaidik in absentia.',
              },
            ].map(({ step, title, body }) => (
              <div
                key={step}
                className="group relative rounded-2xl border border-white/35 bg-white/20 p-5 text-center backdrop-blur-sm shadow-md hover:bg-white/30 hover:border-gold-400/60 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                style={{ boxShadow: '0 2px 16px rgba(109,38,32,0.08), inset 0 1px 0 rgba(255,255,255,0.4)' }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                <span className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-maroon-800/90 font-display text-lg font-bold text-cream-50 shadow-md border border-maroon-700/60 group-hover:bg-maroon-900 group-hover:scale-110 transition-all duration-300">
                  {step}
                </span>
                <h3 className="relative mt-3.5 font-display text-lg font-bold text-maroon-950 drop-shadow-sm">
                  {title}
                </h3>
                <p className="relative mt-1.5 text-xs sm:text-sm leading-relaxed text-maroon-900/85">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
