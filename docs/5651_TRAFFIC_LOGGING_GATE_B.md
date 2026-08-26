# 5651 Traffic Logging — Gate B

Issue: #75  
Decision scope: **production traffic-evidence design + synthetic contract only**.

AWS OFF. Production OFF. Real data OFF. Paid services OFF. No timestamp purchase/integration. Tarladan untouched.

This document defines the minimum production contract to be implemented only after explicit activation authorization. It does not provision infrastructure and does not make the BTK place-provider notification.

## Gate B decision

**GO for design / synthetic contract. NO-GO for production activation.**

The design is implementable without an enterprise observability stack. Production activation still requires the applicable Issue #75 operator/compliance decisions, any required BTK notification, Türkiye-resident infrastructure, and a 5070-qualified timestamp service from an authorized Turkish ESHS. Gate B itself does not decide whether a full public residence/business address is required for the one-listing fact pattern.

## 1. Authoritative producer

There is exactly one canonical 5651 traffic-log producer:

> **the trusted outer public HTTP/TLS reverse-proxy listener that terminates the client connection before the application**.

Baseline pilot chain:

```text
Internet client
  -> public TCP/TLS socket
  -> trusted reverse proxy / canonical 5651 producer
  -> private or loopback application listener
  -> Arar Buluruz application
```

The application is **not** the authoritative source of 5651 client-IP evidence. Application logs, framework request logs, CDN dashboards and third-party observability are non-canonical operational telemetry only.

### Trusted proxy rule

For the Gate B baseline the canonical producer directly observes the public socket peer:

- `source_ip` = kernel/socket peer IP at the canonical producer;
- `source_port` = kernel/socket peer port when exposed reliably;
- incoming `X-Forwarded-For`, `Forwarded`, `X-Real-IP` and similar client headers are ignored for canonical evidence;
- the reverse proxy overwrites forwarding headers sent downstream to the application;
- public clients cannot select or alter the canonical `source_ip` by supplying forwarding headers.

If a load balancer, CDN or another upstream proxy is inserted later, this trust model is **reopened before activation**. The exact upstream identity/private network must be fixed and authenticated; arbitrary forwarding headers remain forbidden. No generic “trust proxy = true” configuration is acceptable.

## 2. Exact proposed traffic-log schema

Storage format: one UTF-8 NDJSON record per completed HTTP request.

```json
{
  "schemaVersion": 1,
  "timestamp": "2026-08-25T08:00:00.000Z",
  "sourceIp": "203.0.113.7",
  "sourcePort": 51234,
  "destinationIp": "192.0.2.10",
  "destinationPort": 443,
  "method": "GET",
  "requestPath": "/ilan/93000000-0000-4000-8000-000000000001",
  "status": 200,
  "service": "public-web",
  "protocol": "https",
  "endedAt": "2026-08-25T08:00:00.025Z",
  "durationMs": 25,
  "transferredBytes": 1024
}
```

### Required fields

| Field | Rule |
| --- | --- |
| `schemaVersion` | fixed integer contract version |
| `timestamp` | request-start UTC ISO-8601 timestamp |
| `sourceIp` | authoritative socket-peer/client IP from the outer producer |
| `destinationIp` | server/listener destination IP observed by the producer |
| `destinationPort` | listener destination port |
| `method` | normalized HTTP method |
| `requestPath` | pathname only; **query string excluded** |
| `status` | final HTTP response status/result |
| `service` | allow-listed service identifier such as `public-web` |
| `protocol` | `http` or `https`; production public traffic must be HTTPS |

### Conditional fields

- `sourcePort`: record when the producer/runtime exposes the real peer port reliably.
- `endedAt`: request completion UTC time when meaningful/reliable.
- `durationMs`: integer request duration when meaningful/reliable.
- `transferredBytes`: response/transferred byte count only when the producer can measure it reliably.

There is **no subscriber/user/account ID field** because Stage 1–3 has no Auth.

### URL minimization invariant

The canonical record stores `pathname` only. Query strings are discarded before serialization. Product routes must never put seller phone/name, listing description, authorization material, signed-URL tokens, credentials or other personal content into URL path segments. Current dynamic public route identifiers are opaque listing UUIDs rather than seller identity/contact content.

## 3. Material that must never enter canonical traffic evidence

The canonical producer must not serialize:

- POST/request or response bodies;
- seller name or phone;
- listing description or photo contents/EXIF;
- `Authorization` headers;
- cookies;
- API/access/service tokens;
- signed URL query tokens;
- Supabase service-role or other secrets;
- arbitrary query strings/search text;
- browser/user-agent/header dumps unless a later necessity assessment explicitly adds a field.

The producer should be configured with an explicit field allow-list, not a “log everything then redact” pipeline.

## 4. Daily rotation and closed-log lifecycle

Rotation boundary: **UTC calendar day**.

For each date:

1. append canonical NDJSON records only to `traffic-YYYY-MM-DD.ndjson.open`;
2. never edit an earlier line;
3. at UTC rollover, flush/fsync the active file;
4. atomically close/rename to `traffic-YYYY-MM-DD.ndjson`;
5. close the writer handle; the closed artifact is never reopened for append;
6. compute SHA-256 over the exact retained closed-file bytes;
7. write a small immutable close manifest containing date, record count, byte length, SHA-256, close time and retention deadline;
8. enqueue the SHA-256 message imprint for qualified timestamping;
9. archive the closed log + close manifest into the restricted Türkiye-resident retention store.

A closed log is immutable by contract. Any correction produces a separate correction/evidence record; it never rewrites the original daily file.

## 5. Integrity and qualified timestamp flow

Plain SHA-256, filesystem `mtime`, host system clock, Git commits or ordinary application timestamps are **not** treated as a qualified timestamp.

At activation, every closed daily log follows:

```text
closed NDJSON bytes
  -> SHA-256
  -> RFC 3161 timestamp request containing only the SHA-256 message imprint
  -> Turkish ESHS authorized under 5070
  -> signed RFC 3161 timestamp token
  -> local verification
  -> retain token + verification metadata beside the closed-log evidence
```

### Preferred provider interface

The implementation should prefer RFC 3161 over HTTPS or an API that preserves equivalent RFC 3161 semantics.

Minimum request contract:

- hash algorithm: SHA-256;
- `messageImprint`: SHA-256 of the exact closed retained file;
- unpredictable nonce;
- request signing certificate in the response (`certReq=true`) where supported;
- optional policy OID only if the selected ESHS contract requires one;
- **never upload the traffic log itself when hash-only timestamping is sufficient**.

Minimum verification contract:

- RFC 3161/CMS token signature valid;
- certificate chain valid to the selected ESHS trust material;
- provider/service confirmed as an authorized Turkish ESHS/5070 timestamp service at activation time;
- token `messageImprint` equals the closed-file SHA-256 exactly;
- nonce equals the request nonce;
- token generation time parses and is retained;
- provider policy identifier, signer certificate and validation evidence retained as needed for later verification.

RFC 3161 compatibility is a technical protocol requirement; it is **not by itself proof of 5070 qualification**. Procurement must select a then-current authorized Turkish ESHS and confirm that the purchased service is its 5070 timestamp service.

### Provider outage

Timestamping is asynchronous and must never sit on the live HTTP request path.

If the ESHS is temporarily unavailable:

1. the daily log remains safely closed and immutable;
2. its SHA-256 close manifest remains stored;
3. a restricted durable queue stores the hash, nonce/request metadata, queue time and retry count — not the traffic log body;
4. retry occurs independently;
5. the public application continues to serve requests;
6. the daily evidence is not deleted while timestamping remains pending;
7. an operational alert is raised if pending timestamp age exceeds the activation runbook threshold.

Invalid/mismatched timestamp tokens are not silently retried as success: verification fails closed and requires investigation while the original closed log/hash remain preserved.

## 6. Retention model

These are independent lifecycle classes:

| Data class | Retention | Deletion behavior |
| --- | --- | --- |
| live listing/contact/photo | product lifecycle | delete/unpublish according to product/privacy flow |
| production backup | **≤14 days** rolling | automatic expiry; deletion propagates as already designed |
| canonical 5651 traffic log | **≥365 days** | automatic expiry only after minimum retention |
| daily SHA/close manifest | same as traffic log | retained with corresponding daily evidence |
| qualified timestamp token/verification evidence | same as traffic log | retained with corresponding daily evidence |
| timestamp retry queue | until verified timestamp receipt | remove queue item only after verified receipt is safely retained |
| narrow documented legal hold | exception | suspends expiry only for specifically identified evidence |

A live listing hard delete must **not** delete corresponding legally retained traffic evidence. Conversely, the traffic-log retention obligation must not be used to retain deleted listing text, seller phone, photo or other live content.

The statutory floor is one year; before production activation the exact then-current implementing rule is checked again. The configuration must never be below 365 days.

## 7. Türkiye-resident restricted storage contract

Gate B does not choose or provision a paid storage product.

Production storage must provide:

- Türkiye residency for retained traffic evidence;
- encryption at rest and encrypted transport;
- no public bucket/container/object access;
- separate traffic-log credentials from the application runtime;
- application role: no read, no list, no delete of traffic evidence;
- writer role: append active spool + finalize/put; no overwrite of closed evidence;
- narrowly assigned compliance/read role;
- lifecycle expiry at ≥365 days;
- documented legal-hold override;
- auditability of privileged access;
- no automatic forwarding to Frankfurt/global analytics/logging services.

The active local spool must also be on encrypted storage with restrictive filesystem permissions. The long-retention store must not depend solely on an ephemeral application filesystem.

## 8. Synthetic test plan

The repository contract must prove without production infrastructure:

1. **required fields:** expected source/destination IP+ports, timestamp, method, path, result, service/protocol and optional duration/bytes are generated;
2. **forbidden material:** query phone/name/token/description, authorization/cookie/token/body-shaped fields are absent;
3. **spoofing:** supplied `X-Forwarded-For` cannot change canonical `sourceIp`;
4. **network validation:** malformed source/destination IPs and ports fail closed;
5. **rotation:** one closed UTC-day NDJSON artifact; mixed dates rejected;
6. **integrity:** modified closed bytes fail SHA-256 verification;
7. **timestamp request:** RFC 3161 + SHA-256 imprint + nonce + certificate-request contract;
8. **timestamp verification:** mismatched imprint/nonce, invalid signature/chain or non-authorized provider fail closed;
9. **provider outage:** failure produces a safe hash-only pending queue record and does not throw into the application request path;
10. **retention:** minimum lifecycle is 365 days;
11. **storage boundary:** policy is Türkiye-resident, encrypted, public-deny, application-read/delete-deny, closed-overwrite-deny;
12. **no Auth identity:** no subscriber ID exists in the traffic schema.

These tests validate the contract only. Production reverse-proxy wiring, filesystem/object-store immutability, network ACL/IAM and real ESHS token verification remain activation-time infrastructure tests.

## 9. Activation-time work that requires AWS/infrastructure authorization

No action is taken now. Later authorization is required to:

- provision the approved Türkiye production host/network;
- bind the public listener/reverse proxy as the **single** authoritative producer;
- prove socket-peer client IP and spoofed-forwarding-header behavior on the real ingress;
- create encrypted active spool and Türkiye-resident restricted retention storage;
- enforce writer/compliance/application access separation;
- enforce daily rotation and ≥365-day lifecycle/expiry;
- prove closed-object overwrite/public-access denial;
- verify restore/read of evidence without exposing it to the application;
- verify no traffic log export to unapproved foreign/global observability destinations.

Any upstream LB/CDN introduced at this stage requires a fresh explicit trusted-proxy-chain test before Gate B production PASS.

## 10. Activation-time work that requires a paid/real ESHS

Do not procure now. At activation:

1. select a provider that is then-current on BTK’s authorized ESHS list;
2. confirm the purchased service is a 5070 timestamp service;
3. prefer/document its RFC 3161 endpoint or API-equivalent semantics;
4. record authentication method, TLS requirements, rate/quota, timestamp policy OID if applicable and verification trust chain;
5. perform a real SHA-256/RFC 3161 request against synthetic closed-log bytes;
6. verify signature, chain, ESHS identity, message imprint, nonce and generation time locally;
7. test provider outage/retry without losing the daily closed log.

No price, account, certificate or timestamp credit is purchased in Gate B design.

## 11. Separate Issue #75 legal/privacy question — public yerleşim yeri

The exact public operator **yerleşim yeri/address** applicability remains a separate Issue #75 legal/privacy question for the one-listing fact pattern.

Gate B traffic architecture does not resolve it and does not make a full address a technical prerequisite. Do not assume that a home address must be exposed; equally, do not assume that a virtual office, coworking address, mail-forwarding address or another substitute is legally equivalent. If the applicable rule independently requires a public address, the real value must be supplied before that requirement is treated as satisfied.

## Official/standards anchors reviewed for Gate B

- 5651 Article 5: place-provider traffic information retention within the statutory 1–2 year envelope and duty to ensure accuracy, integrity and confidentiality.
- BTK: electronic-signature/time-stamp framework under Law 5070 and current authorized ESHS list.
- BTK definition: a time stamp is an electronic record whose relevant time is verified with an ESHS electronic signature.
- RFC 3161: Internet X.509 PKI Time-Stamp Protocol.
- Current Turkish ESHS policy examples confirm RFC 3161 timestamp service is operationally available in Türkiye; provider selection is deferred until activation.

## Gate B closure rule

Synthetic contract PASS permits only the statement:

> **5651 Gate B production traffic-evidence design is technically ready to bind during production infrastructure activation.**

It does **not** authorize AWS, production, real data, business registration, BTK notification or ESHS procurement.
