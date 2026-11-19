# Halleus — Torob + Google Merchant listings readiness (2026-11-19)

## Active scope
Consolidate seller-facing readiness for Torob and two owner-supplied Search Console notices.
Never confuse GitHub candidate with an activated VPS release.
Candidate base is the user-confirmed live release commit `82626bbc7c8955c38afa6950dee539fc626247c2`.
This batch must not mutate the database, credentials, payment logic, print originals, mockups, or production environment.

## Confirmed owner decisions
- These are made-to-order personalized art prints. The buyer can inspect an on-page preview before ordering.
- No discretionary change-of-mind returns for prints manufactured to the buyer's personal specifications after the order is confirmed. This is **not** a blanket waiver for defects, transport damage, product mismatches, or statutory consumer rights.
- Handoff to Post or Tipax occurs no later than **three business days after payment is confirmed**. This is **carrier handoff, not arrival at the customer address**.
- Shipping transit estimates were **not** supplied; do not invent `transitTime` or promise a destination ETA.
- No verified customer `review` or `aggregateRating` exists; do not fabricate either.

## Approved implementation slice
1. Server-readable, DB-backed offer prices on the default **10x15** selection: P01, P02 and 12 canonical Nemad pages. Keep runtime order/quote pricing server-authoritative and gate disabled products.
2. Distinct canonical Product JSON-LD identities and Offers for each `/shop/{month}-sign` URL. The already-existing `/shop/nemad-man/{month}` aliases remain strictly noindex and serve the same canonical Offer identity. Product images must use approved actual mockup photos, not live-switcher glyph placeholders.
3. Google GPC `CategoryCode` **500044** (Posters, Prints, & Visual Artwork); Product Offer-level `hasMerchantReturnPolicy` with `MerchantReturnNotPermitted` for discretionary returns; `deliveryTime.handlingTime` maximum **3 days**, and no made-up carrier transit promise.
4. Customer-facing policy page `/shop/shipping-returns`, linked in checkout, product pages, footer and sitemap. Preserve defects/mismatches exception.
5. No fake product reviews, discounts, stock, certification or carrier SLA. P03 remains without a sale Offer.
6. Verify relevant existing guards, schema consistency, canonical/indexability, type/build, price/checkout boundaries, and safe release script smoke before production activation.

## External or post-deployment gates
- Actual transport ETA after handoff is carrier- and destination-dependent. Only add `transitTime` after getting a documented usable range.
- The policy page currently references the established `halleus_ir` Instagram support contact. Owner may add a verified phone/email/business address later; do not invent contact details.
- Enamad link exists in the current site footer, but live trustseal validity and merchant account acceptance cannot be inferred from source.
- Torob's acceptance/category rules for customized prints are decided by Torob; no API feed or vendor account activation is implied.
- No real-money test order or production-data mutation is authorized by this readiness batch.
- Search Console notices are **non-critical**. Changes to source do not prove Google re-crawled or cleared issues; verify affected canonical URLs after deployment via Search Console / Rich Results Test.

## Release gate
GitHub branch creation + commit/push of this candidate are user-authorized.
VPS release is owner-operated via `ops/vps/halleus-release.sh` with the exact candidate commit and tag; keep the earlier working release as the rollback target.
Do not report `ROADMAP_COMPLETE` before release and final verification (including any owner-required Torob registration test).
