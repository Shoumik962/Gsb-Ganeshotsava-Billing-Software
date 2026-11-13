# Wadala Ganeshotsav — Detailed API, Identity & Launch Handover

## 1. Source review and pain points

The uploaded version contained a React/Vite/TypeScript frontend, 27 seva catalogue entries, donation forms, cart flow, mocked payment success, randomly generated receipt numbers, and `localStorage` receipt lookup. It did **not** include FastAPI, PostgreSQL persistence, identity roles, household deduplication, consent-aware address mapping or verified Razorpay payments. This implementation introduces those modules while preserving the original visual components.

### Main problems resolved in code

| Pain point | Intervention | Caution |
|---|---|---|
| Multiple user records for one person | Name/contact matching creates a candidate; admin reviews and chooses surviving ID | No automated merge; identity verification evidence still operational |
| Same mobile for several relatives | Separate `DEV-*` individual codes plus shared `FAM-*` code | Shared contact ≠ same person |
| Address duplication and future routes | Canonical key including flat/unit, building, street, locality, city, state, pincode | Manual verified coordinate step; postal validation/geocoder not yet automated |
| Different families in one building | Unit is part of address identity; family-address link is independent | Flat numbers must be collected accurately |
| Guessing relationships | Admin links members; family suggestions from shared contact/exact unit | Suggested family membership is **not** automatic |
| Unconsented household listing | Family visit consent + evidence audit; verified addresses only | Staff must obtain real permission; backend cannot prove offline verbal consent itself |
| Staff GPS privacy | Current-point only, short TTL, user-triggered, revocable | Schedule purge job for expired rows |
| Duplicate house visits | Households returned once per family/address, assignments track status | No multi-sevadar route optimization or conflict locking across distinct sevadars yet |
| Fake receipt acceptance | Server re-prices, gateway creates order, signature verified, captured status fetched | Integration tests use provider mocks; conduct real Razorpay sandbox checkout |
| Browser-only receipt records | PostgreSQL `payment_orders` and `receipts` tables | Receipt retrieval rate limits, email/OTP and finance reconciliation are pre-launch work |

### Sandbox receipts and developer setup (November 2026)

Both OSes use the same backend requirements. Separate setup scripts create platform-appropriate `backend/.venv` directories and check installed dependencies. See `DEVELOPER_SETUP_AND_RAZORPAY_TESTING.md` for commands, test-mode credentials, receipt validation and manual UAT cases. New migration `0002_payment_mode` records whether each order used `test` or `live` keys; test receipts are labeled `TEST-RCP-*` and visibly marked **invalid**. Production rejects test credentials; developer/staging rejects live credentials. This protects finance reporting from accidentally counting sandbox receipts as paid donations.

## 2. Identity model and review process

`devotees.id` and `families.id` are UUID primary keys; `devotee_code` and `family_code` are stable public IDs. All direct ID references use UUID FKs; user-visible codes are independent of names, phones, streets and future address changes. `family_members` is a many-to-many relationship; one person can belong to multiple household/family contexts only when allowed by the Trust's agreed business rules.

**Matching is conservative:** normalized names using Python standard-library difflib.SequenceMatcher, shared mobile, shared email, matching DOB (if collected), and an optional government-ID digest when a lawful collection/verification policy exists. The `dedup_rules` threshold can be configured by super admin (`/api/dedup/rules/review-threshold?score=50`). Identical family phone numbers are merely signals. No candidates are ever merged automatically; a `duplicate_decisions` row preserves every decision reason. True same-person merges create a `merge_audit` and tombstone the losing Devotee ID.

**Payment entry limitation:** Checkout does not currently verify a public person's possession of a phone or email. Each verified paid order creates a new provisional Devotee record and generates candidate alerts. Staff can resolve those through review; subsequent bookings cannot safely reuse an existing Devotee ID until verified customer login/OTP is delivered. This is a deliberate prevention of false-positive identity reuse; a verified self-service identity step is a high-priority Phase 2 requirement.

**Family identification:** After an individual has an attached verified unit address, `/api/devotees/{id}/family-suggestions` proposes existing Family IDs with evidence reasons from exact unit/contact overlap. An administrator confirms actual relationships through `/api/families/{id}/members`; do not infer kinship solely from address.

## 3. API inventory

| Group | Methods / routes | Scope |
|---|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` | Login, JWT self |
| Users | `POST /api/admin/users` | Super admin creates admin/sevadar |
| Devotee | `POST /api/devotees`, `GET /api/devotees`, `GET /api/devotees/{id}/family-suggestions` | Admin, review-assisted registration |
| Family | `POST /api/families`, `GET /api/families`, `POST /api/families/{id}/members`, `POST /api/families/{id}/visit-consent` | Admin, consent audit |
| Address | `POST /api/addresses`, `GET /api/addresses`, `POST /api/devotees/{id}/addresses`, `POST /api/families/{id}/addresses`, `PATCH /api/addresses/{id}/verify` | Admin, single address master |
| Dedup | `GET /api/dedup/candidates`, `POST /api/dedup/scan`, `POST /api/dedup/candidates/{id}/decision`, `GET /api/dedup/audit`, `GET /api/dedup/decisions`, `GET /api/dedup/rules`, `POST /api/dedup/rules/review-threshold?score=…` | Admin/ super admin controlled |
| Sevadar | `POST /api/sevadars/me/location`, `DELETE /api/sevadars/me/location`, `GET /api/sevadars/me/nearby?radius_km=3`, `POST /api/sevadars/me/assignments`, `GET /api/sevadars/me/assignments`, `POST /api/sevadars/me/assignments/{id}/visits` | Authorized, profile-owned |
| Sevas & payments | `GET /api/sevas`, `GET /api/payments/config`, `POST /api/payments/orders`, `POST /api/payments/verify`, `POST /api/payments/webhook`, `POST /api/receipts/lookup` | Public initiation, verified collection |
| Health | `GET /api/health` | Public |

## 4. Technical decisions

- **PostgreSQL** is the intended deployed DB, SQLAlchemy 2 / Alembic handle sessions and migrations. Coordinates use numeric latitude/longitude plus bounding-box filtering and Haversine distance; initial scale does not require PostGIS. For large geospatial datasets, migrate to PostGIS geography and a GiST index, add geographic paging and spatial caching.
- The physical address fingerprint includes **unit**. A household location is an address record, not just a city/pincode. A city street-level geocode is not automatically treated as a verified doorstep location.
- The last sevadar GPS point is overwritten rather than building a route-history table. Searches require a point newer than 15 minutes, accuracy <=100m and explicit consent. The cleanup command `python -m app.purge_gps` should be scheduled every 5 minutes to physically purge unused stale points.
- Anonymous users cannot view names, GPS or addresses. Sevadar accounts can see only opted-in, verified homes within their configured zone, up to 10 km. A super admin creates worker accounts. A user may revoke household visit consent via an admin-recorded event.
- Payment secrets are backend-only and must be in runtime secrets. Payment order amounts are recalculated from the server catalog, only `captured` Razorpay transactions of exact currency/amount are finalized; HMAC webhook and checkout signatures are validated and retries are idempotent.
- The public lookup requires both complete unguessable receipt code and matching phone. **Add a rate limiter, abuse monitoring and customer OTP before scale.** No PAN or 80G entitlement claim is collected/printed until Trust eligibility, encryption and compliance are approved.

## 5. Phase-by-phase implementation status

| BRD phase | Implemented in ZIP | Still required |
|---|---|---|
| Phase 0 — Discovery / governance | ER code mapping, identity conventions, API, role baseline, deployment guide | Approved consent/legal templates, field dictionary, actual addresses, enterprise NFRs |
| Phase 1 — Devotee database + basic interface | FastAPI, initial migrations, Devotee/Family IDs, shared address, duplicate review, staff panel, verified-payment API, receipts | Account OTP, enterprise-grade audit export, PDF receipt service, refunds and reconciliation, independent PG validation |
| Phase 2 — Mobile app | Mobile-responsive React staff screen + browser GPS and navigation links | Dedicated Android/iOS app, FCM, OTP and full mobile UX |
| Phase 3 — Website revamp | Existing React site preserved; integrated with backend | Production rebrand/assets, SEO/CMS, events, scholarships, content workflows |
| Phase 4 — Automation | Nearby household matching, GPS distance, assignment/visit outcomes | Optimized routes, notifications, digital passes, AI analytics, POS/kiosks, CCTV integration |

## 6. Tests executed / limitations

- `python -m pytest -q`: **14 passed** in isolated SQLite fixtures, testing auth, family members sharing a number, manual merge, address reuse, GPS, consent revocation, visit logging, Razorpay config missing, invalid signature, captured payment and receipt idempotence.
- Generated a **273+ line explicit initial Alembic migration**, applied successfully to an empty SQLite staging DB, revision `0001_initial` (re-generated to include all schema tables).
- Parsed all TypeScript/TSX files using TypeScript syntax parser: no syntax diagnostics. A full `npm ci` / `npm run build` run could not complete in this sandbox (npm installation reported incomplete cache/Exit handler never called); run it locally or via provided GitHub Actions CI. PostgreSQL and real Razorpay were not connected, so **integration results are not claimed**.

## 7. Production blockers (must resolve)

1. Production-ready RBAC policies including field-level audit and API access logging; client currently stores staff JWT in `sessionStorage` instead of HttpOnly, Secure, SameSite cookies; switch to managed identity/SSO or signed secure-cookie sessions.
2. OTP-based account claiming, verified phone/email, and a documented consent/privacy notice including correction/deletion policy and retention limits.
3. Rate limiting for login, search and receipt access; abuse safeguards for public payments, request size limits and replay protections.
4. Address verification workflow with approved geocoder/service, geo-precision and zone governance. Some families may legitimately share an address; no automatic relative merging.
5. Transactional outbox, webhook retry/job reconciliation, refund/chargeback administration, finance settlement reports and receipt PDF identity signatures.
6. Real PostgreSQL migration and concurrency tests (merges, assignments and provider callbacks), backup/restore validation and schema migration review.
7. Hosted HTTPS domain, API WAF, secret manager, cloud monitoring/alarms, secure backups, privacy DPIA, compliance review of payment/donor data, precise-data access.
8. User consent provenance and verification. Family visit consent must not be marked without evidence; sevadars should be trained on location/visit data controls.
9. Live donation/website branding is copied from the original prototype and contains **placeholder contact and trust details**. Replace and approve before public deployment.
10. Application is a Phase 1 integration baseline, not completion of all four BRD phases; see planned follow-up table above.
