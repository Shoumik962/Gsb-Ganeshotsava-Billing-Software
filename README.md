# Shree Ganesh Mandir — Ganeshotsava Sevas & Donations

Frontend for a temple's seva booking and donation site. React + Vite + Tailwind,
TypeScript, no backend yet — all submissions are mocked at a single integration point.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle
```

## Where to plug in the backend

Everything network-facing lives in [src/lib/api.ts](src/lib/api.ts). It exports two
functions, both currently returning a fake receipt number after a short delay:

- `submitSevaBooking({ sevaIds, devotee, amount })`
- `submitDonation({ amount, donor })`

Replace the bodies with the real `fetch` + Razorpay flow and keep the argument and
return shapes; no component needs to change. The callers currently assume success, so
add a rejected-promise path once real failures are possible.

**Note on `amount`:** it is sent for display reconciliation only. The server should
re-price `sevaIds` from its own catalogue rather than trusting the client's total.

## Structure

| Path | Role |
|---|---|
| [src/data/sevas.ts](src/data/sevas.ts) | All 27 sevas — id, name, price, category, timing, notes. Swap for `GET /api/sevas`. |
| [src/data/timings.ts](src/data/timings.ts) | Pooja schedule + the sevadar guidance note. |
| [src/data/temple.ts](src/data/temple.ts) | Temple name, trust, address, contacts — edit this one file to re-point the site. |
| [src/hooks/useCart.tsx](src/hooks/useCart.tsx) | Cart context: `addToCart`, `removeFromCart`, `toggle`, derived `total`. |
| [src/lib/api.ts](src/lib/api.ts) | The only place a network call is made. |
| [src/lib/format.ts](src/lib/format.ts) | `rupees()` — Indian digit grouping (7,00,000 not 700,000). |
| [src/components/](src/components/) | Header, Footer, HeroSection, SevaCard, SevaList, CartSummary, CartDrawer, SevaCheckoutForm, DonationForm, TimingsTable, AboutSection, Ornaments. |

Seva ids are stable and referenced by the cart — renaming one silently drops it from any
saved cart, so treat them as a public contract.

## Design decisions worth keeping

- **Two separate flows.** Seva booking is a cart (multiple sevas, devotee/gotra/nakshatra
  details, date). Donation is just an amount. They are deliberately not merged.
- **No quantity steppers.** Sevas are inherently quantity-1, so the cart is a set of ids,
  not line items with counts.
- **The total is never hidden.** It is on the sidebar, the mobile sticky bar, the review
  step, and the pay button itself. Both flows require an explicit review before payment.
- **No dark patterns.** No pre-ticked recurring donation, no countdown timers, no fees
  revealed late — both review screens state that nothing is added to the amount.
- **Trust signals.** The "only official website" line appears in the header strip, footer,
  and About section; the footer and About both warn that no third-party agent is authorised
  to collect payments. This is a standard defence against temple clone-site scams.

## Placeholders to replace before launch

- `src/assets/heroDeityImage.jpeg` — currently the supplied Ganpati photo.
- Everything in `src/data/temple.ts` — name, trust name, registration number, address,
  phone numbers, email are all placeholders.
- The map embed in [src/components/AboutSection.tsx](src/components/AboutSection.tsx) is a
  styled placeholder awaiting a real Google Maps iframe.

## Known issue

`npm audit` reports two advisories against esbuild/Vite. Both affect the **dev server
only**, not the production bundle. The fix requires Vite 8, which needs a newer Node than
the v20.9 this was built against — worth doing when the Node version is bumped.
