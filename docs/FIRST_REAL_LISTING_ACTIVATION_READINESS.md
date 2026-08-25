# First Real Listing Activation Readiness

Issue: #75  
Phase boundary: **synthetic implementation and design only**.

AWS OFF. Production OFF. Real data/users OFF. Paid infrastructure OFF. Tarladan untouched.

This document is the canonical activation plan. It does not authorize business registration, BTK notification, AWS provisioning, production activation, paid timestamp procurement or personal-data collection.

## Current gate state

- **Gate A — activation-facing synthetic implementation: CONDITIONAL PASS.**
- Gate A exact evidence head: `28f5423369dd1e76489adc5f42c46c9f9b3c83f3`.
- **Gate B — 5651 production traffic-evidence design: synthetic contract under exact-head validation.**
- First real listing remains **NO-GO**.

## Resolved / non-blocking legal positions

- **ETBİS:** not required for the current listing-discovery + phone-only off-platform contract model. Re-open if ordering, checkout, payment, reservation, commission or platform contract formation is added.
- **VERBİS:** current scale/activity is treated as exempt; substantive KVKK duties still apply.
- **KEP:** not a current activation prerequisite for the present model.
- **Public seller phone:** use the KVKK 5/2-d intentional-publication (alenileştirme) model with strict purpose limitation. Publication acknowledgement is separate from aydınlatma.
- **WhatsApp:** no Art. 9 mechanism will be built for Stage 1–3. Intake, complaint and seller CTA remain OFF.
- **Seller scope:** Stage 1–3 supports only private occasional sellers listing their own used personal/household goods. Professional/business/regular sellers and new-for-resale goods fail closed.

## Processing-basis matrix

| Purpose | Minimum data | KVKK basis | Guardrail |
| --- | --- | --- | --- |
| Listing intake / service request | display name, phone, listing text/photos | 5/2-c where necessary | no blanket consent; collect only after aydınlatma |
| Public seller contact | phone | 5/2-d | intentional publication + listing-only purpose limitation |
| Moderation / abuse / security | minimum moderation and security metadata | 5/2-f | documented balancing + minimization |
| Dispute / takedown evidence | minimum complaint/evidence record | 5/2-e | retain only what is needed for the claim |
| Statutory KVKK / 5651 records | required compliance records / traffic metadata | 5/2-ç | separate retention schedule; do not conflate with listing data |

Aydınlatma is delivered; it is not “accepted”. Any public-phone publication acknowledgement is a separate statement.

## 5651 place-provider workstream

Arar Buluruz conservatively treats the service as a **yer sağlayıcı** because seller-originated listing text/photos are hosted.

### BTK Yer Sağlayıcılığı Bildirimi — pre-activation runbook

Do **not** submit during synthetic development.

Before the first real listing:

1. Business/operator legal identity is finalized.
2. The public **yerleşim yeri/address** blocker is independently resolved.
3. `/iletisim` contains the real operator identification/contact/address information.
4. Confirm domain/service identifiers and the legal operator that will make the notification.
5. Open the official BTK Yer Sağlayıcılığı Bildirim Arayüzü and prepare the requested current information.
6. Submit only after the operator/business identity exists and before real hosting activity is activated.
7. Save the notification evidence/confirmation in the private compliance record; do not commit sensitive identity documents to Git.
8. Any later change to operator/domain/contact information is reviewed for notification/update requirements.

Official interface: https://yersaglayici.btk.gov.tr/

### Public identification/contact

The pilot route graph exposes `/iletisim`, directly reachable from public navigation. Synthetic builds may render safe activation-pending placeholders. Any build explicitly marked for real-data activation must fail before build if required real identity/contact values are absent.

Required activation values:

- operator real-person / legal-operator name;
- public address/yerleşim yeri after the separate blocker is resolved;
- electronic contact;
- phone;
- tax / trade-registry identifiers when applicable/available.

Do not invent virtual-office equivalence.

### 5651 Gate B — production traffic evidence

The detailed authoritative design is maintained in:

`docs/5651_TRAFFIC_LOGGING_GATE_B.md`

Canonical rules:

- exactly one authoritative producer at the trusted outer public HTTP/TLS reverse-proxy layer;
- canonical source IP comes from the producer socket peer, not arbitrary forwarding headers;
- exact minimum schema includes request timestamp, source/destination IP and ports, method, pathname, status, service/protocol, and reliable duration/end/byte fields;
- no subscriber ID because Stage 1–3 has no Auth;
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

No proactive blanket content-monitoring system is required for this pilot.

Operational flow:

1. Receive notice through the published takedown/privacy channel.
2. Wrong-person phone, child/special-category data, clear illegality or comparable high-severity claim → immediately unpublish first.
3. Preserve the minimum evidence required to assess/resolve the notice.
4. Resolve: delete/correct/reject, or republish only after the issue is safely cleared.
5. Record the minimum action/result metadata.
6. Do not retain the removed listing content merely because a traffic-log retention duty exists.

## Stage 1–3 seller/category policy

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
- `/ilan-ver` collects no personal/listing data in the browser for Stage 1–3; it shows the pre-collection notice/rules and a founder **phone** contact action.
- Founder then creates the pending listing manually through the already-proven private operator path.
- Aydınlatma must be delivered **before** the founder collects the seller’s data by phone.
- Separate public-phone publication acknowledgement.
- Photo/content ownership + no child/third-party/special-category warning.
- Listing detail includes strict contact-purpose limitation.
- Obvious privacy/wrong-person/takedown contact.
- Private-seller declaration is required operationally before publication.
- Professional/business/regular/new-for-resale seller flows fail closed for Stage 1–3.

## Real-data activation build gate

Synthetic `pilot-rc` builds remain possible with safe placeholder public operator information.

An explicit real-data activation build (`ARAR_REAL_DATA_ACTIVATION=enabled`) must fail closed unless all required real operator public-information environment values are provided. The activation flag does not itself authorize deployment or real-data collection.

## Remaining real-activation blockers

The following are intentionally deferred:

1. independently resolve the public **yerleşim yeri/address** requirement;
2. establish the real-person commercial-enterprise/business identity;
3. populate real `/iletisim` and aydınlatma identity/contact/address fields;
4. make the actual BTK place-provider notification;
5. authorize and provision the approved Türkiye production environment;
6. bind the authoritative outer reverse proxy to encrypted ≥365-day Türkiye-resident traffic evidence and prove spoofing/access/immutability/retention controls;
7. procure a then-current 5070-authorized Turkish ESHS timestamp service and verify real RFC 3161-compatible timestamping against synthetic closed-log bytes;
8. verify production TLS/network/admin/secrets;
9. verify production backup/restore and deletion propagation;
10. execute the real Stage-1 pre-publication moderation checklist.

Only after these steps may FIRST REAL LISTING move from readiness to GO.

## Official/standards anchors

- 5651 place-provider notification interface: https://yersaglayici.btk.gov.tr/
- BTK authorized ESHS list: https://www.btk.gov.tr/elektronik-sertifika-hizmet-saglayicilari
- BTK e-signature/time-stamp FAQ: https://www.btk.gov.tr/e-imza-ile-ilgili-sikca-sorulan-sorular
- RFC 3161: Internet X.509 Public Key Infrastructure Time-Stamp Protocol.
- 5651 Article 5: statutory place-provider traffic-retention envelope and accuracy/integrity/confidentiality duty.
