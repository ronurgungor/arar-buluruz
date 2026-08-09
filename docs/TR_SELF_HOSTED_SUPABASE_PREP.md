# Arar Buluruz — Türkiye Self-Hosted Supabase Preparation

_Date: 2026-08-07, Europe/Istanbul_

> **Current status — 2026-08-09:** The technical target remains future Türkiye-located self-hosted Supabase when a real-data phase is justified. PR #53 has since merged inactive pilot preparation into repository `main`; the deployed public V0 still has no real backend connection or real personal data. Arar Buluruz currently earns no revenue, so all paid VPS/hosted-backend/backup/recurring production infrastructure is deferred behind a separate **FOUNDER BUDGET / REVENUE GATE**. Technical readiness does not authorize spending. No particular VPS provider or backup vendor is selected by this document or by later research.

## Target architecture decision

The founder technical target is **hybrid + Türkiye-located self-hosted Supabase** for a future phase that handles real personal data.

This document is preparation only. It does not itself authorize a VPS, paid infrastructure, remote production database, production secret, SMTP, Storage, Auth or real data.

Frontend/CI layers that do not carry personal data may remain on external services where appropriate. The production data plane for real personal data is intended to run on a Türkiye-located Linux VPS only after the required founder gates are opened.

A personal Windows computer is not a production server and does not need to remain online 24/7.

## Repository compatibility fact-check

Reusable assets preserve the no-rebuild boundary:

- PostgreSQL migrations are canonical under `supabase/migrations/`;
- the local stack uses `supabase/config.toml`;
- RLS is migration-defined rather than frontend-only;
- anonymous public reads are constrained by database grants/RLS;
- anonymous INSERT/UPDATE/DELETE are not an approved public path;
- application reads use provider/server boundaries rather than spreading database-specific logic through the UI;
- CI can rebuild the local database from migrations and execute synthetic RLS/REST/browser validation;
- PR #53 added inactive private-schema/Storage/external-sales preparation for the future controlled real Çorlu pilot.

Repository compatibility does not imply an active remote backend.

## Current upstream self-hosting baseline

Supabase's official self-hosting documentation should be re-read at the future infrastructure gate. Docker is the expected self-hosting route and the operator remains responsible for server provisioning/maintenance, security hardening, service management, PostgreSQL maintenance, backups/disaster recovery, monitoring and uptime.

Any resource figures in this document are planning inputs, not purchase authorization. Re-check the pinned upstream release at the future POC because requirements and service composition can change.

## Future environment contract

Do not commit secret values. A future production environment must distinguish application-facing public values from server-only credentials.

Application-facing values may include the approved listings source, API base URL and public/publishable key only after a separate real-backend activation gate.

Server-only values include database credentials, secret keys, dashboard/admin credentials, signing keys and any SMTP/Storage credentials. Exact variable names and key-generation procedures must be taken from the pinned self-hosted Supabase release used by the POC.

## Network and exposure prerequisites

A future production POC must establish these boundaries before real data:

- Linux VPS physically/contractually located in Türkiye;
- Docker Engine and Docker Compose;
- HTTPS with a valid certificate and reverse proxy;
- only intended public application/API endpoints exposed;
- direct PostgreSQL not publicly reachable;
- Studio/admin not publicly reachable as a general Internet service;
- firewall rules documented and tested;
- server-only secrets excluded from frontend builds, Git history and browser responses;
- OS/container update procedure defined;
- time synchronization, disk monitoring and log rotation configured.

## Mandatory future POC acceptance gate

If and only if a future infrastructure POC is separately budget-authorized, it must pass at minimum:

1. Türkiye VPS provisioned under explicit founder budget/revenue approval.
2. Pinned self-hosted Supabase stack starts cleanly.
3. Stack starts correctly after VPS reboot.
4. Canonical repository migrations apply from an empty database.
5. Only separately approved Auth scope is exercised.
6. RLS positive/negative tests pass.
7. Storage is exercised only if the approved real-pilot scope requires it.
8. HTTPS/TLS is valid and forced for public traffic.
9. PostgreSQL is not publicly exposed.
10. Studio/admin is not publicly exposed.
11. Database backup is produced and integrity checked.
12. Backup is stored outside the production VPS failure domain.
13. Restore is performed onto a **completely empty server/environment**.
14. Restored database/application passes schema/RLS/smoke checks.
15. Log rotation is configured and verified.
16. Health/uptime alerting exists without requiring a paid SaaS when a reliable free/open-source control is sufficient.
17. Rate limiting is configured at the appropriate public layer if required by the measured traffic/abuse envelope.
18. Rollback procedure is documented and exercised.
19. The stack remains stable for the separately approved stability interval; the current planning target is at least 72 continuous hours.

**Restore failure is an automatic production NO-GO.**

## Backup and restore requirements

A future backup design must cover at minimum:

- database roles/schema/data as required by the pinned stack;
- encryption in transit and at rest for backup copies where applicable;
- approved retention and deletion rules;
- off-VPS copy in a separate failure domain;
- documented restore order;
- restore credentials/secrets handling;
- periodic restore drill onto an empty environment;
- evidence that RLS/policies/functions/triggers are present after restore.

If Storage is part of the approved pilot, database backup alone is insufficient: object data and metadata/consistency must be included in disaster recovery.

A specific paid backup vendor is not selected by this document. Any paid backup service requires the separate FOUNDER BUDGET / REVENUE gate.

## Minimum future runbook

The future production operator runbook should contain:

- exact pinned Supabase/Docker image versions;
- host OS version and patching procedure;
- `docker compose` start/stop/status procedure;
- reboot/startup verification;
- migration deployment and rollback procedure;
- backup command/schedule/location;
- empty-server restore procedure;
- public endpoint and TLS health checks;
- RLS/REST smoke commands;
- disk/RAM/CPU health checks;
- log locations and rotation policy;
- rate-limit configuration when required;
- incident kill-switches;
- secret rotation procedure;
- upgrade procedure with pre-upgrade backup and rollback;
- named owner for each operational action.

The runbook should prefer reproducible configuration from GitHub plus separately managed secrets. Manual dashboard-only state should be minimized.

## Authentication, contact and Storage boundary

Repository preparation does not select the real seller-contact model and does not authorize collection merely because a private contact table exists.

Real Auth, SMTP, user accounts, seller contact data and production Storage remain separately gated. Privacy/KVKK work must precede any real personal-data collection.

## External-sales moderation compatibility

The external-sales model remains provider-neutral. Shopier is an independent third party, not an API/OAuth integration. PR #53 added inactive persistence/review preparation under a separate founder gate; public external-sales functionality remains disabled.

## Hard zero-spend policy now

Arar Buluruz currently earns no revenue.

Current allowed preparation remains repository/local/CI-only and zero recurring production spend.

Current forbidden spend/activation until a separate FOUNDER BUDGET / REVENUE gate:

- VPS purchase;
- paid database/storage/backend;
- paid backup;
- SMS/OTP;
- KYC service;
- fraud/reputation SaaS;
- monitoring SaaS;
- production SMTP;
- any recurring paid production infrastructure.

Security, mandatory law/KVKK requirements and data-loss prevention cannot be waived merely to keep cost at zero. If a mandatory control cannot be provided without paid infrastructure, activation stays deferred until the founder explicitly funds it.

## Next infrastructure founder trigger

Technical planning may continue without spending. A purchase/production POC may begin only when **both** conditions are true:

1. the technical decision package is complete, including provider/location/price, pinned stack, load envelope, privacy/data flow, network exposure, backup/restore, scope and rollback/operations; and
2. the founder separately opens and approves the **FOUNDER BUDGET / REVENUE GATE** for the recurring cost.

No purchase should occur before both gates pass.
