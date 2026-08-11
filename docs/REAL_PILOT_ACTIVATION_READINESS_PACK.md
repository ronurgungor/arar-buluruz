# Arar Buluruz — Real Pilot Activation Readiness Pack

_Date: 2026-08-11, Europe/Istanbul_

## Status and authority

**Phase 1.75 — Technical Preparation Complete / Real-Pilot Activation Readiness Open**

Canonical repository baseline entering this gate:

`3bb4d793a3a959c3fa8f74914dea6bd3df6731ba`

This is the canonical provider-neutral operational readiness pack for the founder-operated first real Çorlu pilot. It consolidates activation sequencing, operator SOPs, data-minimization questions, provider-neutral data flows, legal-review questions, rollback concepts and synthetic/tabletop rehearsals.

It does **not** replace the existing authoritative technical contracts:

- `REAL_CORLU_PILOT_BACKEND_PREP.md` — backend/data/security preparation;
- `REAL_CORLU_PILOT_SELLER_CONTACT.md` — intentionally-public seller-contact contract;
- `TR_SELF_HOSTED_SUPABASE_PREP.md` — future provider/self-hosting acceptance requirements;
- PR #57 trusted-photo implementation and tests — trusted sanitization/delivery boundary;
- Issue #59 — deferred restore-verification hardening.

This gate creates no new product feature and authorizes no production activation, provider purchase, real personal data, deployment, Lovable publication, advertising or paid infrastructure.

## Pilot objective and frozen scope

Target sequence:

`technical prep complete -> activation readiness -> provider selection -> real-data authorization -> 1 real listing -> 3 listings -> 5–10 listings`

Pilot constraints:

- Çorlu only;
- founder-operated moderation and publication;
- staged `1 -> 3 -> 5–10` real listings;
- no seller Auth/accounts by default;
- no public self-service database writes;
- no payment custody by Arar Buluruz;
- WhatsApp default seller contact; phone optional;
- exactly one seller-contact channel per publishable listing;
- trusted sanitized photo pipeline;
- no Shopier in the first pilot;
- no ads;
- no broad SEO/indexing expansion initially;
- minimum recurring cost and operational burden.

## A. Single activation checklist

Every checklist item uses exactly one canonical status class:

- `READY`
- `MUST CLOSE BEFORE REAL DATA`
- `MUST CLOSE AFTER PROVIDER SELECTED`
- `FOUNDER SIGN-OFF`
- `LEGAL SIGN-OFF`
- `DEFER UNTIL PILOT SIGNAL`

| Stage | Requirement | Status class | Closure/evidence |
|---|---|---|---|
| Technical prep | PR #57 trusted-photo preparation merged/closed | READY | Repository implementation/tests retained; production Storage remains off. |
| Technical prep | PR #58 intentionally-public seller-contact contract merged/closed | READY | Single-source contact + fail-closed lifecycle retained. |
| Technical prep | Issue #59 remains P2/deferred/non-blocking | READY | No standalone hardening in this gate. |
| Technical prep | Auth and Storage remain disabled in committed config | READY | `auth.enabled=false`, `storage.enabled=false`. |
| Activation readiness | One canonical activation checklist/operator pack exists | READY | This document. |
| Activation readiness | Minimum intake, moderation, contact, photo, expiry and incident SOPs defined | READY | Sections B–H. |
| Activation readiness | Provider-neutral data-minimization inventory and flow map defined | READY | Sections I–J. |
| Activation readiness | Conceptual kill switch/rollback procedure defined | READY | Section L. |
| Activation readiness | Happy-path and failure-path synthetic/tabletop rehearsals completed | READY | Section M. |
| Privacy | Exact data-controller identity and controller request/contact channel | LEGAL SIGN-OFF | Legal/privacy reviewer must provide/approve exact answer. |
| Privacy | Article 5 legal basis for seller-contact collection/storage | LEGAL SIGN-OFF | No answer manufactured by this pack. |
| Privacy | Legal basis for intentional anonymous-public seller-contact disclosure | LEGAL SIGN-OFF | Must be reviewed separately from mere storage. |
| Privacy | Collection-time aydınlatma text/process | LEGAL SIGN-OFF | Must cover the approved real pilot and actual flows. |
| Privacy | Recipient/alıcı-group definitions | LEGAL SIGN-OFF | Must reflect public visitors/buyers and actual providers where applicable. |
| Privacy | Retention/deletion rules, including temporary intake and incident records | LEGAL SIGN-OFF | No statutory period invented here. |
| Privacy | Data-subject request procedure | LEGAL SIGN-OFF | Exact controller channel, authentication and response process required. |
| Privacy | Wrong-person number complaint handling | LEGAL SIGN-OFF | Operational unpublish-first rule is ready; legal handling still requires review. |
| Privacy | Current VERBİS applicability | LEGAL SIGN-OFF | Reassess against current rules/thresholds before real data. |
| Privacy | `publication_instruction_at` treatment vs explicit consent | LEGAL SIGN-OFF | Keep operational audit fact distinct from any legal-basis conclusion. |
| Operator | Founder device intake/storage/deletion discipline | MUST CLOSE BEFORE REAL DATA | Choose the actual intake tool/device location and deletion steps before first real datum. |
| Operator | Final temporary-intake retention rule | MUST CLOSE BEFORE REAL DATA | Must match legal sign-off; remove duplicate copies after canonical entry. |
| Provider selection | Production provider and monthly cost decision | FOUNDER SIGN-OFF | Shortlisting is allowed; selection/purchase requires explicit founder approval. |
| Provider | Exact hosting location, service roles, sub-processors and contractual data path | MUST CLOSE AFTER PROVIDER SELECTED | Provider-specific evidence required. |
| Provider | TLS/public endpoint exposure, firewall/admin exposure, secret management | MUST CLOSE AFTER PROVIDER SELECTED | Must pass provider-specific production acceptance. |
| Provider | Database backup + off-failure-domain copy + empty-environment restore | MUST CLOSE AFTER PROVIDER SELECTED | Restore failure is production NO-GO. |
| Provider | Storage backup/restore/consistency plan when real photos are enabled | MUST CLOSE AFTER PROVIDER SELECTED | Database-only backup is insufficient for photos. |
| Provider | Logs, reverse proxy/CDN and backup retention/configuration | MUST CLOSE AFTER PROVIDER SELECTED | Must match legal/data-minimization decision. |
| Provider | Trusted photo delivery wired end-to-end to buyer-visible detail | MUST CLOSE AFTER PROVIDER SELECTED | Existing trusted helper is prepared; current public listing adapter still carries no real photo URLs. |
| Provider | Sanitized output metadata/privacy acceptance check | MUST CLOSE AFTER PROVIDER SELECTED | Verify production sanitizer output does not retain unnecessary original metadata; do not assume beyond measured evidence. |
| Provider/privacy | Actual WhatsApp/provider and cross-border implications | LEGAL SIGN-OFF | Assess using the provider/data-flow facts selected above. |
| Real data | Explicit authorization to begin real seller/listing/contact/photo collection | FOUNDER SIGN-OFF | Gate 6 only; nothing earlier authorizes collection. |
| First listing | First seller set operationally ready without premature data ingestion | FOUNDER SIGN-OFF | Candidate/willing seller may be identified; system intake waits for Gate 6. |
| First listing | First listing publication authorization | FOUNDER SIGN-OFF | Founder reviews preview and all prior gates before Gate 7. |
| Expansion | Expand `1 -> 3` only after first-listing observation | FOUNDER SIGN-OFF | No unresolved high-risk incident; founder burden acceptable; no new legal/provider blocker. |
| Expansion | Expand `3 -> 5–10` only after three-listing observation | FOUNDER SIGN-OFF | Same conditions, with explicit review of complaints, manual time and provider stability. |
| Later scale | Auth/accounts/seller dashboard | DEFER UNTIL PILOT SIGNAL | Add only if founder operation becomes a proven bottleneck. |
| Later scale | CAPTCHA/bot platform/WAF/advanced monitoring | DEFER UNTIL PILOT SIGNAL | Reconsider only from measured abuse/availability evidence. |
| Later scale | In-app messaging/SMS OTP/contact analytics | DEFER UNTIL PILOT SIGNAL | Not needed for first pilot. |
| Later scale | Shopier/external-sales CTA | DEFER UNTIL PILOT SIGNAL | Not in first pilot. |
| Later scale | AdSense/ads/SEO expansion/native app | DEFER UNTIL PILOT SIGNAL | First prove the real local supply-demand loop. |
| Later scale | Automated/AI moderation and automated reminders | DEFER UNTIL PILOT SIGNAL | Manual founder operation is intentional for 1–10 listings. |
| Deferred hardening | Issue #59 standalone restore verification hardening | DEFER UNTIL PILOT SIGNAL | Revisit at provider/restore acceptance or only if new concrete risk appears. |

## B. Minimum listing intake SOP

### B1. Minimum intake fields

Collect only what the first pilot genuinely needs:

1. listing title;
2. description;
3. price;
4. location — fixed to `Tekirdağ / Çorlu` for this pilot;
5. seller display name;
6. selected contact channel — `whatsapp` default or `phone`;
7. seller contact — one E.164 value;
8. photos;
9. desired expiry;
10. moderation result.

Do not add seller account/profile fields, unnecessary email, identity document, TC identity number, precise home address or other profile enrichment.

### B2. Intake sequence

1. **Receive** the minimum listing content and selected public contact from the seller through the approved founder intake channel.
2. **Create/hold as draft intake** using the minimum temporary operator record needed to perform moderation. Do not create unnecessary duplicate copies.
3. **Moderate** content and photos at a human/operator level. Outcome: approve for readiness, request correction, or reject.
4. **Verify contact** according to Section D. No publication instruction is recorded before verification.
5. **Process photos** through the trusted sanitizer according to Section F. Original input is not the canonical retained asset.
6. **Build seller preview** containing exactly the public fields listed in Section E.
7. **Show preview to seller** and resolve corrections before publication.
8. **Record publication instruction** only after the seller has seen what will be public and has instructed publication under the legally approved process.
9. **Publish** only when contact readiness, moderation, sanitized-photo readiness, future expiry and provider-specific production acceptance all pass.
10. **Remove unnecessary temporary intake duplicates** according to the approved retention/deletion rule.

### B3. Expiry implementation note

The database lifecycle contract keeps `expires_at` null for `draft`, `pending` and `rejected` rows and requires it for `published`/`unpublished` rows. Therefore the desired expiry may be chosen during intake but is written to the canonical listing lifecycle at publication time rather than being forced into a pending database row.

## C. Minimum moderation SOP

Moderation is a founder content/pilot-scope check, not identity/KYC or item-ownership proof.

For each listing:

1. confirm location is Çorlu;
2. confirm title/description/price are sufficiently clear and internally coherent;
3. reject or request correction for obviously prohibited, fraudulent, misleading or unsafe content;
4. confirm seller display name is suitable for public display and does not contain unnecessary sensitive/private information;
5. confirm exactly one contact channel is selected;
6. confirm photos are relevant to the listing and contain no obvious inappropriate/private content before sanitization/publication;
7. confirm no Shopier/external-sales CTA is being added in the first pilot;
8. set the operational moderation result to one of:
   - `APPROVE FOR READINESS`;
   - `REQUEST CORRECTION`;
   - `REJECT`.

Database lifecycle mapping remains narrow: approved intake may proceed through `pending` toward `published`; rejected intake uses `rejected`. Do not create a new moderation subsystem for 1–10 listings.

## D. Contact verification / change / withdrawal SOP

Canonical model:

- WhatsApp default;
- phone optional;
- exactly one contact channel;
- exactly one authoritative E.164 contact value;
- public contact exists only under the active-listing lifecycle.

Verification proves **present control only**. It does **not** prove legal identity, item ownership or permanent ownership of the phone number.

### D1. First verification — WhatsApp

1. Read back/confirm the exact E.164 number intended for publication.
2. Require present-control proof from that same intended publication number through the approved founder verification interaction.
3. Do not accept proof from a different number as verification of the intended public number.
4. On success, record `contact_verified_at` and `whatsapp_same_number`.
5. Continue to sanitized-photo readiness and seller preview.

### D2. First verification — phone

1. Confirm the exact E.164 number intended for publication.
2. Founder performs manual callback or the approved equivalent verification.
3. On successful present-control verification, record `contact_verified_at` and `manual_callback` or the separately approved equivalent method.
4. Continue to seller preview.

### D3. Failed verification

1. Do not publish.
2. Mark the intake as needing correction/verification; do not guess a replacement number.
3. Ask the seller to correct the number or repeat verification.
4. Record no publication instruction until verification succeeds.
5. Repeated failure may result in rejection/closure of the intake rather than creating additional identity checks.

### D4. Contact change

1. If live, **UNPUBLISH FIRST** or rely on the existing fail-closed contact-change operation that moves the live listing out of the public lifecycle.
2. Replace channel/value with the seller-provided corrected value.
3. Verification timestamp/method and publication instruction must reset.
4. Verify the replacement contact from scratch.
5. Produce a new seller preview showing the new public contact.
6. Record a new publication instruction.
7. Explicitly republish only after all readiness checks pass.

### D5. Seller withdrawal

1. **UNPUBLISH FIRST.**
2. Stop new normal public retrieval of the listing/contact and new signed-photo delivery.
3. Record the minimum withdrawal/incident fact required by the approved retention rule.
4. Do not substitute founder relay or another contact channel unless the seller separately selects and verifies it.
5. Apply deletion/retention rules to canonical and temporary records.
6. Remember that unpublishing cannot revoke copies already made by buyers, browsers, screenshots or scrapers.

### D6. Wrong-person / third-party number complaint

1. **UNPUBLISH FIRST. INVESTIGATE SECOND.**
2. Do not expose the disputed number again while authority/control is uncertain.
3. Preserve only the minimum incident evidence needed under the approved incident/retention rule.
4. Contact the purported seller through the approved operator channel without sending the disputed number to unnecessary parties.
5. If corrected: change contact -> reset readiness -> reverify -> new preview -> new publication instruction -> explicit republish.
6. If authority/control cannot be established: keep unpublished and close/delete according to the approved legal/retention process.

## E. Publication preview and instruction

Before `publication_instruction_at` is recorded, show the seller a single preview containing:

- listing title;
- description;
- price;
- `Tekirdağ / Çorlu` location;
- seller display name;
- sanitized photos in final order;
- selected public contact channel;
- exact public contact number/target;
- expiry.

The seller must understand that the selected contact becomes **intentionally public while the listing is active**, can be obtained by anonymous visitors and may be copied outside Arar Buluruz. Do not describe the digits as technically secret/private merely because the UI renders a CTA instead of plain text.

The preview/instruction record is an operational publication fact. The legal reviewer decides its legal characterization; this pack does not label it explicit consent automatically.

## F. Photo intake SOP

The existing trusted-photo contract is not weakened.

### F1. Accepted input

Per input photo:

- declared MIME: JPEG, PNG or WebP;
- byte size: `1..8 MiB`;
- content signature must match declared MIME;
- trusted decode must succeed;
- decoded format must match declared MIME;
- decoded image must stay within the existing `50,000,000` pixel ceiling.

### F2. Successful sanitizer path

1. Receive untrusted bytes on the approved founder/operator ingestion path.
2. Validate MIME, size and signature.
3. Decode with the trusted image pipeline and current pixel ceiling.
4. Re-encode as canonical WebP.
5. Revalidate sanitized output.
6. Upload only sanitized WebP to the private Storage path `listings/{listing_uuid}/{photo_uuid}.webp`.
7. Persist private metadata with listing ID, photo ID, object path, WebP MIME, sanitized byte size and sort order.
8. Discard original filename and do not keep original photo metadata as a separate retained record after successful sanitization.
9. Use only sanitized output in the seller preview/public delivery path.

### F3. Sanitizer/rejected-input failure

For unsupported MIME, empty/oversize input, signature mismatch, decode failure, format mismatch, encode failure, corrupt input or unsafe output:

1. reject the affected photo;
2. do not upload the untrusted original to production Storage;
3. tell the seller only that the photo could not be safely accepted and request a replacement/standard export;
4. do not weaken MIME/size/decode checks to make the photo pass;
5. continue the listing only with separately accepted photos.

### F4. Metadata/orphan cleanup failure

If sanitized Storage upload succeeds but metadata persistence fails, the existing trusted helper attempts compensating Storage deletion.

If compensating deletion also fails:

1. affected photo is **not accepted**;
2. record the exact orphan object path in the minimal operator incident record;
3. keep the object private and reconcile/delete it through the provider-approved Storage procedure;
4. do not claim ingestion succeeded;
5. close the incident before considering the affected photo ready.

### F5. Ordering and seller preview

Assign deterministic non-negative sort order. Seller preview must use the sanitized final images in the same intended public order. Reordering must update only canonical trusted metadata/object references; do not create duplicate original-photo archives.

### F6. Production metadata acceptance

The current sanitizer performs decode/re-encode and auto-orientation, but the production acceptance gate must verify the chosen runtime/output does not retain unnecessary original metadata. Do not make an untested claim that every possible source metadata field is removed merely because an image was re-encoded.

## G. Expiry / stale-listing SOP

### G1. At intake

Seller/founder chooses a practical expiry for the listing. The exact pilot default, if any, is a product/data-minimization choice and is **not** defined here as a statutory retention period.

### G2. At expiry

When `expires_at <= now()`, anonymous listing/contact visibility already fails closed through RLS. The trusted photo-delivery gate also stops new signed URL issuance for the expired listing.

**No manual daily founder check is required for public visibility.** The database lifecycle is the visibility gate.

### G3. Seller extension request

Before extending/reactivating:

1. confirm item/listing is still current and available;
2. confirm content/price/location remain accurate;
3. confirm public contact is unchanged; if changed, follow Section D4;
4. show the refreshed public preview including the new expiry;
5. obtain a new publication instruction under the approved legal process;
6. set a new future expiry and restore public visibility only after readiness checks pass.

For a listing already expired, prefer an explicit founder-controlled reactivation/republish operation rather than silently extending stale visibility. The exact provider command/runbook is locked at provider-specific production acceptance.

### G4. Stale/sold complaint

1. **UNPUBLISH FIRST** when credible ambiguity exists.
2. Ask seller whether the listing remains active.
3. If sold/stale: keep unpublished and close/delete according to retention rules.
4. If still valid: reconfirm preview/expiry and republish only if all readiness requirements still pass.

No automated seller reminders are required for the first pilot. Reconsider only if real pilot evidence shows stale listings are a recurring burden.

## H. Complaint / incident SOP

Founder keeps one minimal incident record containing only what is necessary: timestamp, listing ID, incident category, short factual summary, action taken, resolution state and—only when necessary—an evidence pointer. Do not create buyer message/contact tracking.

| Incident | Immediate action | Resolution path |
|---|---|---|
| Wrong phone number | UNPUBLISH FIRST | D6 wrong-person procedure; corrected number requires reverify + preview + new instruction. |
| Third-party number | UNPUBLISH FIRST | Treat authority/control as disputed; keep unpublished until resolved. |
| Fraudulent/misleading listing | UNPUBLISH FIRST for credible high-risk report | Founder reviews listing facts; reject/keep unpublished or correct + remoderate. |
| Inappropriate photo/content | UNPUBLISH FIRST if publicly harmful | Remove/reject affected content; replacement photo must pass sanitizer + preview. |
| Stale/sold listing | Unpublish when credible | Confirm with seller; close or controlled republish. |
| Seller asks immediate removal | UNPUBLISH FIRST | Apply withdrawal + retention/deletion procedure. |
| Privacy/data-subject request | Stop unnecessary exposure first when appropriate | Use the legally approved request/authentication/response procedure; keep request data minimal. |
| Backend/contact/photo incident | If exposure/integrity is uncertain, stop affected public visibility/delivery | Execute Section L kill-switch path, preserve minimal evidence, diagnose before reopening. |

High-risk ambiguity rule:

**UNPUBLISH FIRST. INVESTIGATE SECOND.**

## I. Data minimization inventory

| Data category | DATA WE KEEP | DATA WE DO NOT KEEP by default |
|---|---|---|
| Public listing/contact | Title, description, price, Çorlu location, seller display name, one selected public contact channel + E.164 value, sanitized photos, publication/expiry lifecycle data | Buyer phone, buyer message, WhatsApp conversation contents, contact-click history, unnecessary seller email, seller account/profile enrichment |
| Internal audit/technical | Listing status/lifecycle metadata; `contact_verified_at`; channel-compatible verification method; `publication_instruction_at`; private sanitized-photo metadata; minimum incident facts when required | ID document, TC identity number, broad KYC dossier, contact analytics, buyer tracking, screenshots of seller WhatsApp conversation unless specifically justified/approved |
| Temporary operator intake | Only the minimum listing/contact/photo material needed to moderate, verify, preview and publish | Permanent duplicate contact copies, duplicate photo archives, address beyond required listing location, unnecessary notes about the seller |
| Photo input | Temporary original bytes only as needed to run trusted sanitization | Original filename as canonical data, original photo metadata after sanitization, untrusted originals in production Storage/Git/CI artifacts |

Data class distinction:

- **Public listing/contact data:** deliberately disclosed while the listing is active; public disclosure is part of the product contract.
- **Internal audit metadata:** needed to prove operational readiness/lifecycle but not anonymously readable.
- **Temporary operator intake data:** exists only to complete intake; duplicate copies should be removed after canonical persistence under the approved retention rule.

## J. Provider-neutral data-flow map

No specific provider is assumed. `Personal data?` is a data-classification prompt for legal review, not a legal conclusion for every field/actor.

| Flow | Data category | Purpose | Personal data? | Public/private | Retention question | Cross-border question | Decision still required |
|---|---|---|---|---|---|---|---|
| Seller -> founder/operator device | Listing fields, seller display name, contact, original photos, desired expiry | Intake/moderation | Yes/mixed | Private intake | How quickly are temporary copies deleted after canonical entry? | Depends on intake/channel/device services | Approved intake tool/device and legal basis |
| Seller -> WhatsApp/founder for verification | Exact intended WhatsApp number + verification interaction | Present-control verification | Yes | Private/provider-mediated | Is any transcript/evidence retained? Default should be minimum/no screenshot | Yes, assess actual WhatsApp flow | Legal/provider review |
| Founder/operator -> future backend | Moderated listing/contact/readiness facts | Canonical persistence/publication | Yes/mixed | Mixed public/internal | Canonical lifecycle + deletion rules | Depends on provider/network | Provider + legal decision |
| Future backend -> database | Listing fields, public contact, internal audit fields | Source of truth/lifecycle | Yes/mixed | Column-level public/internal boundary | Retention/deletion/backup propagation | Depends on database hosting/sub-processors | Provider + legal decision |
| Founder/backend -> sanitizer | Original photo bytes | Trusted decode/re-encode | Possibly | Private transient | Delete untrusted input after accepted/rejected processing | Depends on runtime location | Provider/operator decision |
| Sanitizer/backend -> Storage | Canonical sanitized WebP | Private object persistence | Possibly | Private | Object deletion + backup propagation | Depends on Storage provider/location | Provider + legal decision |
| Storage + DB gate -> Arar application | Short-lived signed sanitized photo delivery | Buyer-visible listing photo | Possibly/public content | Public delivery after private gate | Signed URL TTL; object lifecycle | CDN/proxy path may add transfer | Provider-specific acceptance |
| Database -> Arar application | Active listing fields; detail-only public contact | Public listing/detail | Yes/mixed | Public for active row | Public copies cannot be revoked after receipt | CDN/proxy/app hosting path | Legal/provider review |
| Arar application -> buyer | Listing/detail/contact CTA | Discovery/contact | Yes/mixed | Public | Browser/cache/log consequences | CDN/app host may matter | Provider/legal review |
| Buyer -> WhatsApp -> seller | Buyer-initiated external conversation | Buyer/seller communication | Yes | Outside Arar application | Arar should not retain conversation by default | WhatsApp/provider flow | Legal reviewer assesses recipient/transfer implications |
| Future backend/database/Storage -> backup | DB state + private metadata + object data as applicable | Disaster recovery | Yes/mixed | Private | Retention, encryption, deletion propagation, restore lifecycle | Backup location/sub-processor may matter | Provider + legal decision |
| Public endpoint -> reverse proxy/CDN (if used) -> buyer | HTTP requests/responses; potentially IP/user-agent; public listing/contact response | Delivery/security | Yes/mixed | Mixed | Log minimization/rotation | Provider/location-dependent | Provider + legal review |
| Backend/app -> logs | Operational errors/technical events | Reliability/security | Potentially | Private | Avoid intentional contact values; define log retention | Provider/location-dependent | Provider + legal review |

## K. Legal decision worksheet — questions only

This section deliberately does not answer Turkish privacy-law questions. Legal/privacy reviewer should provide current, fact-specific answers using the actual chosen provider/data flows and current official sources.

1. What exact natural/legal person is the data controller for the pilot?
2. What exact controller contact/request channel will be shown to data subjects?
3. For each seller-contact processing purpose, which Article 5 condition is relied on and why?
4. What is the legal basis for intentionally making the selected seller contact anonymously/publicly available while the listing is active?
5. What collection-time aydınlatma must be shown, by what channel, and at what exact point before/at collection?
6. What recipient/alıcı groups must be disclosed, including public visitors/prospective buyers and selected providers where applicable?
7. How should the WhatsApp verification flow and buyer-to-seller WhatsApp flow be described and assessed?
8. What are the actual hosting, CDN/reverse-proxy, log, backup and founder-device flows after provider selection?
9. Which of those flows may constitute cross-border transfer, and what Article 9 analysis/safeguard is required for each actual flow?
10. What retention/deletion periods are appropriate for canonical listing/contact data, internal audit metadata, incident records and temporary operator intake data?
11. How must deletion propagate to backups and Storage, and what technically unavoidable delayed-deletion behavior must be disclosed/managed?
12. What data-subject request intake, identity/authentication, response and recordkeeping procedure is required?
13. What exact procedure is required for a wrong-person/third-party phone complaint?
14. Is VERBİS registration applicable to the exact controller and processing activity at activation time, considering current exceptions/criteria?
15. Does any explicit-consent mechanism apply to any purpose, and if so how must it remain separate from aydınlatma?
16. How should `publication_instruction_at` be characterized? It is currently an operational audit fact; should it evidence a contractual/publication instruction, explicit consent, or neither for a particular purpose?
17. Are there any additional sector/consumer/e-commerce obligations triggered by the exact first-pilot flow even though Arar Buluruz does not hold payment funds?

Guardrails for the legal review:

- do not claim explicit consent is always required;
- do not claim explicit consent is never required;
- do not claim Türkiye hosting is universally mandatory;
- do not treat intentionally-public contact as non-personal merely because publication is intended;
- do not turn an operational timestamp into a legal conclusion without review.

Current official-source topics to re-check at sign-off include the KVKK Article 5 processing conditions, Article 10/aydınlatma requirements and Aydınlatma Tebliği, the current Article 9 overseas-transfer regime/guidance, and current VERBİS rules/exceptions.

## L. Kill switch / rollback — conceptual operator procedure

Do not activate these actions today. Before production, provider-specific commands/owners must be mapped to this conceptual sequence.

### L1. Stop all real listing visibility

1. Freeze new publication operations.
2. Set all active real pilot listings to a non-public lifecycle state through the trusted admin/service path.
3. Confirm anonymous listing queries return no real active rows.

### L2. Stop seller contact CTA

Because contact visibility follows the listing lifecycle, unpublishing the listing is the primary contact kill switch. Do not create a second public-contact secrecy switch merely for this purpose.

### L3. Disconnect public backend source if necessary

Set the public application listing source to the known fail-closed/disabled or known-good V0 configuration through the approved deployment environment procedure. Do not improvise production environment changes outside the provider runbook.

### L4. Stop photo delivery

Unpublish/expire affected listings so the service-role delivery gate returns no deliverable photo. If broader isolation is needed, disable the provider-specific photo-delivery path/bucket access according to the production runbook without exposing the private bucket publicly.

### L5. Unpublish all active listings

Use one audited founder/operator operation over the active pilot set. Verify the result with an anonymous read and, after signed URL TTL expiry, confirm no new photo URLs are issued.

### L6. Roll application back to known-good V0

Use the separately accepted V0 release/source identity and deployment rollback procedure recorded by the production provider. Preserve the repository as canonical; do not force-rewrite Git history.

### L7. Preserve incident evidence

Preserve only evidence required to understand/resolve the incident: relevant timestamps, listing IDs, configuration/version identifiers, minimal logs and affected object paths. Avoid copying full contact/chat/photo data into ad-hoc notes.

### L8. Delete data under approved rules

After evidence/hold requirements are resolved, apply the approved retention/deletion rule to database rows, Storage objects, temporary operator intake data and backups according to the provider-specific propagation procedure.

## M. Synthetic/tabletop operational rehearsals

No real phone, real photo, real listing or real personal data was used. These are logical/tabletop rehearsals against the current repository contracts.

### Scenario A — happy path

Synthetic steps:

1. receive synthetic title/description/price/Çorlu location/seller display name;
2. choose `whatsapp` and synthetic E.164 number;
3. moderate -> `APPROVE FOR READINESS`;
4. simulate same-number present-control verification -> record synthetic verification timestamp/method;
5. pass synthetic JPEG/PNG/WebP through trusted sanitization model -> canonical WebP metadata/object path;
6. assemble preview with sanitized photos, exact contact target and expiry;
7. simulate seller publication instruction after preview;
8. publish synthetic listing under active-published/contact-readiness rules;
9. simulate buyer-visible detail/contact;
10. expiry arrives -> anonymous listing/contact and new photo delivery fail closed;
11. apply synthetic closure/deletion checklist.

Founder decisions required:

- moderation approval;
- whether preview is correct;
- publication instruction accepted;
- first listing publication authorization;
- eventual close/reactivation decision.

Ambiguous/open points found:

- actual provider/operator command for canonical persistence and publication;
- actual production photo delivery wiring to the public detail route;
- final legal characterization/notice/retention;
- exact default expiry period;
- provider-specific proof that sanitized output retains no unnecessary original metadata.

Estimated active founder time, excluding seller/provider waiting: **15–25 minutes for a clean listing** once the process and provider runbook are established. First-ever production listing should budget **25–40 minutes** because the founder must verify each operational step and evidence. These are tabletop planning estimates, not measured pilot metrics.

Unnecessary friction found:

- none that justifies Auth, seller dashboard, OTP, CAPTCHA, AI moderation, external-sales integration or automated reminders for 1–10 listings;
- do not duplicate contact/private phone records;
- avoid copying seller data into parallel spreadsheets once canonical persistence is available.

P0/P1 gap: **NONE in the current inactive V0/repository preparation.**

Code required now: **NO.** Provider-specific production acceptance must determine whether a narrow integration change is needed to connect the already-prepared trusted photo delivery path to the buyer-visible detail route.

### Scenario B — failure path

Synthetic steps:

1. receive synthetic intake;
2. enter a synthetic wrong/changed contact;
3. treat verification as failed/reset; do not publish;
4. simulate photo sanitizer failure -> reject affected photo and request replacement;
5. simulate complaint/disputed contact -> UNPUBLISH FIRST;
6. correct the synthetic contact;
7. reverify present control;
8. sanitize replacement synthetic photo successfully;
9. show new preview;
10. record new publication instruction;
11. explicitly republish;
12. expiry arrives -> visibility fails closed;
13. simulate deletion request -> apply retention/deletion/backup propagation checklist.

Founder decisions required:

- whether complaint ambiguity warrants immediate full-listing unpublish — default yes for high-risk ambiguity;
- whether corrected content/contact is trustworthy enough for remoderation;
- whether incident evidence is necessary and what minimum to retain;
- whether republish is authorized.

Ambiguous/open points found:

- legal authentication/evidence threshold for wrong-person and data-subject requests;
- provider-specific deletion propagation into backups;
- provider-specific orphan Storage reconciliation command/path;
- exact temporary intake/incident retention rule.

Estimated active founder time, excluding waiting: **25–45 minutes** for this failure path. Seller response time/provider recovery time is not included.

Unnecessary friction found:

- no reason to create a buyer-message database or retain WhatsApp chat screenshots by default;
- no reason to add identity/KYC collection merely because contact verification failed;
- the simplest safe response to uncertainty remains unpublish-first.

P0/P1 gap: **NONE.**

Code required now: **NO.** The unresolved items are legal/provider/operator acceptance questions, not evidence of a current code defect.

## N. Founder activation gates

Passing a gate **never** automatically authorizes the next gate.

| Gate | Purpose | Current state |
|---|---|---|
| GATE 1 — ACTIVATION READINESS PACK COMPLETE | Canonical checklist/SOP/flow/legal worksheet/rollback/tabletop package | COMPLETE by this documentation gate once merged |
| GATE 2 — LEGAL / PRIVACY SIGN-OFF | Resolve provider-neutral legal questions and identify provider-specific conditions | NOT PASSED — exact next approval gate |
| GATE 3 — FIRST SELLER SET READY | Identify willing candidate seller(s) and operational scheduling without putting real data into the system | NOT PASSED |
| GATE 4 — PROVIDER / MONTHLY COST APPROVAL | Founder selects provider/cost envelope; shortlist alone is not purchase authorization | NOT PASSED |
| GATE 5 — PROVIDER-SPECIFIC PRODUCTION ACCEPTANCE | Prove migration/RLS/Storage/photo delivery/TLS/backup/restore/log/rollback and provider-specific privacy facts | NOT PASSED |
| GATE 6 — REAL DATA COLLECTION AUTHORIZATION | Explicitly authorize first real seller/listing/contact/photo intake | NOT PASSED / REAL DATA CLOSED |
| GATE 7 — FIRST REAL LISTING PUBLICATION AUTHORIZATION | Founder authorizes one real listing after successful intake/preview/readiness | NOT PASSED |
| GATE 8 — EXPAND `1 -> 3` | Review first real listing signal, incidents and founder burden | NOT PASSED |
| GATE 9 — EXPAND `3 -> 5–10` | Review three-listing signal before controlled local expansion | NOT PASSED |

## Readiness conclusions after this pack

- **Ready to seek legal/privacy sign-off:** YES. The questions/data-flow facts are structured enough for a focused review; no legal sign-off is claimed here.
- **Ready to shortlist production providers:** YES. Shortlisting/research can proceed without purchase. Provider selection/monthly cost remains Gate 4 founder sign-off.
- **Ready to collect real data:** NO.
- **Ready to publish the first real listing:** NO.
- **Code PR required by this gate:** NO.
- **Provider-specific integration work later:** POSSIBLE/LIKELY for the final production connection, particularly buyer-visible real-photo delivery; decide only at Gate 5 from the chosen provider/runbook.
- **Issue #59:** remains deferred/non-blocking until provider/restore acceptance or a new concrete risk appears.
- **Recurring production cost authorized now:** `0 TL`.

## Do not do now

Do not implement or activate:

- Auth;
- seller accounts/dashboard;
- contact resolver;
- CAPTCHA;
- in-app messaging;
- SMS OTP;
- contact-click analytics;
- Shopier/external-sales integration;
- AdSense/advertising;
- broad SEO expansion;
- public self-service writes;
- automated/AI moderation;
- native app;
- advanced monitoring/WAF/bot platform;
- Issue #59 standalone hardening;
- production backend/Storage/Auth;
- provider purchase;
- real seller/contact/photo/listing data;
- deployment/Lovable publication.

**REAL DATA COLLECTION remains CLOSED until a later explicit Gate 6 authorization.**
