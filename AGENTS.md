<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Arar Buluruz Agent Guide

Bu dosya, projede çalışan ana sohbet, Lovable, Codex, Work, Claude ve diğer AI/denetim sohbetleri için çalışma sözleşmesidir.

## Her yeni görevde zorunlu başlangıç

1. `docs/AI_CHAT_BOOTSTRAP.md` dosyasını ortak giriş noktası olarak oku.
2. Repository, branch ve exact SHA'yı doğrula.
3. Project memory/current state, decision log ve backlog'u görev bağlamına göre oku.
4. Gerçek erişimini tahmin etme; okuyamadığın kaynağı açıkça belirt.
5. Eski sohbet hafızasını GitHub'daki güncel bilgiye tercih etme.
6. Yazma işleminden önce aktif yazar ve onay kapsamını doğrula.

Rutin ve düşük riskli görevlerde bu başlangıç kısa tutulabilir.

## Kanonik kaynak sırası

1. GitHub `main` branch'indeki güncel kod ve yapılandırma
2. İncelenen feature branch/PR ve mevcut test kanıtları
3. `AGENTS.md`
4. `docs/AI_CHAT_BOOTSTRAP.md`
5. `docs/ARAR_BULURUZ_PROJECT_MEMORY.md`
6. `docs/ARAR_BULURUZ_CURRENT_STATE.md`
7. `docs/ARAR_BULURUZ_DECISION_LOG.md`
8. `docs/AI_TEAM_CAPABILITIES.md`
9. `docs/WORK_CODEX_CAPABILITY_PROFILE.md`
10. `docs/FOUNDER_WINDOWS_DEV_MACHINE_PROFILE.md` — yalnız yerel geliştirme/test için
11. `docs/ARAR_BULURUZ_BACKLOG.md`
12. İlgili teknik kontratlar ve tarihli kanıtlar
13. Eski sohbetler yalnız gerektiğinde

Çelişki halinde daha yukarıdaki kaynak esas alınır.

## Bilgi dosyalarının görevleri

- **AI Chat Bootstrap:** Yeni sohbete uygulama, güncel görev ve gate bağlamı verir.
- **Project Memory:** Kalıcı ürün tezi, mimari/yönetişim sınırları ve sahiplik ilkeleri.
- **Current State:** Güncel repository + deployed runtime ayrımı, SHA/CI/runtime gerçekleri ve bilinen riskler.
- **Decision Log:** Kabul edilmiş önemli founder kararları, gerekçe ve review trigger'ları.
- **Backlog:** Açık/deferred gate ve gelecek işler.
- **Technical docs:** Gelecek implementation/production kontratları; tek başına harcama veya aktivasyon yetkisi değildir.
- **Dated evidence:** Belirli bir tarihteki test, publication veya review kanıtı; tarihsel olarak korunur.

Önemli bilgi yalnız sohbet içinde bırakılmaz.

## Roller

- **Ana sohbet:** Varsayılan ürün/teknik uygulayıcı ve koordinasyon merkezi; açık onay kapsamındaki reversible repository işlerini yürütür.
- **Kurucu:** Nihai ürün, veri, KVKK, bütçe, backend ve publication karar mercii.
- **Lovable:** Sınırları belirli frontend editör/hosting yüzeyi; backend sahibi değildir.
- **Codex:** Repository/terminal/test/debugging gerektiğinde kullanılan uygulama/test uzmanı.
- **Work:** Strateji, mimari, backend, güvenlik, KVKK, gerçek veri ve maliyetli kararlarda bağımsız analiz/risk denetimi.
- **Claude ve diğer bağımsız reviewer'lar:** Advisory/review rolü; önerileri otomatik implementation yetkisi oluşturmaz.

Nominal yetenek, mevcut oturum erişimi ve proje işlem yetkisi birbirinden ayrılır.

Hiçbir AI çıktısı tek başına founder kararı değildir. Özellikle reviewer önerileri vendor seçimi, product karar, architecture değişikliği, paid commitment veya implementation task olarak otomatik kabul edilmez.

## Tek yazıcı kuralı

Aynı anda yalnız bir araç repository'yi yazar. Yazar değişmeden önce mevcut görev tamamlanır veya durdurulur; exact branch/SHA doğrulanır.

## Onay modeli

Kurucu, açıkça tanımlı düşük riskli/reversible repository işlerinde rutin branch/commit/PR/CI/merge yetkisi verebilir.

Aşağıdaki işlemler için görev bazlı açık founder kararı gerekir:

- backend/database/Auth/Storage/edge-function aktivasyonu;
- secret veya environment değişikliği;
- gerçek kullanıcı/satıcı verisi;
- ödeme/reklam ağı entegrasyonu;
- ücretli veya recurring servis;
- KVKK/güvenlik/public pilot veya geri dönüşü pahalı mimari karar;
- Lovable Publish/Update veya başka production deploy;
- Git geçmişini rewrite/force-push.

Test başarısızsa, kapsam belirsizse veya rollback yeterli değilse otomatik/rutin onay kullanılmaz.

## Teknik kurallar

- Repository: `ronurgungor/arar-buluruz`
- Founder-local klasör: `C:\Projects\arar-buluruz`
- Public adres: `https://arar-buluruz.lovable.app`
- `bun.lock` kanoniktir.
- Pinned Bun: `1.3.14`.
- Varsayılan kontroller: `bun run lint` ve `bun run build`.
- `npm install`, `npm ci`, ikinci lockfile veya izinsiz dependency değişikliği yapılmaz.
- İlgisiz refactor/formatting aynı göreve eklenmez.
- Git history force-push/rewrite yapılmaz.
- Test derinliği değişikliğin riskine göre seçilir.

## Current evidence and V0 boundary

Public V0 remains synthetic/mock and honestly test-scoped.

Current evidence now supports:

- users found the application understandable;
- current search/discovery/listing-detail usability boundary;
- **initial real seller/supply intent**, because real users explicitly said their actual listings may be published.

Do **not** inflate this into proof of:

- real listing intake/ownership operations;
- account management;
- sustainable moderation;
- future seller-contact model;
- public external-sales safety;
- production backend reliability;
- functioning supply-demand loop.

The deployed public V0 still has:

- mock/synthetic listings;
- zero-data demo listing form;
- no real backend connection;
- no real personal data;
- no real Storage;
- no Auth;
- no public external-sales CTA.

Repository `main` may contain inactive future-pilot preparation that is intentionally not deployed. Never equate repository capability with live runtime capability.

## Minimal-PWA boundary

Minimal PWA remains limited to manifest, durable app identity, correct icons, installability and safe/honest offline/error behavior.

Push, background sync, complete offline listings, cache-first dynamic data, TWA and Play Store remain separately gated.

## No-rebuild architecture boundaries

- PostgreSQL schema/migrations remain GitHub-canonical.
- UI/domain rules remain backend-provider independent.
- Supabase/provider calls remain behind adapter/server boundaries.
- Future user identity is an internal UUID; email/phone are not foreign keys.
- Future nullable `listings.owner_user_id` must not be blocked.
- Auth/JWT claim shape stays out of domain model.
- Lovable does not receive permanent backend ownership.

## Backend target and activation boundary

D-021 supersedes the old provider-selection freeze only at the **technical target** level: when a future real-data phase is justified, the target data plane is founder-controlled, Türkiye-located self-hosted Supabase-compatible infrastructure on Linux VPS.

This does not mean a VPS is purchased or the backend is live.

Current `main` contains inactive real-Çorlu-pilot backend/security preparation through PR #53. Public runtime remains mock/zero-data.

Real data requires a separate privacy/KVKK + production activation gate.

## Hard FOUNDER BUDGET / REVENUE gate

D-022 is active.

Arar Buluruz currently earns no revenue. Therefore, until a separate explicit founder budget/revenue decision is approved:

- no paid VPS;
- no paid hosted backend;
- no paid backup;
- no recurring paid production infrastructure.

A provider shortlist, technical readiness, completed runbook, successful review or future POC prerequisites do **not** authorize spending.

Security/law/data-loss requirements cannot be weakened to preserve zero cost; if a required control needs paid infrastructure, activation remains deferred until funded.

## External-sales / Shopier boundary

Canonical model: provider-neutral **Satış bağlantısı / External Sales Link**.

- no Shopier API;
- no OAuth;
- no seller credential access;
- no scraping;
- no iframe;
- Shopier is an independent third party;
- Arar does not process/hold payment funds;
- functionality currently not public.

A later research recommendation about a VPS provider, backup vendor or contact model is non-binding unless the founder explicitly records it in the decision log.

## Current review sequence

After the documentation-sync gate merges, the next activity is an **independent Claude full-repository review**.

Claude review is research/advisory only. It must not automatically mutate the repository or open another implementation/production gate. Any consequential follow-up requires separate founder authorization.

## Görev akışı

1. Branch/SHA/aktif yazar/kapsam doğrulanır.
2. Bootstrap + ilgili canonical docs okunur.
3. Minimum diff hazırlanır.
4. Riskle orantılı test/check çalıştırılır.
5. Gerekliyse bağımsız review alınır.
6. Onay modeline göre PR/merge yapılır veya founder kararı için durulur.
7. Publish/deploy/paid/real-data adımları her zaman ayrı gate'tir.
8. Milestone sonrası uygun canonical docs güncellenir.

## Raporlama

Kurucuya yapılan değişiklik, kanıt, kalan risk ve gereken karar sunulur. Çalışmayan test başarılıymış gibi gösterilmez; erişilmeyen kaynak okunmuş gibi davranılmaz.
