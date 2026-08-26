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

Bu dosya, projede çalışan Main Execution Chat, Advisor Chat, Lovable, Codex, Work ve diğer AI/denetim araçları için çalışma sözleşmesidir.

## Her yeni görevde zorunlu başlangıç

1. `docs/AI_OPERATING_MODEL_V2.md` dosyasını oku.
2. `docs/ACTIVE_CHAT_HANDOFF.md` dosyasını oku.
3. `docs/AI_CHAT_BOOTSTRAP.md` dosyasını ortak proje giriş noktası olarak oku.
4. Repository, branch, exact SHA ve aktif PR/issue durumunu **canlı GitHub'dan doğrula**.
5. `docs/ARAR_BULURUZ_CURRENT_STATE.md` ve görevle ilgili project memory / decision log / backlog bölümlerini oku.
6. Gerçek erişimini tahmin etme; okuyamadığın kaynağı açıkça belirt.
7. Eski sohbet hafızasını veya tarihli handoff snapshot'ını güncel GitHub gerçeğine tercih etme.
8. Yazma işleminden önce aktif yazar, branch/SHA ve onay kapsamını doğrula.

Rutin ve düşük riskli görevlerde bu başlangıç kısa tutulabilir; ancak rol/routing ve exact branch/SHA doğrulaması atlanmamalıdır.

## Kanonik kaynak sırası

1. GitHub `main` branch'indeki güncel kod ve yapılandırma
2. İncelenen exact feature branch/PR ve executable/test kanıtları
3. `AGENTS.md`
4. `docs/AI_OPERATING_MODEL_V2.md` — güncel rol, routing, truth-first ve chat rollover sözleşmesi
5. `docs/ACTIVE_CHAT_HANDOFF.md` — kısa ömürlü current continuity layer; canlı GitHub ile doğrulanır
6. `docs/ARAR_BULURUZ_CURRENT_STATE.md`
7. `docs/AI_CHAT_BOOTSTRAP.md`
8. `docs/ARAR_BULURUZ_PROJECT_MEMORY.md`
9. `docs/ARAR_BULURUZ_DECISION_LOG.md`
10. `docs/ARAR_BULURUZ_BACKLOG.md`
11. `docs/AI_TEAM_CAPABILITIES.md` ve `docs/WORK_CODEX_CAPABILITY_PROFILE.md` — historical capability evidence; role/routing çelişirse Operating Model v2 kazanır
12. `docs/FOUNDER_WINDOWS_DEV_MACHINE_PROFILE.md` — yalnız yerel geliştirme/test için
13. İlgili teknik kontratlar ve tarihli kanıtlar
14. Eski sohbetler yalnız gerektiğinde

Çelişki halinde daha yukarıdaki ve daha yeni executable/explicit founder evidence esas alınır.

## Bilgi dosyalarının görevleri

- **AI Operating Model v2:** Kalıcı ekip rolleri, specialist routing, truth-first standardı, one-writer ve chat-room rollover protokolü.
- **Active Chat Handoff:** Bir oda dolarken kaybolabilecek güncel görev/karar/PR bağlamı. Tarihli snapshot'tır; canlı GitHub'ın yerine geçmez.
- **AI Chat Bootstrap:** Uygulama, mimari, gate ve proje bağlamı için ortak giriş noktası.
- **Project Memory:** Kalıcı ürün tezi, mimari/yönetişim sınırları ve sahiplik ilkeleri.
- **Current State:** Güncel repository + deployed runtime ayrımı, SHA/CI/runtime gerçekleri ve bilinen riskler.
- **Decision Log:** Kabul edilmiş önemli founder kararları, gerekçe ve review trigger'ları.
- **Backlog:** Açık/deferred gate ve gelecek işler.
- **Capability docs:** Specialist yetenekleri ve tarihsel proje deneyimi; güncel routing otoritesi değildir.
- **Technical docs:** Implementation/production kontratları; tek başına harcama veya aktivasyon yetkisi değildir.
- **Dated evidence:** Belirli bir tarihteki test, publication veya review kanıtı; tarihsel olarak korunur.

Önemli bilgi yalnız sohbet içinde bırakılmaz.

## Truth-first proje standardı

Arar Buluruz'da amaç founder'ı rahatlatmak veya mevcut emeği korumak değildir. Amaç çalışan, talep gören ve ekonomik olarak sürdürülebilir olabilecek ürünü mümkün olan en kısa savunulabilir yoldan bulmaktır.

Öncelik:

1. doğrulanmış gerçekler ve executable evidence;
2. güncel resmi kaynaklar;
3. gerçek kullanıcı/traffic/conversion evidence;
4. açıkça etiketlenmiş engineering inference / legal interpretation;
5. recommendation.

Sunk cost karar gerekçesi değildir. Teorik risk otomatik blocker değildir. Gerçek ve maddi risk de rahatlatıcı olmak için küçültülmez.

Advisory bulgular `BLOCKER / IMPORTANT / CAN WAIT / FALSE POSITIVE-OVERENGINEERING` olarak sınıflandırılır.

## Kalıcı roller — oda numaraları geçicidir

- **Founder:** Nihai consequential ürün, bütçe, gerçek veri, production, monetization ve risk-acceptance karar mercii.
- **Main Execution Chat (`Sohbet N`):** Varsayılan primary implementer ve günlük teknik koordinatör. Oda dolunca rol `Sohbet N+1`e devrolur.
- **Advisor Chat (`Sohbet Danışman N`):** Roadmap, prioritization, REDTEAM, materiality, bağımsız doğrulama ve görev routing sahibi. Oda dolunca rol `Danışman N+1`e devrolur.
- **Codex:** Budgeted specialist engineer; en zor engineering/debug/security/migration/test işlerinde implementation veya deep review yapabilir. Rutin default developer değildir.
- **Work:** Budgeted deep-research/analysis/independent-review specialist. Final proje decision owner değildir.
- **Lovable:** Credit-budgeted high-throughput frontend/UX implementation specialist; backend/security/production owner değildir.

Ayrıntılı güncel rol ve routing sözleşmesi `docs/AI_OPERATING_MODEL_V2.md` içindedir.

Nominal yetenek, mevcut oturum erişimi, usage/credit availability ve proje işlem yetkisi birbirinden ayrılır.

Hiçbir AI çıktısı tek başına founder kararı değildir. Reviewer/specialist önerileri vendor seçimi, product kararı, architecture değişikliği, paid commitment veya implementation task olarak otomatik kabul edilmez.

## Routing kuralı

Minimum maliyetle yeterli güven veren owner seçilir:

- normal implementation → Main Execution Chat;
- zor engineering / deep code execution → Codex;
- büyük tekrarlı/görsel frontend işi → kredi uygunsa Lovable;
- consequential research / independent second pass → gerçekten değer katıyorsa Work;
- prioritization / blocker classification / final synthesis → Advisor Chat;
- consequential real-data/production/budget/risk acceptance → Founder.

Codex ve Work usage-budgeted specialist'lerdir. Kullanımları ritual değil ROI kararıdır.

## Tek yazıcı kuralı

Aynı active implementation scope üzerinde aynı anda yalnız bir repository/code writer çalışır.

Yazar değişmeden önce:

- mevcut görev tamamlanır veya durdurulur;
- değişiklikler Git'te güvenceye alınır;
- exact branch/SHA ve working-tree durumu doğrulanır;
- çalıştırılan testler ve kalan işler yazılır;
- yeni writer ancak bundan sonra görevi devralır.

Read-only independent review paralel olabilir; aynı scope'u sessizce mutate edemez.

## Chat-room rollover kuralı

Bir Main Execution Chat veya Advisor Chat dolmaya yaklaşınca, sırf konuşma hafızasına güvenilmez.

Rollover öncesi:

1. durable technical truth GitHub'a yazılmış olmalı;
2. `docs/ACTIVE_CHAT_HANDOFF.md` güncellenmeli;
3. exact current `main`, active branch/PR/head SHA yazılmalı;
4. immediate objective/next action yazılmalı;
5. son founder kararları ve eski dokümanları supersede eden corrections kaydedilmeli;
6. açık riskler materiality sınıfıyla yazılmalı;
7. aktif writer ve switch güvenliği belirtilmeli;
8. stale assumptions taşınmamalı veya açıkça historical işaretlenmeli.

Yeni oda işe başlamadan önce canlı GitHub durumunu yeniden doğrular.

## Onay modeli

Kurucu, açıkça tanımlı düşük riskli/reversible repository işlerinde rutin branch/commit/PR/CI/merge yetkisi verebilir.

Aşağıdaki işlemler için görev bazlı açık founder kararı gerekir:

- backend/database/Auth/Storage/edge-function production aktivasyonu;
- secret veya environment değişikliği;
- gerçek kullanıcı/satıcı verisi;
- ödeme/reklam ağı/monetization entegrasyonu;
- ücretli veya recurring servis;
- public production activation veya geri dönüşü pahalı mimari karar;
- explicit material legal/privacy/security risk acceptance;
- Lovable Publish/Update veya başka production deploy;
- Git geçmişini rewrite/force-push;
- Tarladan'a dokunma.

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

## Repository/runtime ayrımı

Repository capability ile live/public runtime capability aynı şey değildir.

Exact current state için `docs/ARAR_BULURUZ_CURRENT_STATE.md`, `docs/ACTIVE_CHAT_HANDOFF.md`, canlı `main`, active PR ve deploy evidence birlikte kontrol edilir.

Bir repository preparation değişikliği tek başına production, real data, Auth, Storage, ads, payment veya public pilot activation yetkisi değildir.

## No-rebuild architecture boundaries

- PostgreSQL schema/migrations GitHub-canonical kalır.
- UI/domain rules backend-provider independent kalır.
- Supabase/provider calls adapter/server boundary arkasında kalır.
- Future user identity internal UUID'dir; email/phone foreign key değildir.
- Future nullable `listings.owner_user_id` engellenmez.
- Auth/JWT claim shape domain modeline sızmaz.
- Lovable permanent backend ownership almaz.
- Daha önce executable evidence ile PASS olan photo/private-storage/signed-delivery/portability/PWA/security contract'ları material new reason olmadan yeniden tasarlanmaz.

## Founder budget / revenue boundary

Arar Buluruz'un initial product-validation aşamasında recurring production spending ayrıca founder-approved bir gate'tir.

Technical readiness, provider shortlist, review, runbook veya POC tek başına harcama yetkisi değildir.

Security/law/data-loss gereksinimleri sırf maliyeti sıfır tutmak için zayıflatılmaz; fakat gereksiz infrastructure ve safety theater da eklenmez.

Monetization/ads açılması ayrı bir founder gate'tir ve product-validation fact pattern'ini değiştirir.

## Scope-creep rule

Bir özellik önermeden önce sor:

Bu değişiklik şu aşamada gerçekten neyi iyileştiriyor?

- listing supply;
- discovery/search;
- listing comprehension;
- seller-contact conversion;
- pilot safety/compliance;
- operational simplicity;
- veya ileride ölçülebilir revenue readiness?

Maddi faydası yoksa ekleme.

Ölçülmüş ihtiyaç olmadan Auth/accounts, seller dashboards, chat, payments, recommendations, category-tree navigation, social features, Kubernetes/EKS, microservices, sophisticated analytics veya speculative observability eklenmez.

## Görev akışı

1. Live repo/branch/SHA/active writer/kapsam doğrulanır.
2. Operating Model + Active Handoff + görevle ilgili canonical docs okunur.
3. Advisor gerekiyorsa işi önceliklendirir ve owner seçer.
4. Minimum diff hazırlanır.
5. Riskle orantılı test/check çalıştırılır.
6. Specialist yalnız comparative advantage varsa çağrılır.
7. Founder gate gerekiyorsa durulur; routine bug için founder'a dönülmez.
8. Milestone sonrası current-state/handoff/decision/backlog bilgisi uygun yere yazılır.
9. Publish/deploy/paid/real-data/monetization adımları her zaman ayrı gate'tir.

## Raporlama

Kurucuya rutin log dökülmez.

Rapor verilecek ana noktalar:

- milestone tamamlandı;
- gerçek blocker bulundu;
- consequential founder action/authorization gerekiyor;
- önemli bir assumption yanlışlandı;
- specialist usage harcanması için açık gerekçe var.

İyi rapor: exact state + evidence + material blockers + decisions + next action + ne yapılmaması gerektiği.

Çalışmayan test başarılıymış gibi gösterilmez; erişilmeyen kaynak okunmuş gibi davranılmaz; founder'ı rahatlatmak için gerçekler yumuşatılmaz.
