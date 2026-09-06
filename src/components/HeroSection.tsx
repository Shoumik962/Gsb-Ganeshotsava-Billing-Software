import { temple } from '../data/temple';
import { glanceTimings } from '../data/timings';
import { DiyaIcon, OrnamentalDivider } from './Ornaments';
import heroDeityImage from '../assets/heroDeityImage.jpeg';
import type { TabId } from '../types';

export default function HeroSection({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Cream ground the image dissolves into at its edges. */}
      <div className="absolute inset-0 bg-cream-100" aria-hidden="true" />

      {/*
        Ganpati Bappa, filling the section edge to edge.

        The image carries a radial `mask-image`, so it dissolves into the cream
        ground at every edge rather than ending on a hard rectangle. The
        gradient layers under it only cover where copy actually sits, leaving
        the murti itself at full strength.
      */}
      {/*
        Desktop only: the photograph occupies the right ~62% of the section as
        a background layer, feathered on every edge so it dissolves into the
        cream rather than ending on a rectangle. On mobile this layer is hidden
        entirely — a portrait image and a block of copy cannot share a narrow
        viewport without the text landing on the murti's face, so the small
        screen stacks them instead (see the <img> inside the flow below).
      */}
      <div className="absolute inset-0 hidden lg:block lg:left-[38%]" aria-hidden="true">
        <img
          src={heroDeityImage}
          alt=""
          className="h-full w-full object-cover object-[52%_28%]"
          style={{
            maskImage:
              'radial-gradient(ellipse 86% 78% at 50% 42%, #000 52%, rgba(0,0,0,0.55) 76%, transparent 94%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 86% 78% at 50% 42%, #000 52%, rgba(0,0,0,0.55) 76%, transparent 94%)',
          }}
        />
        {/* Feather the inner (left) edge into the copy column. */}
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-cream-100 to-transparent" />
        {/* Soften the top and bottom seams into the header and next section. */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cream-100 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-cream-100 to-transparent" />
      </div>

      <div className="container-page relative pb-16 pt-6 sm:pb-20 lg:py-32">
        {/* Mobile: Bappa as a full-width block above the copy, feathered at the
            edges to match the desktop treatment. Hidden on lg, where the
            background layer above takes over. */}
        <div className="relative -mx-5 mb-8 sm:-mx-6 lg:hidden">
          <img
            src={heroDeityImage}
            alt="Shree Ganpati Bappa"
            className="h-[46vh] max-h-[26rem] min-h-[18rem] w-full object-cover object-[50%_30%]"
            style={{
              maskImage:
                'radial-gradient(ellipse 90% 84% at 50% 46%, #000 54%, rgba(0,0,0,0.5) 78%, transparent 96%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 90% 84% at 50% 46%, #000 54%, rgba(0,0,0,0.5) 78%, transparent 96%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cream-100 to-transparent" />
        </div>

        {/* Copy occupies the left; the deity's face reads through on the right. */}
        <div className="max-w-xl animate-fade-up text-center lg:max-w-[34rem] lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/70 bg-cream-50/85 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-800 backdrop-blur-sm">
            <DiyaIcon className="h-4 w-4" />
            {temple.festival} · Sevas Open
          </p>

          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] text-maroon-950 sm:text-6xl lg:text-7xl">
            {temple.name}
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-maroon-900 sm:text-xl">
            Sarve santu niramayah. You are welcome to book a seva in your name or offer a
            donation to the temple — both take only a minute, and the exact amount is shown
            before you pay.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <button onClick={() => onNavigate('sevas')} className="btn-primary sm:px-8">
              Book a Seva
            </button>
            <button
              onClick={() => onNavigate('donate')}
              className="btn-secondary bg-cream-50/90 backdrop-blur-sm sm:px-8"
            >
              Offer a Donation
            </button>
          </div>

          <p className="mt-6 text-sm text-maroon-900">
            Need help? Call the temple office on{' '}
            <a
              href={`tel:${temple.phone.replace(/\s/g, '')}`}
              className="font-semibold text-maroon-900 underline underline-offset-2"
            >
              {temple.phone}
            </a>
          </p>
        </div>

        <OrnamentalDivider className="mt-16 lg:mt-24" icon="kalash" />

        {/* --- Key timings at a glance --- */}
        <div className="relative mt-10">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">
            Today at the Temple
          </h2>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {glanceTimings.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-maroon-100 bg-cream-50/85 px-4 py-4 text-center backdrop-blur-sm"
              >
                <dt className="text-sm font-medium leading-snug text-maroon-800/85">{row.seva}</dt>
                <dd className="mt-1.5 font-display text-lg font-semibold text-maroon-900">
                  {row.time}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-center text-sm text-maroon-800/75">
            Full pooja schedule is listed with the{' '}
            <button
              onClick={() => onNavigate('sevas')}
              className="font-semibold text-maroon-900 underline underline-offset-2"
            >
              seva list
            </button>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
