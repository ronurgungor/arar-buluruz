# First Real Listing Activation Readiness

Issue: #75  
Phase boundary: **synthetic implementation and design only**.

AWS OFF. Production OFF. Real data/users OFF. Paid infrastructure OFF. Tarladan untouched.

This document is the canonical activation plan. It does not authorize business registration, BTK notification, AWS provisioning, production activation, paid timestamp procurement or personal-data collection.

## Current gate state

- **Gate A — activation-facing synthetic implementation: CONDITIONAL PASS.**
- Gate A evidence head before the current red-team pass: `28f5423369dd1e76489adc5f42c46c9f9b3c83f3`.
- **Gate B — 5651 production traffic-evidence design: PASS as a synthetic contract.**
- Gate B evidence head before the current red-team pass: `56e626a2a2f41bf0b847f014361f5a54d2551b2b`.
- The current PR is being revalidated against the narrower **one real listing / free / pre-revenue** fact pattern.
- First real listing remains **NO-GO while production and real-data boundaries are OFF**.

## Stage-1 fact pattern and materiality rule

The first validation is intentionally narrow:

- Çorlu;
- 1 real listing → review → 3 → review → 5–10;
- platform revenue 0 TL;
- ads, commission, payment, order, reservation, Auth, seller account/dashboard, public self-service write, chat and WhatsApp OFF;
- founder moderation;
- seller calls the founder;
- founder creates the pending listing through the proven operator path;
- public seller contact is phone only;
- transaction completes entirely off-platform.

A legal/compliance obligation is not automatically a prior-permission technical gate. For each item the question is whether it materially prevents this exact one-listing validation, requires a compliance action before activation, or can be handled later without weakening the law or user safety.

## Resolved / non-blocking legal positions

- **ETBİS:** not required for the current listing-discovery + phone-only off-platform contract model. Re-open if ordering, checkout, payment, reservation, commission or platform contract formation is added.
- **VERBİS:** current scale/activity is treated as exempt; substantive KVKK duties still apply.
- **KEP:** not a current activation prerequisite for the present model.
- **Public seller phone:** use the KVKK 5/2-d intentional-publication (alenileştirme) model with strict purpose limitation. Publication acknowledgement is separate from aydınlatma.
- **WhatsApp:** no Art. 9 mechanism will be built for the first validation. Intake, complaint and seller CTA remain OFF.
- **Seller scope:** only private occasional sellers listing their own used personal/household goods. Professional/business/regular sellers and new-for-resale goods fail closed.
- **Tax/trade registration field:** not an unconditional application-build prerequisite for this free validation. If a tax/trade identifier exists and is applicable, it may be configured and displayed; the application must never invent one.

## Processing-basis matrix

| Purpose | Minimum data | KVKK basis | Guardrail |
| --- | --- | --- | --- |
| Listing intake / service request | display name, phone, listing text/photos | 5/2-c where necessary | no blanket consent; collect only after aydınlatma |
| Public seller contact | phone | 5/2-d | intentional publication + listing-only purpose limitation |
| Moderation / abuse / security | minimum moderation and security metadata | 5/2-f | documented balancing + minimization |
| Dispute / takedown evidence | minimum complaint/evidence record | 5/2-e | retain only what is needed for the claim |
| Statutory KVKK / 5651 records | required compliance records / traffic metadata | 5/2-ç | separate retention schedule; do not conflate with listing data |

Aydınlatma is delivered; it is not “accepted”. Any public-phone publication acknowledgement is a separate statement.

## Public operator identity/contact — implementation boundary

The public pilot graph exposes `/iletisim`, directly reachable from the homepage. Synthetic builds may render clearly non-production placeholders.

For an explicit real-data validation build the implementation requires only the public values that are presently necessary to identify and contact the natural-person operator:

- operator real-person/legal-operator name;
- electronic contact;
- phone.

The following are **not hard-coded as unconditional build prerequisites**:

- tax/trade-registry identifier;
- full public residence/business address.

If either is independently determined to be legally required for the exact operator/fact pattern, the real value must be configured before activation. If it is absent, the real-data build omits the field rather than publishing fake or placeholder information.

### Separate public yerleşim yeri/address question

The exact public address/yerleşim-yeri applicability remains a separate Issue #75 legal/privacy decision. This implementation does not assume that a home address must be exposed, and it does not assume that a virtual office/coworking/mail-forwarding address is legally equivalent. The decision must be made on the exact applicable rule before any required public address is populated.

## 5651 place-provider workstream

Arar Buluruz conservatively treats the service as a **yer sağlayıcı** because seller-originated listing text/photos are hosted.

### BTK Yer Sağlayıcılığı Bildirimi — activation runbook

Do **not** submit during synthetic development.

The application does not model BTK notification as a government permission token. Notification/compliance and prior authorization are distinct concepts.

Before real hosting activation, the runbook must:

1. identify the real natural-person/operator details that the then-current BTK notification process actually asks for;
2. re-check exact domain/service/operator information and timing in the official interface;
3. resolve any separate public-address requirement that is actually applicable;
4. submit the required notification at the legally required time if applicable to the final hosting model;
5. retain confirmation/evidence privately, with sensitive identity documents kept out of Git;
6. review later operator/domain/contact changes for update requirements.

Official interface: https://yersaglayici.btk.gov.tr/

### 5651 Gate B — production traffic evidence

The detailed authoritative design is maintained in:

`docs/5651_TRAFFIC_LOGGING_GATE_B.md`

Canonical rules:

- exactly one authoritative producer at the trusted outer public HTTP/TLS reverse-proxy layer;
- canonical source IP comes from the producer socket peer, not arbitrary forwarding headers;
- exact minimum schema includes request timestamp, source/destination IP and ports, method, pathname, status, service/protocol, and reliable duration/end/byte fields;
- no subscriber ID because there is no Auth;
- explicit allow-list logging — no request body, seller contact/name, listing text/photo/EXIF, Authorization/cookies/tokens/secrets or arbitrary query strings;
- UTC daily closed NDJSON rotation;
- SHA-256 over exact closed bytes;
- plain hash/system clock/mtime are not treated as qualified timestamp evidence;
- activation-time qualified timestamp contract prefers RFC 3161 SHA-256 message-imprint timestamping from a then-current 5070-authorized Turkish ESHS;
- timestamp provider failure is asynchronous: keep the immutable closed log/hash and queue only the hash/request metadata while the public application continues;
- traffic evidence retention is at least 365 days and separate from live listing/contact/photo data and the ≤14-day backup lifecycle;
- production store must be encrypted, least privilege, public-deny and Türkiye-resident;
- canonical traffic logs must not be exported to Frankfurt/global observability services without a separate approved necessity/privacy/transfer analysis.

Production ingress/storage/ESHS binding remains deferred because AWS, production and paid services are OFF.

### Notice / takedown

No proactive blanket content-monitoring system is required for this validation.

Operational flow:

1. Receive notice through the published takedown/privacy channel.
2. Wrong-person phone, child/special-category data, clear illegality or comparable high-severity claim → immediately unpublish first.
3. Preserve the minimum evidence required to assess/resolve the notice.
4. Resolve: delete/correct/reject, or republish only after the issue is safely cleared.
5. Record the minimum action/result metadata.
6. Do not retain the removed listing content merely because a traffic-log retention duty exists.

## Seller/category policy

Allowed:

- private natural-person seller;
- occasional use;
- seller’s own used personal/household property;
- ordinary lawful, unregulated categories.

Fail closed:

- professional/business seller;
- regular/high-frequency seller;
- new goods acquired/produced for resale;
- regulated or unclear categories;
- children/special-category data;
- third-party phone/person/photo/data;
- external payment/checkout/commission flow.

## Activation-facing frontend

- WhatsApp intake OFF.
- WhatsApp complaint OFF.
- WhatsApp seller CTA OFF.
- `/ilan-ver` collects no personal/listing data in the browser; it shows the pre-collection notice/rules and a founder phone action.
- Founder then creates the pending listing manually through the already-proven private operator path.
- Aydınlatma must be delivered before the founder collects the seller’s data by phone.
- Separate public-phone publication acknowledgement.
- Photo/content ownership + no child/third-party/special-category warning.
- Listing detail includes strict contact-purpose limitation and phone-only seller CTA.
- Obvious privacy/wrong-person/takedown contact.
- Private-seller declaration is required operationally before publication.
- Professional/business/regular/new-for-resale seller flows fail closed.
- Public copy should describe the current service, not internal stage/test terminology.

## Public discovery / indexability

Synthetic, preview and rehearsal builds remain closed to accidental organic discovery.

Only an explicit real-data public-validation build may open discovery, with this narrow boundary:

- `/` may be indexed;
- only listing-detail URLs returned by the **published public listing collection** may enter `/sitemap.xml` and may be indexed;
- missing/unpublished/private listing states remain excluded by the proven public RLS/adapter contract;
- `/ara?...` remains `noindex` to avoid query/filter index explosion;
- application, privacy, rules, safety, takedown and operator-information routes are not given a new SEO system;
- no province/district landing-page generation and no new SEO dependency.

The explicit public-validation sitemap is unavailable in closed synthetic builds and fails closed if the public listing backend cannot be read.

## Real-data activation build gate

Synthetic `pilot-rc` builds remain possible with safe activation-pending placeholders.

An explicit real-data activation build (`ARAR_REAL_DATA_ACTIVATION=enabled`) must fail closed unless operator legal name, valid electronic contact and valid phone are supplied. Address and tax/trade-registry values are optional at the build layer and are shown only when configured; this technical choice does not decide whether a separate rule ultimately requires one of them.

The activation flag does not itself authorize deployment or real-data collection.

## Remaining work before a real listing can actually be activated

Because production is still OFF, the following operational/infrastructure work remains outside this implementation pass:

1. settle the exact materiality/applicability of the public address/yerleşim-yeri question;
2. determine whether any business/tax registration step is actually required for this exact free pre-revenue validation rather than treating it as an inherited assumption;
3. populate the real operator name/contact values and any additional field independently confirmed as required;
4. perform the applicable BTK place-provider notification step at the required time — as compliance, not an application permission mechanism;
5. authorize and provision the approved Türkiye production environment;
6. bind the authoritative outer reverse proxy to encrypted ≥365-day Türkiye-resident traffic evidence and prove spoofing/access/immutability/retention controls;
7. procure a then-current 5070-authorized Turkish ESHS timestamp service and verify real RFC 3161-compatible timestamping against synthetic closed-log bytes;
8. verify production TLS/network/admin/secrets;
9. verify production backup/restore and deletion propagation;
10. execute the real one-listing pre-publication moderation checklist.

These items must be classified by materiality at the next advisor/activation decision rather than mechanically promoted to prior-permission blockers.

## Official/standards anchors

- 5651 place-provider notification interface: https://yersaglayici.btk.gov.tr/
- BTK authorized ESHS list: https://www.btk.gov.tr/elektronik-sertifika-hizmet-saglayicilari
- BTK e-signature/time-stamp FAQ: https://www.btk.gov.tr/e-imza-ile-ilgili-sikca-sorulan-sorular
- RFC 3161: Internet X.509 Public Key Infrastructure Time-Stamp Protocol.
- 5651 Article 5: statutory place-provider traffic-retention envelope and accuracy/integrity/confidentiality duty.
