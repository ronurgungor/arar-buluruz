# First Real Listing Activation Readiness

Issue: #75  
Phase boundary: **synthetic implementation only**.

AWS OFF. Production OFF. Real data/users OFF. Paid infrastructure OFF. Tarladan untouched.

This document is the canonical implementation plan for the first-real-listing activation gate. It does not authorize business registration, BTK notification, AWS provisioning, production activation, payment, or personal-data collection.

## Resolved / non-blocking legal positions

- **ETBİS:** not required for the current listing-discovery + phone-only off-platform contract model. Re-open if ordering, checkout, payment, reservation, commission, or platform contract formation is added.
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
2. `/iletisim` contains the real operator identification/contact information.
3. Confirm domain/service identifiers and the legal operator that will make the notification.
4. Open the official BTK Yer Sağlayıcılığı Bildirim Arayüzü and prepare the requested current information.
5. Submit only after the operator/business identity exists and before real hosting activity is activated.
6. Save the notification evidence/confirmation in the private compliance record; do not commit sensitive identity documents to Git.
7. Any later change to operator/domain/contact information is reviewed for notification/update requirements.

Official interface: https://yersaglayici.btk.gov.tr/

### Public identification/contact

The pilot route graph must expose `/iletisim`, directly reachable from the homepage/footer. Synthetic builds may render safe “activation pending” placeholders. Any build explicitly marked for real-data activation must fail before build if required real identity/contact values are absent.

Required activation values:

- operator real-person / legal-operator name;
- address;
- electronic contact;
- phone;
- tax / trade-registry identifiers when applicable/available.

### 5651 traffic logging architecture

Treat traffic logs as a **separate legal-retention class**, not as listing/contact/photo data.

Minimum record only:

- trusted client/source IP from the production ingress boundary;
- UTC timestamp;
- HTTP method;
- pathname **without query string**;
- service/host identifier;
- response status/result;
- optional duration/bytes if operationally required.

Never log:

- request/response bodies;
- passwords;
- authorization/cookie headers;
- API keys, signed URLs or tokens;
- seller phone numbers;
- listing descriptions/photos;
- query strings containing user/search/personal content.

Storage/operations requirements:

- retention target: **at least 1 year**;
- encrypted storage at rest;
- least-privilege access restricted to the operator/compliance need;
- integrity protection and evidence of log rotation/retention;
- accurate UTC time source;
- deletion policy for listings must explicitly preserve legally-required traffic logs while deleting live listing/contact/photo data;
- production ingress must establish the authoritative client IP; application code must not blindly trust arbitrary client-supplied forwarding headers.

The repository contains a pure traffic-log normalization contract and tests. Production persistence/ingress binding remains an infrastructure activation gate because AWS is still OFF.

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

## Remaining blockers after synthetic implementation

The following are intentionally deferred because they require real operator/infrastructure activation:

1. establish the real-person commercial-enterprise/business identity;
2. populate real `/iletisim` and aydınlatma identity/contact fields;
3. make the actual BTK place-provider notification;
4. authorize and provision the approved production environment;
5. bind authoritative ingress/IP logging to encrypted ≥1-year traffic-log storage and verify integrity/retention/access controls;
6. verify production TLS/network/admin/secrets;
7. verify production backup/restore and deletion propagation;
8. execute the real Stage-1 pre-publication moderation checklist.

Only after these steps may FIRST REAL LISTING move from readiness to GO.

## Official source anchors

- 5651 place-provider notification interface: https://yersaglayici.btk.gov.tr/
- BTK place-provider navigation/list: https://www.btk.gov.tr/yer-saglayici-listesi
- 5651 Art. 5 traffic retention principle (1–2 year statutory envelope; accuracy/integrity/confidentiality): https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d24/c070/tbmm24070053ss0524.pdf
- 5651 place-provider no-general-monitoring / notice-and-takedown principle reflected in Art. 5: https://normkararlarbilgibankasi.anayasa.gov.tr/Dosyalar/Kararlar/KararPDF/2015-112-nrm.pdf
- Current resolved ETBİS phone-only/off-platform model source: https://ticaret.gov.tr/ic-ticaret/sikca-sorulan-sorular/elektronik-ticaret
- KVKK aydınlatma / separate consent principle: https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu
- KVKK alenileştirme guidance: https://www.kvkk.gov.tr/Icerik/6843/-ALENILESTIRME-HAKKINDA-KAMUOYU-DUYURUSU
