# Arar Buluruz — Türkiye Self-Hosted Supabase Preparation

_Date: 2026-08-07, Europe/Istanbul_

## Target architecture decision

The founder target is **hybrid + Türkiye-located self-hosted Supabase** for the future phase that handles real personal data.

This document is preparation only. No VPS, paid infrastructure, remote Supabase project, production database, secret, SMTP, Storage, auth or real data is created by the current gate.

Frontend/CI layers that do not carry personal data may remain on external services where appropriate. The production data plane for real personal data is intended to run on a Türkiye-located Linux VPS when the separate production/backend gate is opened.

A personal Windows computer is not a production server and does not need to remain online 24/7.

## Repository compatibility fact-check

Existing reusable assets already preserve the main no-rebuild boundary:

- PostgreSQL migration is canonical in `supabase/migrations/20260730162000_create_listings.sql`;
- the existing local stack uses `supabase/config.toml`;
- RLS is migration-defined rather than frontend-only;
- anonymous public reads are limited by both column grants and the active-publication RLS policy;
- anonymous INSERT/UPDATE/DELETE are not granted;
- application reads go through a provider adapter/native REST boundary rather than placing database-specific logic throughout the UI;
- current CI rebuilds the local database from migrations and executes pgTAP/RLS plus REST/browser validation.

No schema migration is required merely to declare a future self-hosting target.

## Current upstream self-hosting baseline

Supabase's current official documentation recommends Docker for self-hosting and makes the operator responsible for server provisioning/maintenance, security hardening, service management, PostgreSQL maintenance, high availability/scalability, backups/disaster recovery, monitoring and uptime.

The official Docker guidance currently lists approximately:

- minimum: 4 GB RAM, 2 CPU cores, 40 GB SSD;
- recommended: 8 GB+ RAM, 4 CPU cores+, 80 GB+ SSD.

These figures are planning inputs, not a purchase authorization. Re-check the upstream documentation at the future VPS gate because image composition and requirements can change.

## Future environment contract

Do not commit secret values. The future production environment must distinguish public application configuration from server-only credentials.

### Application-facing values

The current application adapter already expects:

- `VITE_LISTINGS_SOURCE=supabase` only when a separately approved real backend phase is active;
- `VITE_SUPABASE_URL=<https public API base>`;
- `VITE_SUPABASE_PUBLISHABLE_KEY=<public/publishable client key>` or the legacy-compatible `VITE_SUPABASE_ANON_KEY`.

These values do not authorize writes or admin privileges. RLS and database grants remain the security boundary.

### Self-hosted stack/server-only values

Future self-hosted configuration will require values equivalent to the upstream Docker contract, including:

- public/API URLs (`SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`, proxy domain);
- PostgreSQL password/connection secrets;
- publishable/client key material;
- server-side secret key material that must never enter client code;
- dashboard/admin credentials;
- JWT signing keys;
- SMTP credentials only when real Auth/email is separately approved;
- Storage/S3 credentials only when Storage is separately approved.

Exact variable names and key-generation commands must be re-verified against the pinned self-hosted Supabase release used by the POC.

## Network and exposure prerequisites

The future production POC must establish these boundaries before any real data:

- Linux VPS physically/contractually located in Türkiye;
- Docker Engine and Docker Compose;
- HTTPS with a valid certificate and a reverse proxy such as Caddy or Nginx;
- only intended public API endpoints exposed;
- direct PostgreSQL not publicly reachable from the Internet;
- Studio/admin not publicly reachable as a general Internet service;
- firewall rules documented and tested;
- server-only secrets excluded from frontend builds, Git history and browser responses;
- OS and container update procedure defined;
- time synchronization and sufficient disk monitoring.

## Mandatory future POC acceptance gate

Before production or real personal data, a fresh Türkiye VPS POC must pass all of the following:

1. Linux Türkiye VPS provisioned under separate founder approval.
2. Self-hosted Supabase Docker stack starts cleanly.
3. Stack automatically starts after VPS reboot.
4. Canonical repository migrations apply from an empty database.
5. Auth is exercised only after the future Auth/KVKK gate is open.
6. Existing and future RLS positive/negative tests pass.
7. Storage is tested only if the future Storage/photo gate is open.
8. HTTPS/TLS is valid and forced for public application traffic.
9. PostgreSQL is not publicly exposed.
10. Studio/admin is not publicly exposed.
11. Database backup is produced and integrity checked.
12. Backup is stored off the VPS; a backup on the same VPS is not sufficient.
13. Restore is performed onto a **completely empty server/environment**.
14. Restored database passes migrations/schema checks and application/RLS smoke tests.
15. Log rotation is configured and verified.
16. Uptime/health alerting is configured without requiring a paid SaaS if a reliable open-source/free mechanism is sufficient.
17. Rate limiting is configured and tested at the appropriate public edge/API layer.
18. Rollback procedure is documented and exercised.
19. The stack remains stable for at least 72 continuous hours.

**Restore failure is an automatic production NO-GO.**

## Backup and restore requirements

The future backup design must cover at minimum:

- database roles/schema/data as required by the pinned stack;
- encryption in transit and at rest for backup copies where applicable;
- backup retention and deletion policy;
- off-VPS copy;
- documented restore order;
- restore credentials/secrets handling;
- periodic restore drill onto an empty environment;
- evidence that RLS/policies/functions/triggers are present after restore.

If Storage later enters scope, database backup alone is not sufficient: object data and its metadata/consistency must be included in the disaster-recovery design.

## Minimum future runbook

The production operator runbook must contain:

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
- rate-limit configuration;
- incident kill-switches;
- secret rotation procedure;
- upgrade procedure with pre-upgrade backup and rollback;
- named owner for each operational action.

The runbook must prefer commands and configuration that are reproducible from GitHub plus separately managed secrets. Manual dashboard-only state should be minimized.

## Authentication and Storage boundary

The existing committed `supabase/config.toml` keeps product Auth disabled; CI only enables GoTrue in an ephemeral runner copy for technical validation.

Real Auth, SMTP, user accounts, private user data and Storage remain closed. The future target architecture does not itself authorize them.

When those gates open, privacy/KVKK work must precede real personal-data collection, including minimum notice, purpose, retention/deletion and provider/data-flow mapping.

## External-sales moderation compatibility

The external-sales URL validator is provider-neutral and independent from managed-vs-self-hosted Supabase. Future persistence should store canonical URL identity and moderation dimensions without encoding Shopier-specific assumptions into the database schema.

A future migration may introduce external-link/moderation/audit structures only after the real backend/data-model gate defines retention, operator roles and RLS/write policies.

## Zero-cost policy now

Current allowed work remains local and CI-only:

- existing Supabase CLI/local Docker workflow;
- canonical PostgreSQL migrations;
- pgTAP/RLS/REST/browser tests;
- synthetic data;
- GitHub Actions already used by the repository;
- documentation and pure domain/security code.

Current forbidden spend/activation:

- VPS purchase;
- paid database/storage;
- SMS/OTP;
- KYC service;
- fraud/reputation SaaS;
- monitoring SaaS;
- production SMTP;
- recurring infrastructure.

Security, mandatory law/KVKK requirements and data-loss prevention cannot be waived merely to keep cost at zero. Any cost-bearing requirement gets a separate founder gate.

## Next backend founder trigger

The next infrastructure founder gate should open only when a real backend/personal-data pilot is close enough to justify the POC. Its exact decision package must include:

- proposed Türkiye VPS provider/location and recurring price;
- current Supabase self-hosted version and resource requirements;
- expected data/storage/load envelope;
- privacy/KVKK data-flow map;
- exact public/private network exposure plan;
- backup target and off-VPS restore plan;
- Auth/SMTP/Storage scope, if any;
- rollback budget and operational owner.

No purchase should occur before that package is approved.