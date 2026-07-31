# Arar Buluruz — Founder Windows Development Machine Profile

_Last verified: 2026-07-31, Europe/Istanbul_

## Purpose and privacy

This document records only the founder machine characteristics that materially affect Arar Buluruz development, testing and secure administration. It is not a general hardware inventory and must not contain usernames, computer names, serial numbers, UUIDs, network addresses, product keys, environment variables, browser data, file contents, passwords, tokens, recovery keys or other secrets.

Source: a privacy-filtered PowerShell inventory collected on 2026-07-31. Values that could not be verified without elevation are explicitly marked as unknown.

## Verified hardware baseline

- Platform: x64 desktop PC.
- Motherboard: ASUS PRIME B350-PLUS.
- BIOS observed: version `0406`, dated 2017-02-10.
- CPU: AMD Ryzen 7 1700, 8 physical cores / 16 logical processors, up to 3.0 GHz as reported.
- Memory: 15.93 GB total; 9.64 GB available at collection time.
- Graphics: NVIDIA GeForce GTX 1080. VRAM size is not treated as verified because the Windows inventory value may be truncated.
- System volume `C:`: 465.07 GB total, 183.25 GB free, NTFS, reported healthy.
- Data volume `D:`: 2794.39 GB total, 1909.45 GB free, NTFS, reported healthy.
- Physical disk media type and SMART details: not verified by the non-elevated inventory.
- Firmware virtualization: enabled.
- Hypervisor presence: reported true.
- SLAT inventory result: reported false and must be rechecked before relying on WSL 2 or Docker Desktop.

## Operating system and security posture

- OS: Windows 11 Pro, x64.
- Observed version/build: `10.0.22000` / build `22000` (Windows 11 21H2 generation).
- This Windows release is outside Microsoft servicing and must not be treated as a supported secure administration baseline.
- The Ryzen 7 1700 is not present in Microsoft's current supported Windows 11 AMD processor list. A supported long-term Windows path therefore requires a separate OS/hardware decision rather than assuming an ordinary in-place update will be fully supported.
- Secure Boot: reported unavailable; not yet conclusively diagnosed.
- TPM: not detected by the non-elevated inventory.
- BitLocker status: unknown because the query was denied without elevation.
- Windows Recovery Environment status: unknown because the query required elevation.
- No BIOS, TPM, Secure Boot, BitLocker or Windows upgrade mutation is authorized by this profile.

Official references:

- Microsoft Windows 11 21H2 servicing notice: <https://learn.microsoft.com/en-us/lifecycle/announcements/windows-11-21h2-end-of-servicing>
- Microsoft supported Windows 11 AMD processors: <https://learn.microsoft.com/en-us/windows-hardware/design/minimum/supported/windows-11-supported-amd-processors>
- ASUS PRIME B350-PLUS BIOS support page: <https://www.asus.com/tr/supportonly/prime_b350plus/helpdesk_bios/>

## Verified local toolchain

- PowerShell: `5.1.22000.2538`.
- Git: `2.52.0.windows.1`.
- Node.js: `24.12.0`.
- npm: `11.6.2`.
- Python: `3.14.2`.
- Bun: not detected. The repository requires Bun `1.3.14` and `bun.lock`.
- Docker client/server/Compose: not detected.
- WSL: command surface exists, but no usable WSL installation/version/distribution was verified.
- Supabase CLI: not detected.
- GitHub CLI: not detected.
- VS Code: not detected through the command path; this does not prove that no editor is installed.

## Local repository observation

At collection time:

- path `C:\Projects\arar-buluruz` existed and was a Git repository;
- branch was `main`;
- working tree was clean;
- local HEAD was `13958d3b0360882239f679638ad9ccb22be9e020`;
- canonical GitHub `main` was later verified at `b43181cc5115f15f956fc7a0b38ead00ff92c068`;
- the local checkout was 61 commits behind that canonical `main` and had no local divergence.

No development should begin from the observed local checkout until it is fetched and fast-forwarded to the current canonical `main`.

## Workload fit

| Workload | Current fit | Operating rule |
| --- | --- | --- |
| Git operations, code editing and review | Suitable after repository sync | Keep the worktree clean and start from current GitHub `main`. |
| Bun install, lint, unit tests and application build | Hardware is suitable; toolchain incomplete | Install exact Bun `1.3.14` before local execution. Do not introduce npm lockfiles. |
| Browser and focused Playwright testing | Suitable with reasonable concurrency | Avoid running unnecessary parallel browser workers with many other applications open. |
| Native local PostgreSQL for focused development | Hardware and storage are suitable | Prefer test-only data; do not introduce real user data locally. |
| Docker/WSL-based full local stack | Not currently ready or supported | Current Windows build, WSL state and SLAT reading must be resolved first. |
| Full Gate 1 database/RLS/E2E verification | Use GitHub Actions by default for now | Existing CI remains the canonical containerized execution surface. |
| Production hosting | Not allowed | Production services and personal data belong on the approved Türkiye-hosted server, not this desktop. |
| Sole production recovery or secret custody device | Not ready | Supported OS and disk-encryption/recovery posture must first be verified. |

Current Docker Desktop documentation requires a supported Windows 11 release, WSL 2.1.5 or later for the WSL backend, 8 GB RAM, hardware virtualization and SLAT. The machine has enough RAM and firmware virtualization, but the current OS/WSL/SLAT state does not meet a verified supported baseline.

Official Docker references:

- <https://docs.docker.com/desktop/setup/install/windows-install/>
- <https://docs.docker.com/desktop/features/wsl/>

## Current development strategy

Until the Windows/security baseline is repaired:

1. Use the founder PC for repository work, code review, normal frontend development, exact Bun lint/unit/build work after Bun installation, and focused browser checks.
2. Use GitHub Actions for Docker-dependent database reset, migration, RLS, REST integration and full browser E2E evidence.
3. Do not make local Docker Desktop a prerequisite for the next product decision or hosting package.
4. Do not use the founder PC as the live application host.
5. Do not store production database dumps, privileged deployment credentials or the only recovery copy on this machine.

No RAM, CPU or GPU purchase is currently required for the project. A hardware upgrade should be justified only if a supported operating-system path, repeated local container workload or measured development bottleneck requires it.

## Required remediation and recheck sequence

Before relying on this machine for local containers or production administration:

1. Determine a supported Windows path, taking the unsupported CPU/build combination into account.
2. Perform an elevated read-only check of TPM, Secure Boot, BitLocker, Windows Recovery Environment, disk media/health and SLAT capability.
3. Assess BIOS update requirements and sequencing from official ASUS documentation; do not flash directly from `0406` without a reviewed rollback and compatibility plan.
4. Install exact Bun `1.3.14`.
5. Fetch and fast-forward the local repository from canonical GitHub `main`.
6. Decide whether WSL 2/Docker is genuinely required locally; prefer CI when it avoids unnecessary machine changes.
7. Re-run the privacy-filtered machine profile after any OS, BIOS, CPU, RAM, storage, WSL or Docker change.

## Revalidation triggers

Update this document when any of the following changes:

- operating-system version or support status;
- BIOS, CPU, TPM or Secure Boot configuration;
- RAM or storage;
- WSL/Docker availability;
- canonical local development strategy;
- production administration or recovery responsibilities.
