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

Bu dosya, projede çalışan ana sohbet, Lovable, Codex, Work ve diğer AI/denetim sohbetleri için kısa çalışma sözleşmesidir.

## Her yeni görevde zorunlu başlangıç

1. Repository, branch ve mümkünse exact SHA'yı doğrula.
2. Görevle ilgili kanonik dosyaları oku.
3. Gerçek erişimini tahmin etme; okuyamadığın kaynakları açıkça belirt.
4. Eski sohbet hafızasını GitHub'daki güncel bilgiye tercih etme.
5. Yazma işleminden önce aktif kod yazarını ve onay kapsamını doğrula.

## Kanonik kaynak sırası

1. GitHub `main` branch'indeki güncel kod ve yapılandırma
2. İncelenen feature branch/PR ve mevcut test kanıtları
3. `AGENTS.md`
4. `docs/ARAR_BULURUZ_PROJECT_MEMORY.md`
5. `docs/ARAR_BULURUZ_CURRENT_STATE.md`
6. `docs/ARAR_BULURUZ_DECISION_LOG.md`
7. `docs/AI_TEAM_CAPABILITIES.md`
8. `docs/ARAR_BULURUZ_BACKLOG.md`
9. Tarihli kanıt/test dokümanları
10. Eski sohbetler ve geçmiş notlar yalnız gerektiğinde

Çelişki halinde daha yukarıdaki kaynak esas alınır.

## Bilgi dosyalarının görevleri

- **Project Memory:** Kalıcı ürün tezi, kimlikler, mimari sınırlar, sahiplik ve çalışma ilkeleri.
- **Current State:** Güncel uygulama davranışı, doğrulanmış SHA, CI/runtime durumu ve bilinen riskler.
- **Decision Log:** Önemli kararlar, gerekçeleri, ertelenen alternatifler ve yeniden değerlendirme tetikleri.
- **AI Team Capabilities:** Gerçekte doğrulanmış araç/AI erişimleri, yazma/okuma sınırları ve doğru görev yönlendirmesi.
- **Backlog:** Bekleyen ve sıralanmış işler.
- **Dated Evidence:** Belirli bir tarihteki test, dry-run veya denetim kanıtı.

Önemli bir bilgi yalnız sohbet içinde bırakılmaz; doğru dosyaya yazılır.

## Roller

- **Ana sohbet:** Ürün/teknik koordinasyon, GitHub işlemleri, kaynak doğrulama, görev yönlendirme ve karar sentezi.
- **Kurucu:** Ürün gözlemi ve nihai karar mercii; ayrı onay kapılarını açar.
- **Lovable:** Güvenli ve incelemeye açık koşullarda sınırları belirli frontend, mobil UX ve görsel akış işleri.
- **Codex:** Repository incelemesiyle terminal, test, debugging veya kapsamlı kod uygulamasının birlikte gerektiği işler.
- **Work:** Ürün stratejisi, mimari, backend, güvenlik, KVKK, gerçek veri, public pilot ve geri dönüşü pahalı kararlar için bağımsız karar ortağı.

Bu roller varsayımsal yetki anlamına gelmez. Gerçek ve oturuma bağlı erişim `docs/AI_TEAM_CAPABILITIES.md` üzerinden doğrulanır.

## Tek yazıcı kuralı

Aynı anda yalnız bir araç kod yazar. Yazar değişmeden önce mevcut görev tamamlanır veya durdurulur; değişiklikler Git ile güvenli hale getirilir; exact branch ve SHA doğrulanır.

## Onay modeli

Kurucu, backlog'da tanımlı düşük riskli ve geri dönüşü kolay görevler için sürekli uygulama onayı vermiştir. Ana sohbet; kapsam sapması, ciddi belirsizlik veya aşağıdaki yüksek riskli alanlardan biri yoksa feature branch, commit, PR, merge ve gerekiyorsa publish adımlarını tamamlayabilir.

Aşağıdaki işlemler için görev bazlı açık karar veya Work ile bağımsız değerlendirme gerekir:

- Backend, database, auth, SMS, storage veya edge function açma
- Secret veya environment değişikliği
- Gerçek kullanıcı/satıcı verisi
- Ödeme veya reklam ağı entegrasyonu
- Ücretli ya da recurring servis
- KVKK, güvenlik, public pilot veya geri dönüşü pahalı mimari karar
- Git geçmişini değiştirme veya force-push

Test başarısızsa, kapsam belirsizse veya geri dönüş planı yeterli değilse otomatik onay kullanılmaz.

## Teknik kurallar

- Repository: `ronurgungor/arar-buluruz`
- Yerel klasör: `C:\Projects\arar-buluruz`
- Public adres: `https://arar-buluruz.lovable.app`
- `bun.lock` kanoniktir.
- Pinned Bun version: `1.3.14`.
- Varsayılan kontroller: `bun run lint` ve `bun run build`.
- `npm run lint/build` teknik olarak yasak değildir.
- `npm install`, `npm ci`, ikinci lockfile veya izinsiz dependency değişikliği yapılmaz.
- İlgisiz refactor ve biçimlendirme aynı göreve eklenmez.
- Test derinliği alışkanlığa değil, değişikliğin riskine ve dokunduğu davranışa göre seçilir.

## Backend sahipliği ve çıkış planı

- Lovable database kapalı kalır; Lovable üzerinden database, auth, storage, secret veya edge function etkinleştirilmez.
- Gelecekteki backend, kurucunun doğrudan sahibi olduğu ayrı bir Supabase projesinde kurulacaktır; hesap, organizasyon, billing ve yönetici erişimleri kurucunun kontrolünde olacaktır.
- Şema ve tüm migration'lar ilk günden GitHub'da kanonik olarak tutulacaktır. Dashboard'da yapılan değişiklikler migration'a dönüştürülmeden kalıcı kabul edilmez.
- Uygulama yalnız açıkça yönetilen environment değişkenleriyle backend'e bağlanacaktır; Lovable'a kalıcı backend sahipliği veya tek taraflı kontrol verilmeyecektir.
- Gerçek veri öncesinde yedekleme, export/restore, bölge, RLS, auth, veri saklama/KVKK ve sağlayıcıdan çıkış planı Work ile bağımsız değerlendirilip kurucu tarafından onaylanacaktır.

## Görev akışı

1. Başlangıç branch'i, SHA, aktif yazar ve kapsam doğrulanır.
2. Gerekli ortak hafıza ve kanıt dosyaları okunur.
3. Dar feature branch'te minimum diff hazırlanır.
4. Diff, hedef davranışlar ve riskle orantılı testler incelenir.
5. Gerekirse Codex veya Work'ten bağımsız/uzman kontrol alınır.
6. Onay modeline göre PR hazırlanır ve merge edilir veya karar için durulur.
7. Publish gerekiyorsa aynı risk değerlendirmesi ayrı olarak uygulanır.
8. Milestone sonrası current state, backlog, decision log ve gerekiyorsa capability registry güncellenir.

## Raporlama

Kurucuya teknik ayrıntı yığını değil; yapılan değişiklik, kanıt, kalan risk ve gereken karar sunulur. Test çalışmadıysa başarılıymış gibi gösterilmez. Bir AI erişemediği kaynağı okumuş veya gerçekleştiremediği işlemi yapmış gibi davranmaz.
