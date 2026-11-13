/**
 * Small line-art motifs used sparingly as dividers and section marks.
 * Deliberately thin-stroke and monochrome — they should read as an engraved
 * rule on an invitation card, never as decorative clip art competing with
 * the price list.
 */

export function DiyaIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.5c0 1.6-1.6 2.2-1.6 3.6a1.6 1.6 0 0 0 3.2 0c0-1.4-1.6-2-1.6-3.6Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M4 13.5h16c-.6 3.4-3.9 5.5-8 5.5s-7.4-2.1-8-5.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M12 10.8v2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function LotusIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 5.5c1.7 1.8 2.5 3.7 2.5 5.8S13.7 15.3 12 17c-1.7-1.7-2.5-3.6-2.5-5.7s.8-4 2.5-5.8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 17c-2.4 0-4.4-.8-5.9-2.4-1-1.1-1.6-2.3-1.8-3.7 1.9.2 3.5.9 4.8 2M12 17c2.4 0 4.4-.8 5.9-2.4 1-1.1 1.6-2.3 1.8-3.7-1.9.2-3.5.9-4.8 2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KalashIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3.2c.9 1 1.5 1.7 1.5 2.4a1.5 1.5 0 0 1-3 0c0-.7.6-1.4 1.5-2.4Z" fill="currentColor" />
      <path d="M8 7.6h8l-.7 1.7H8.7L8 7.6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path
        d="M8.7 9.3c-1.4 1-2.2 2.5-2.2 4.2 0 3 2.5 5 5.5 5s5.5-2 5.5-5c0-1.7-.8-3.2-2.2-4.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Ornamental horizontal rule — a hairline that tapers away from a centred
 * motif, echoing the printed border on a temple invitation.
 */
export function OrnamentalDivider({
  className = '',
  icon = 'lotus',
}: {
  className?: string;
  icon?: 'lotus' | 'diya' | 'kalash';
}) {
  const Icon = icon === 'diya' ? DiyaIcon : icon === 'kalash' ? KalashIcon : LotusIcon;
  return (
    <div className={`flex items-center justify-center gap-3 text-gold-600 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold-300 sm:w-24" />
      <Icon className="h-5 w-5 shrink-0" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold-300 sm:w-24" />
    </div>
  );
}

/** Section heading with an eyebrow label and optional centred ornament. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  centered = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <header className={centered ? 'text-center' : ''}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">{eyebrow}</p>
      )}
      <h2 className="mt-2 font-display text-3xl font-semibold text-maroon-900 sm:text-4xl">{title}</h2>
      {subtitle && (
        <p
          className={`mt-3 text-base leading-relaxed text-maroon-800/80 ${
            centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'
          }`}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
