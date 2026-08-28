# Arar Buluruz — Decision Log

_Last updated: 2026-08-28, Europe/Istanbul_

This is an append-oriented record of consequential product, technical and operating decisions. It preserves **what was decided, why, alternatives rejected and what would cause reconsideration**.

Do not use this file for routine implementation details or temporary task notes.

## Decision format

Each new entry should include:

- date and status;
- decision;
- rationale;
- rejected or deferred alternatives;
- consequences and review trigger;
- evidence or related PR when available.

---

## D-001 — Independent project boundary

- **Date:** 2026-07-27
- **Status:** Active
- **Decision:** Arar Buluruz is independent from Tarladan and shares no code, data, integrations or brand assets.
- **Rationale:** Prevent cross-project coupling, accidental data/secret reuse and unclear ownership.
- **Review trigger:** None expected; changing this would require explicit founder approval and a migration plan.

## D-002 — Search-first, categoryless product model

- **Date:** 2026-07-27
- **Status:** Active
- **Decision:** Users search with natural terms; the product does not require visible category-tree navigation or category selection for listing creation.
- **Rationale:** The product thesis is speed and simplicity rather than marketplace taxonomy management.
- **Deferred alternative:** Category browsing and category-driven forms.
- **Review trigger:** Repeated real-user search failures that cannot be solved through search quality, synonyms or lightweight filters.

## D-003 — Frontend-only prototype first

- **Date:** 2026-07-27
- **Status:** Completed for prototype validation; current V0 boundary is D-019
- **Decision:** Initial development uses local mock data with no real backend, database, auth, storage, secrets, payments or ad SDK.
- **Rationale:** Validate the core experience before introducing ownership, security, KVKK, abuse and operating burdens.
- **Review trigger:** The published public snapshot remains the mock prototype until separately approved remote activation, environment connection, real data and publication gates are completed.

## D-004 — GitHub `main` is canonical

- **Date:** 2026-07-28
- **Status:** Active
- **Decision:** GitHub `main` is the canonical code and documentation source. Chat memory and Lovable state are secondary.
- **Rationale:** A versioned, reviewable and transferable source prevents knowledge fragmentation and vendor lock-in.
- **Consequence:** Important facts and decisions must be written back to repository documentation.

## D-005 — Founder-owned future backend

- **Date:** 2026-07-28
- **Status:** Ownership principle active; provider target now superseded by D-021
- **Decision:** Any future backend must be founder-controlled; Lovable backend remains disabled. The earlier Supabase-specific provider commitment is no longer an active next-step decision.
- **Rationale:** Preserve account, billing, administrator, data and provider-exit control.
- **Requirements:** GitHub-canonical schema/migrations; reviewed RLS, auth, backups, region, retention/KVKK, secrets and export/restore.
- **Review trigger:** Future backend activation follows D-021 and still requires a separate founder gate.

## D-006 — One active code writer

- **Date:** 2026-07-28
- **Status:** Active
- **Decision:** Only one AI/tool writes code at a time.
- **Rationale:** Prevent overlapping edits, hidden divergence, unreviewable merges and unclear ownership of failures.
- **Handoff requirement:** Finish or stop the task, secure changes in Git, and verify exact branch/SHA before switching writers.

## D-007 — Bun and lockfile discipline

- **Date:** 2026-07-29
- **Status:** Active
- **Decision:** `bun.lock` is canonical; Bun `1.3.14` is pinned for validation. Default checks use Bun commands.
- **Rationale:** Match the existing lockfile and CI while avoiding dependency drift.
- **Prohibited shortcut:** `npm install`, `npm ci` or creation of a second lockfile without an explicit package-manager migration decision.
- **Clarification:** Test-only dependencies may be exact-pinned in `devDependencies` and resolved through the canonical Bun lockfile.

## D-008 — Controlled contact flow

- **Date:** 2026-07-28
- **Status:** Active only for synthetic prototype behavior; no real contact validation in V0
- **Decision:** All mock listings use one controlled telephone/WhatsApp target rather than unique fake seller numbers.
- **Rationale:** Prevent accidental contact with real third parties while preserving the interaction flow.
- **V0 boundary:** This synthetic interaction does not validate the future seller-contact model.
- **Review trigger:** A separately approved direct-seller-contact model with verified ownership, privacy, abuse and operating controls.

## D-009 — Search and mobile defects fixed before further expansion

- **Date:** 2026-07-29
- **Status:** Completed
- **Decision:** Fix confirmed multi-word search failure and mobile fixed-footer overlap before adding speculative features.
- **Rationale:** Both defects affected the core discovery/contact flow and were reproduced by automated E2E.
- **Evidence:** PR #14 and `AUTOMATED_E2E_REPORT_2026-07-29.md`.

## D-010 — Use expiring Lovable credits only on bounded frontend work

- **Date:** 2026-07-29
- **Status:** Completed
- **Decision:** Spend all five expiring credits on a limited mobile-flow audit, bounded frontend corrections and the complete 81-province list.
- **Rationale:** Preserve value without opening backend, dependency or irreversible scope.
- **Exception recorded:** Variants were unavailable, so Lovable wrote to `main`; the diff was independently reviewed and generated route-tree drift was reverted.
- **Future rule:** Return to an isolated branch/variant workflow when available.

## D-011 — Risk-based validation rather than ritual testing

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** Testing depth follows the risk and behavior touched by a change. The current low-risk mock prototype does not require repeated full or five-person test cycles after every small change.
- **Rationale:** Repeated validation was consuming more time than the residual risk justified.
- **Normal expectation:** Bounded frontend work uses lint/build plus a focused behavior check; higher-risk slices receive proportionally deeper tests.
- **Escalation triggers:** Real data, auth, storage, payment, public pilot, security-sensitive changes, conflicting user feedback or a change touching previously validated behavior.

## D-012 — Work/Codex/Lovable/main-assistant routing

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** Continue directly when the path is clear and low-risk; use Work for independent strategy/architecture/security/KVKK analysis; use Codex when analysis requires repository/terminal/test/debugging execution; use Lovable for bounded frontend work under safe review conditions.
- **Rationale:** Match tasks to specialist strengths without unnecessary handoffs.
- **Important limitation:** Nominal capability, current-session availability and project authorization are separate and must be understood before consequential actions.

## D-013 — Repository-backed shared AI memory

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** Important project knowledge must be stored in structured GitHub documents so new AI tools and chats can reconstruct the project from canonical sources.
- **Rationale:** Shared, versioned context increases team competence and prevents each chat from rebuilding the same understanding.
- **Structure:** Stable memory, current state, backlog, decision log, capability matrix and dated evidence have separate responsibilities.
- **Limitation:** An AI without repository access cannot automatically read this memory and must be given the relevant files or a bootstrap prompt.

## D-014 — Main assistant is the default executor; specialist outputs are advisory

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** The main assistant is the default executor and coordinator whenever it has the necessary tools and can complete the work safely. Work and Codex are optional specialists used when their additional analysis, terminal execution, testing or independent challenge materially improves the decision or implementation.
- **Rationale:** Direct execution reduces transcription risk, unnecessary handoffs and fragmented ownership.
- **Governance rule:** No AI output is a binding command. Recommendations are checked against canonical GitHub sources, evidence, project constraints and founder intent.
- **Review proportionality:** Double or triple checking is reserved for consequential, uncertain, security/KVKK-sensitive, costly or difficult-to-reverse decisions. It is not required for routine low-risk work.
- **Deferred alternative:** Making Work or Codex the mandatory primary writer or mandatory reviewer for every task.
- **Review trigger:** Repeated main-assistant implementation failures, loss of required connectors, a task exceeding demonstrated capability, or a high-risk decision that clearly benefits from specialist review.

## D-015 — Every new chat receives application, work and team context

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** Every new Arar Buluruz chat must begin from a repository-backed bootstrap that covers the application, current tasks, decisions, team roles, nominal capabilities, demonstrated capabilities, session limits and approval boundaries.
- **Rationale:** Shared context reduces duplicate analysis, contradictory instructions and unnecessary handoffs.
- **Implementation:** `docs/AI_CHAT_BOOTSTRAP.md` is the common entry point; `AI_TEAM_CAPABILITIES.md` and `WORK_CODEX_CAPABILITY_PROFILE.md` preserve team knowledge.
- **Practical rule:** Routine low-risk work may use a concise bootstrap; the requirement must not become a ceremony that delays obvious execution.
- **No-access fallback:** A chat without GitHub access must say so and receive the minimum bootstrap files and task-specific evidence.
- **Review trigger:** Update the bootstrap when architecture, current stage, team roles, capabilities or governance change materially.

## D-016 — Reduced founder-operated persistence pilot

- **Date:** 2026-07-30
- **Status:** Gate 1 technical asset retained; real-pilot sequencing frozen and superseded by D-019/D-021
- **Decision:** The completed Gate 1 work remains a reusable PostgreSQL migration/RLS/adapter validation asset. It is not the active product phase and does not authorize a real pilot.
- **Data model:** The prepared `listings` migration contains `id`, `title`, `description`, `price_amount`, `province`, `district`, `seller_display_name`, `search_keywords`, `status`, `created_at`, `updated_at`, `published_at`, `expires_at` and `unpublished_at`. Initial status values are `draft`, `published` and `unpublished`.
- **Public boundary:** The prepared RLS visibility condition is `status = 'published' and published_at <= now() and expires_at > now()`. Anonymous/public INSERT, UPDATE and DELETE remain prohibited.
- **Canonical schema:** Schema and security changes remain migration-canonical in GitHub.
- **Approval boundary:** No remote Supabase organization/project, environment connection, real data or pilot publication is authorized.
- **Evidence:** PR #25; head `1d9d0f6112464e5078d90df510488f7a786cddef`; normal merge commit `994b8b1705d52434be0c000093a052fa0e519542`; frozen Bun install, lint, unit/build, clean local reset, 22/22 pgTAP, REST/RLS and desktop/mobile E2E passed before merge.
- **Review trigger:** D-021's separately approved production/backend POC gate.

## D-017 — Web-first delivery and minimal PWA boundary

- **Date:** 2026-07-30
- **Status:** Minimal-PWA scope active; former post-PWA real-pilot sequence superseded by D-019
- **Decision:** Preserve responsive web and implement only the separate narrow minimal-PWA package.
- **Minimal PWA scope:** Manifest, durable application identity, correct icons, installability and a safe, honest offline/error screen.
- **Excluded:** Push notifications, full offline listing functionality, background sync, cache-first storage of dynamic listings, auth, real backend, advertising, analytics, TWA and Play Store.
- **Play Store gate:** Play Store publication remains a separate future value decision and is not automatic.
- **Review trigger:** A material platform-policy change, proven installation/distribution problem or measured device-integration requirement.

## D-018 — Routine execution authority and escalation boundary

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** The main assistant is the active primary implementer and coordinator. It independently performs routine technical details, small implementation choices, test maintenance, reversible repository operations, debugging and validation within the canonical scope.
- **No-routine-handoff rule:** Work or another independent advisor is not required for ordinary implementation or review. Specialist review is used only when it materially improves an important decision or when the founder explicitly requests it.
- **Mandatory founder escalation:** Stop before a new product/architecture direction, scope expansion, new security/KVKK/personal-data risk, remote Supabase project or migration, secret/environment change, real data, Lovable Publish/Update or another production deployment, paid service, advertising, analytics/external SDK, expensive-to-reverse/high-operational-impact action, or a genuine unresolved canonical conflict.
- **Rationale:** Preserve execution speed and clear ownership while retaining explicit founder control over consequential gates.
- **Consequence:** Low-risk work proceeds without repeated approvals; exact SHA, tests, mutations, risks and rollback remain reportable.
- **Review trigger:** Reconsider if routine autonomy causes repeated scope drift, unsafe mutations or insufficient founder visibility.

## D-019 — V0 UX/value validation freeze and no-rebuild guardrails

- **Date:** 2026-07-31
- **Status:** Active except the backend-provider freeze is superseded by D-021
- **Phase:** **V0 — UX ve değer önerisi doğrulaması.**
- **Validated only:** Product comprehension; search and listing discovery; listing cards and detail pages; mobile/desktop usability; minimal-PWA installability; general user interest.
- **Not validated:** Real listing supply; account creation; listing ownership/management; sustainable moderation; seller-contact operations; or a functioning supply-demand loop.
- **Live-data boundary:** V0 uses only synthetic/mock listings and is honestly labelled as a test version. No real account, real listing, real seller phone/email, advertising or analytics is used.
- **Minimal-PWA boundary:** Only manifest, durable identity, correct icons, installability and a safe/honest offline-error screen. No push, background sync, full offline listings, cache-first dynamic listings, auth, real backend, advertising, analytics, TWA or Play Store.
- **No-rebuild architecture:** PostgreSQL migrations remain canonical; UI/domain rules remain provider-independent; Supabase calls stay behind adapters; future user identity uses an internal UUID rather than email/phone foreign keys; no choice may block a future nullable `listings.owner_user_id`; JWT/auth-claim shape stays out of the domain model; and no Supabase Storage, Realtime, Edge Functions or provider-heavy feature is added before backend selection.
- **Supabase Free:** May be considered only for development and technical verification. It is not assumed to be reliable production infrastructure for a real external-user pilot.
- **Backend freeze:** Historical freeze superseded only by D-021's target-architecture decision. Production activation, paid infrastructure, real data, Auth, Storage and secrets remain separately gated.
- **Execution:** V0 stays synthetic/mock unless a separate founder gate explicitly changes the live-data phase.
- **Rationale:** Validate the value proposition at zero incremental service cost while preserving reusable migration/domain boundaries and avoiding premature backend churn.
- **Rollback:** Revert the affected implementation merge; no remote backend, secret or personal data is created merely by architectural preparation.

## D-020 — Provider-neutral external sales link and fraud baseline

- **Date:** 2026-08-07
- **Status:** Active architecture/security baseline; public V0 activation closed
- **Decision:** The product concept is **External Sales Link / Haricî Satış Bağlantısı**, not a Shopier integration. Sellers may eventually provide one optional HTTPS link to an allowed third-party sales/payment/shipping service or their own sales page. Arar Buluruz does not collect/hold transaction funds, access Shopier accounts, use Shopier API/OAuth, import orders or buy shipping labels.
- **UX contract:** One field only: label `Satış bağlantısı (isteğe bağlı)`; persistent helper `Shopier gibi bir ödeme/kargo hizmetini veya kendi satış sayfanızı kullanıyorsanız bağlantısını ekleyebilirsiniz.`; placeholder `Örn. https://shopier.com/...`. No provider dropdown or second Shopier question.
- **Shopier boundary:** Plain nominative text only. No logo/badge/colors, partnership/support wording, “güvenli satın al”, verified-seller/product claim, escrow equivalence, API or OAuth. The initial exact-host registry is limited to `shopier.com` and `www.shopier.com`; unverified Shopier hosts are not guessed.
- **Security classification:** Non-empty candidates produce only `INVALID`, `KNOWN_PROVIDER_CANDIDATE` or `CUSTOM_DOMAIN_REQUIRES_REVIEW`. No result is called safe or verified.
- **Fraud model:** URL syntax/security, provider identity, URL ownership, listing/product match, moderation, complaints and kill-switch remain separate dimensions. New/changed links start pending; public CTA requires explicit moderation approval.
- **Current implementation boundary:** Dependency-free pure URL validation/canonicalization and tests are authorized. Scraping, server-side arbitrary fetch, redirect crawling, DNS resolution, reputation SaaS, ownership proof, real external links, real transactions and public activation are not.
- **Rationale:** Preserve provider neutrality, prevent hostname spoofing/SSRF-adjacent design mistakes and create a reusable duplicate/moderation boundary before real data or payments exist.
- **Evidence:** `docs/EXTERNAL_SALES_LINK_SECURITY.md` plus the dedicated unit/red-team suite; merge/PR identity to be appended in the implementation report.
- **Review trigger:** Shopier written response; a real external-sales pilot; a need to add another provider; or a backend/moderation gate that introduces persistent links.

## D-021 — Hybrid architecture with Türkiye self-hosted Supabase target

- **Date:** 2026-08-07
- **Status:** Target architecture active; paid production/backend activation closed
- **Decision:** When real personal data/backend production is justified, the target data plane is self-hosted Supabase on a Türkiye-located Linux VPS. Frontend/CI layers that do not carry personal data may remain on external services as appropriate. A personal computer is not a production server.
- **Supersession:** This decision supersedes only D-019's provider-selection freeze. D-019's synthetic V0, no-real-data, KVKK-min, no-rebuild and separate-publication boundaries remain active until separately changed.
- **Preparation now:** Reuse canonical PostgreSQL migrations, RLS tests, REST adapter boundaries, synthetic data and zero-cost CI/local Supabase assets. Document compatibility, environment contract, backup/restore and minimum runbook. Do not create unnecessary infra code.
- **Production POC gate:** Before real production, a separately approved Türkiye VPS POC must prove Docker startup/reboot recovery, migrations, applicable Auth/RLS/Storage checks, HTTPS, non-public Postgres and Studio/admin, off-VPS backup, restore onto a completely empty environment, log rotation, uptime alerting, rate limiting, rollback and at least 72 hours of stability. Restore failure is automatic NO-GO.
- **Cost boundary:** No VPS, SMS, KYC, fraud SaaS, monitoring SaaS, paid database/storage or other recurring infrastructure in this gate. Security, mandatory law/KVKK and data-loss prevention cannot be waived to preserve zero cost.
- **Legal boundary:** Before real personal data/users, minimum KVKK/privacy notice, processing purpose, retention/deletion and provider/data-flow mapping must be ready. Paid legal advice, if needed, receives a separate founder gate.
- **Rationale:** Keep cash cost near zero before market entry while preserving a migration-canonical, provider-independent path to a Türkiye-hosted data plane without rebuilding the application domain.
- **Evidence:** `docs/TR_SELF_HOSTED_SUPABASE_PREP.md`; the current Gate 1 migration/RLS/REST assets remain unchanged by this decision.
- **Next founder trigger:** A real backend/personal-data pilot close enough to justify selecting and paying for a Türkiye VPS and running the mandatory production POC.

## D-022 — Zero-spend budget/revenue gate for recurring production infrastructure

- **Date:** 2026-08-09
- **Status:** Active hard founder constraint
- **Decision:** Arar Buluruz currently earns no revenue. No paid VPS, paid hosted backend, paid backup or other recurring paid production infrastructure is authorized until a separate explicit **FOUNDER BUDGET / REVENUE GATE** is opened and approved.
- **Rationale:** Technical preparedness must not silently create recurring spend before the project has revenue or a founder-approved budget reason to incur it.
- **Consequence:** D-021 and technical runbooks may continue to define future production prerequisites, provider requirements, POC acceptance, backup/restore and rollback. Satisfying those technical conditions does **not** authorize a purchase while D-022 is closed.
- **Deferred alternatives:** Selecting a production VPS vendor, selecting a paid backup vendor, or committing to recurring infrastructure based solely on a research recommendation or technical readiness.
- **Review trigger:** Explicit founder budget/revenue authorization after the business case, recurring price and exit/rollback implications are reviewed.

## D-023 — Initial real supply intent is validated, but operational marketplace supply is not

- **Date:** 2026-08-09
- **Status:** Historical evidence boundary; current product assumptions superseded by D-025
- **Decision:** Founder-accepted post-publication user feedback establishes that users found the application understandable and that real users explicitly said their own listings may be published. This is sufficient to record **initial real supply intent** as validated.
- **Rationale:** The prior V0 boundary correctly avoided claiming real supply without evidence; the new user statements are direct evidence of willingness to supply listings.
- **Limit:** This does not validate real listing intake, listing ownership, seller-contact operations, moderation sustainability, payment/external-sales safety, transaction conversion or a functioning supply-demand loop.
- **Consequence (historical):** At that time the future first real pilot target remained 5–10 founder-controlled Çorlu listings. D-025 later supersedes the Çorlu-only/founder-controlled intake product assumption. Real personal-data collection and public real-listing activation still require separate founder gates.
- **Review trigger:** Actual controlled pilot operations, measured seller completion/retention, moderation outcomes and buyer behavior.

## D-024 — Simplified intentionally public seller contact for the initial Çorlu pilot

- **Date:** 2026-08-10
- **Status:** Historical/superseded product contract; public-contact storage/lifecycle principles remain relevant where not replaced by D-025
- **Decision (historical):** For the founder-operated initial 5–10 listing Çorlu pilot, each publishable listing had one intentionally public seller-contact channel. D-025 supersedes the founder-operated/Çorlu-only/single-choice product framing and now permits Telefon / WhatsApp / Telefon + WhatsApp. The authoritative public-contact storage/lifecycle boundary on `public.listings` remains relevant.
- **Public exposure:** Active published `contact_channel` and `contact_e164` are deliberately anonymously readable under the same listing RLS lifecycle. A raw PostgREST caller may enumerate those two fields for all active published rows; for this small intentionally-public pilot this is an **accepted public-disclosure consequence**, not a hidden security boundary.
- **Application minimization:** The normal UI exposes the selected CTA only on listing detail. Collection-card payloads, sitemap and structured/search metadata do not intentionally carry contact. UI omission does not make the contact secret.
- **Lifecycle:** Draft/pending/rejected are non-public. Expired/unpublished cease normal public retrieval. Contact identity changes reset verification and publication instruction and immediately unpublish a live listing; seller withdrawal of the publication instruction also unpublishes. Reverification + new instruction + explicit republish are required.
- **Verification meaning:** WhatsApp same-number control or founder phone callback/equivalent proves present control only; it does not prove legal identity, item ownership or permanent number ownership. `publication_instruction_at` is an operational audit fact and is not automatically labelled KVKK explicit consent.
- **Rejected/deferred:** Anonymous contact resolver, cosmetic click-to-reveal, founder relay, in-app messaging, SMS OTP, Auth, CAPTCHA, contact-click analytics, separate `public_contact_enabled`, and WhatsApp username dependency for this pilot.
- **Privacy/legal boundary:** Real contact collection/publication remains blocked until exact controller identity, Article 5 legal bases, intentional-disclosure basis, collection-time aydınlatma, recipient groups, provider/data flows, Article 9 review where applicable, retention/deletion, data-subject/wrong-number procedure and current VERBİS applicability are resolved. No universal Turkey-hosting or blanket consent claim is created.
- **Cost:** No paid messaging/relay/auth service is introduced; recurring production cost authorization remains 0 TL.
- **Evidence:** `docs/REAL_CORLU_PILOT_SELLER_CONTACT.md`; implementation is prepared under PR #58 and must remain synthetic/local/CI-only until a separate activation gate.
- **Review trigger:** Material scraping/spam/harassment during real pilot, scale beyond founder-operated listings, need for buyer/seller accounts, verified availability of a phone-number-minimizing WhatsApp identifier, or a separately approved privacy/security architecture change.


## D-025 — Türkiye-wide seller self-service with verified-phone atomic auto-publication

- **Date:** 2026-08-27
- **Status:** Active founder-selected product contract; production/real-data activation closed
- **Decision:** Arar Buluruz moves from the earlier Çorlu-only founder-intake/pre-approval model to a normal Türkiye-wide consumer classifieds model. Sellers create their own listings directly, verify the listing phone, and the application atomically auto-publishes only after required declaration/publication evidence and trusted-photo state are complete.
- **Location:** Türkiye-wide İl / İlçe. Çorlu is no longer a product restriction.
- **Seller ownership:** No classic username/password account is required. `/ilanlarim` uses verified-phone capability isolation so a seller can see and manage only listings associated with the verified phone.
- **Lifecycle:** Seller can view, edit, unpublish, mark sold and delete authorized listings. Cross-phone mutation remains forbidden. Founder moderation is post-publication takedown/delete, not routine pre-publication entry or approval.
- **Contact:** Active listing may expose Telefon, WhatsApp or Telefon + WhatsApp according to seller choice. Buyer CTAs preserve exact `tel:` and `https://wa.me/` behavior. In-app chat remains out of scope.
- **Price:** Ücretsiz is an explicit state; free listings render as `Ücretsiz`, never `₺0`.
- **Search:** Existing normalization remains, including equivalent matching such as `b150` ↔ `b 150`.
- **Security invariants preserved:** RLS, service-role/browser separation, verified-phone capability isolation, direct anonymous write denial, private Storage, trusted image sanitization, signed-photo lifecycle, idempotency/race controls, rate limiting, partial-failure cleanup and fail-closed founder takedown are not weakened by the product change.
- **UX:** Public consumer identity is near-final classifieds UX, not pilot/test/founder/compliance-tool framing. Primary public navigation is Ara / İlan Ver / İlanlarım.
- **Supersedes:** D-023/D-024 only where they encoded Çorlu-only rollout, founder routine listing entry/pre-approval, phone-only/single-choice contact or no-self-service assumptions. Historical evidence and still-valid security/privacy principles are retained.
- **Production boundary:** This product decision does not authorize real personal data, production deployment, AWS, paid infrastructure, Ads, monetization, payment/order/reservation/commission, full classic Auth, native app or Tarladan changes.
- **Executable evidence:** PR #78 exact frontend checkpoint `41691652070cbc117a943578a49056d49d51e6f0`; all seven canonical workflows GREEN, including Stage 1 self-service acceptance run `33091191129` after a same-SHA rerun resolved a transient local port collision.
- **Canonical product document:** `docs/PRODUCT_CONTRACT_V2.md`.
- **Review trigger:** Measured real seller/buyer behavior, material abuse/security evidence, monetization, professional sellers, need for classic accounts/chat/payment, or a founder decision to change the product contract.


## D-026 — Simplified public-phone, rules-evidence and remembered-seller contract

- **Date:** 2026-08-28
- **Status:** Active founder-selected product contract; production/real-data activation closed
- **Decision:** Simplify D-025 without reopening the Türkiye-wide self-service direction. A seller provides one verified public phone; the buyer always receives both **Ara** and **WhatsApp** actions derived from the same E.164 number. The consumer no longer chooses Telefon / WhatsApp / Telefon + WhatsApp.
- **Publication evidence:** The three consumer declaration checkboxes are superseded. New publication records versioned `listing_rules_version` + `listing_rules_accepted_at`, together with verified-phone/publication/trusted-photo facts. Historical declaration columns remain nullable for history/migration compatibility and must not be fabricated for new rows.
- **Optional fields:** Condition and description are optional. Condition has no silent database/UI default; empty description is valid and no filler text is invented.
- **Seller recognition:** Successful verification creates a bounded 7-day signed, phone-bound HttpOnly, SameSite=Lax seller session, Secure on HTTPS. A valid session avoids needless repeat OTP. JavaScript-readable capability/sessionStorage storage is superseded.
- **Rate limiting:** OTP start is phone-primary plus coarse trusted-IP protection; wrong-code attempts are challenge-bounded; listing velocity is seller-phone-primary plus coarse trusted-IP protection; idempotent replay is resolved before new-listing quota consumption. Synthetic local CI may use explicit relaxed ceilings.
- **Moderation:** Founder remains post-moderation/takedown, not normal pre-publication approval.
- **Vasıta/EİDS:** Vasıta remains in the product and synthetic/local test scope. Real production vehicle publication fails closed until required EİDS authorization verification is integrated and separately approved.
- **Supersedes:** D-025 only where it specified seller contact choice, short consumer declarations, JavaScript-readable verified-phone capability framing, or effectively universal condition/description requirements. D-025's Türkiye-wide self-service, atomic publication, seller ownership, search and preserved security boundaries remain active.
- **Production boundary:** No production, real personal data, AWS, paid infrastructure, real SMS, Ads, payment/order, production EİDS or Tarladan change is authorized by this decision.
- **Review trigger:** Measured abuse, seller completion problems, a legal/production EİDS requirement, or a founder decision to change the consumer contract.

## D-027 — Settled company/KOSGEB/funded-production sequence

- **Date:** 2026-08-28
- **Status:** Active founder business sequence
- **Decision:** The current settled sequence is **APPLICATION COMPLETION → ŞAHIS ŞİRKETİ → KOSGEB → SUPPORT / INVESTMENT → FUNDED PRODUCTION / LEGAL / EİDS / INFRASTRUCTURE**.
- **Rationale:** Finish the application and technical product before opening avoidable company/recurring-cost/production work; then formalize the business and use KOSGEB/support/investment to fund production-grade legal, EİDS and infrastructure requirements.
- **Consequence:** Repository/local/synthetic work may continue. Company formation, paid production infrastructure, production legal/EİDS execution and recurring spend are not pulled forward merely because code is technically ready.
- **Compatibility:** D-022's zero-spend gate remains compatible. Historical production-provider research remains reference material, not a purchase instruction.
- **Review trigger:** A material KOSGEB eligibility/timing requirement, a legal deadline that must precede the sequence, or explicit founder revision.
