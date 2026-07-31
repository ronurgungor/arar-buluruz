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

1. `docs/AI_CHAT_BOOTSTRAP.md` dosyasını ortak giriş noktası olarak oku.
2. Repository, branch ve mümkünse exact SHA'yı doğrula.
3. Uygulama için project memory/current state'i, görevler için backlog'u, takım için capability registry ve Work/Codex profilini oku; yerel kurucu bilgisayarında çalışma gerekiyorsa `docs/FOUNDER_WINDOWS_DEV_MACHINE_PROFILE.md` dosyasını da oku.
4. Gerçek erişimini tahmin etme; okuyamadığın kaynakları açıkça belirt.
5. Eski sohbet hafızasını GitHub'daki güncel bilgiye tercih etme.
6. Yazma işleminden önce aktif kod yazarını ve onay kapsamını doğrula.

Rutin ve düşük riskli bir işte bu başlangıç kısa tutulabilir; gereksiz törene dönüşmemelidir.

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
10. `docs/FOUNDER_WINDOWS_DEV_MACHINE_PROFILE.md` — yalnız yerel geliştirme, test veya güvenli yönetim kapasitesiyle ilgili görevlerde
11. `docs/ARAR_BULURUZ_BACKLOG.md`
12. Tarihli kanıt/test dokümanları
13. Eski sohbetler ve geçmiş notlar yalnız gerektiğinde

Çelişki halinde daha yukarıdaki kaynak esas alınır.

## Bilgi dosyalarının görevleri

- **AI Chat Bootstrap:** Her yeni sohbete uygulama, görevler, takım ve yönetişim hakkında ortak başlangıç bağlamı verir.
- **Project Memory:** Kalıcı ürün tezi, kimlikler, mimari sınırlar, sahiplik ve çalışma ilkeleri.
- **Current State:** Güncel uygulama davranışı, doğrulanmış SHA, CI/runtime durumu ve bilinen riskler.
- **Decision Log:** Önemli kararlar, gerekçeleri, ertelenen alternatifler ve yeniden değerlendirme tetikleri.
- **AI Team Capabilities:** Gerçekte doğrulanmış veya açıkça beyan edilmiş araç/AI erişimleri, yazma/okuma sınırları ve doğru görev yönlendirmesi.
- **Work/Codex Capability Profile:** Work ve Codex'in ayrıntılı rol, nominal yetenek, proje kanıtı, oturum sınırı ve teslim standartları.
- **Founder Windows Dev Machine Profile:** Kurucunun yerel bilgisayarının geliştirme/test uygunluğu, doğrulanmış araçları, güvenlik eksikleri ve hangi işlerin CI/VPS'e bırakılacağı.
- **Backlog:** Bekleyen ve sıralanmış işler.
- **Dated Evidence:** Belirli bir tarihteki test, dry-run veya denetim kanıtı.

Önemli bir bilgi yalnız sohbet içinde bırakılmaz; doğru dosyaya yazılır.

## Roller

- **Ana sohbet:** Varsayılan ürün/teknik uygulayıcı ve koordinasyon merkezi. Mevcut bağlantı ve araçlarla güvenli biçimde yapabildiği kod, dokümantasyon, GitHub ve inceleme işlerini doğrudan yürütür; gerektiğinde uzmanlara yönlendirir.
- **Kurucu:** Ürün gözlemi ve nihai karar mercii; ayrı onay kapılarını açar.
- **Lovable:** Güvenli ve incelemeye açık koşullarda sınırları belirli frontend, mobil UX ve görsel akış işleri.
- **Codex:** Repository incelemesiyle terminal, test, debugging veya kapsamlı kod uygulamasının birlikte gerektiği işlerde kullanılan uygulama/test uzmanı.
- **Work:** Ürün stratejisi, mimari, backend, güvenlik, KVKK, gerçek veri, public pilot ve geri dönüşü pahalı kararlarda kullanılan bağımsız analiz ve risk-denetim uzmanı.

Takımdaşların rol ve yetenekleri `docs/AI_TEAM_CAPABILITIES.md` ile `docs/WORK_CODEX_CAPABILITY_PROFILE.md` içinde okunmalıdır. Nominal yetenek, o oturumdaki erişim ve proje için verilmiş işlem yetkisi birbirinden ayrılır.

Work, Codex, Lovable veya ana sohbet çıktısı tek başına emir ya da kesin proje kararı değildir. Öneriler kanonik kaynaklar, kanıt, kapsam ve kurucu iradesiyle değerlendirilir. İkinci veya üçüncü görüş yalnız kararın önemi, belirsizliği, güvenlik/KVKK etkisi ya da geri dönüş maliyeti koordinasyon maliyetini haklı çıkardığında alınır; rutin olarak tekrarlanmaz.

Her uzman devri, çözmesi beklenen somut belirsizliği veya sağlayacağı eksik yeteneği açıkça belirtmelidir.

## Tek yazıcı kuralı

Aynı anda yalnız bir araç kod yazar. Yazar değişmeden önce mevcut görev tamamlanır veya durdurulur; değişiklikler Git ile güvenli hale getirilir; exact branch ve SHA doğrulanır.

## Onay modeli

Kurucu, backlog'da tanımlı düşük riskli ve geri dönüşü kolay görevler için sürekli uygulama onayı vermiştir. Ana sohbet; kapsam sapması veya ciddi belirsizlik yoksa feature branch, commit, PR ve merge adımlarını tamamlayabilir. Lovable Publish/Update ve diğer production publish/deploy işlemleri için görev bazlı açık kurucu onayı gerekir.

Aşağıdaki işlemler için görev bazlı açık kurucu kararı gerekir. Work veya Codex incelemesi, risk ve belirsizlik bunu haklı çıkarıyorsa karar desteği olarak kullanılır; kurucu onayının yerine geçmez:

- Backend, database, auth, SMS, storage veya edge function açma
- Secret veya environment değişikliği
- Gerçek kullanıcı/satıcı verisi
- Ödeme veya reklam ağı entegrasyonu
- Ücretli ya da recurring servis
- KVKK, güvenlik, public pilot veya geri dönüşü pahalı mimari karar
- Lovable Publish/Update veya başka production publish/deploy
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
- Yerel bilgisayarda yapılacak işlerin kapasite ve güvenlik sınırları `docs/FOUNDER_WINDOWS_DEV_MACHINE_PROFILE.md` ile eşleştirilir.

## V0 faz kilidi ve doğrulama sınırı

- Aktif fazın adı **“V0 — UX ve değer önerisi doğrulaması”**dır.
- V0 yalnız ürünün anlaşılmasını, arama ve ilan keşfini, ilan kartı/detay deneyimini, mobil/desktop kullanılabilirliği, minimal PWA kurulabilirliğini ve genel kullanıcı ilgisini doğrular.
- V0; kullanıcıların gerçekten ilan vereceğini, hesap açacağını, ilan yöneteceğini, moderasyonun sürdürülebileceğini, satıcı iletişim modelinin çalışacağını veya arz-talep döngüsünün oluşacağını doğrulamış sayılmaz.
- Canlı V0 yalnız synthetic/mock ilan kullanır. Gerçek kullanıcı hesabı, gerçek ilan, gerçek satıcı telefonu/e-postası, reklam ve analytics kullanılmaz. Test sürümü olduğu dürüstçe belirtilir.
- Minimal PWA yalnız manifest, kalıcı uygulama kimliği, doğru ikonlar, kurulabilirlik ve güvenli/dürüst offline-hata ekranıdır.
- Push, background sync, tam offline ilan, dinamik ilanlarda cache-first, auth, gerçek backend, reklam, analytics, TWA ve Play Store V0 kapsamı dışındadır.
- Backend kararı; dış kullanıcı hesabı, gerçek kişisel veri, uygulanamaz KVKK aktarım modeli, ölçülmüş free-tier/uptime sorunu, kesinleşmiş fotoğraf/storage ihtiyacı veya ölçülmüş maliyet/teknik zorunluluk oluşmadan yeniden açılmaz.
- Bu tetikleyiciler olmadan Supabase ile Türkiye self-managed arasında yön değişikliği önerilmez.
- Supabase Free yalnız geliştirme ve teknik doğrulama adayıdır; gerçek dış kullanıcı pilotunda güvenilir production altyapısı olduğu varsayılmaz.

## No-rebuild mimari sınırları

- PostgreSQL şeması ve migration'lar GitHub'da kanonik kalır.
- UI ve domain iş kuralları backend sağlayıcısından bağımsız tutulur.
- Supabase çağrıları yalnız adapter katmanında kalır; domain modeline yayılmaz.
- Gelecekte kullanıcı kimliği internal UUID ile temsil edilir; e-posta veya telefon foreign key yapılmaz.
- İleride `listings.owner_user_id` nullable olarak eklenebilmesini engelleyen karar alınmaz.
- Auth claim/JWT biçimi domain modeline gömülmez.
- Backend kararı kesinleşmeden Supabase Storage, Realtime, Edge Functions veya provider-specific yoğun özellik eklenmez.

## Backend sahipliği ve çıkış planı

- Lovable database kapalı kalır; Lovable üzerinden database, auth, storage, secret veya edge function etkinleştirilmez.
- Backend sağlayıcısı V0 boyunca dondurulmuştur; mevcut Supabase adapter/migration yatırımı teknik hazırlık olarak korunur fakat remote proje veya production taahhüdü sayılmaz.
- Gelecekteki backend kurucunun doğrudan kontrolünde olmalıdır; hesap, organizasyon, billing ve yönetici erişimleri kurucunun kontrolünde tutulur.
- Şema ve tüm migration'lar ilk günden GitHub'da kanonik tutulur. Dashboard değişiklikleri migration'a dönüştürülmeden kalıcı kabul edilmez.
- Uygulama yalnız açıkça yönetilen environment değişkenleriyle backend'e bağlanır; Lovable'a kalıcı backend sahipliği veya tek taraflı kontrol verilmez.
- Gerçek veri öncesinde yedekleme, export/restore, bölge, RLS, auth, veri saklama/KVKK ve sağlayıcıdan çıkış planı uygun bağımsız inceleme ile değerlendirilip kurucu tarafından onaylanır.

## Görev akışı

1. Başlangıç branch'i, SHA, aktif yazar ve kapsam doğrulanır.
2. Uygulama, görevler ve takım bağlamı bootstrap üzerinden okunur.
3. Ana sohbet işi güvenli ve doğru biçimde yapabiliyorsa doğrudan devam eder; uzman devri ancak belirgin ek değer sağlıyorsa yapılır.
4. Dar feature branch'te minimum diff hazırlanır.
5. Diff, hedef davranışlar ve riskle orantılı testler incelenir.
6. Gerekirse ve değer katıyorsa Codex veya Work'ten bağımsız/uzman kontrol alınır.
7. Onay modeline göre PR hazırlanır ve merge edilir veya karar için durulur.
8. Publish gerekiyorsa ayrı açık kurucu onayı alınır.
9. Milestone sonrası current state, backlog, decision log ve gerekiyorsa capability registry/profile güncellenir.

## Raporlama

Kurucuya teknik ayrıntı yığını değil; yapılan değişiklik, kanıt, kalan risk ve gereken karar sunulur. Test çalışmadıysa başarılıymış gibi gösterilmez. Bir AI erişemediği kaynağı okumuş veya gerçekleştiremediği işlemi yapmış gibi davranmaz.
