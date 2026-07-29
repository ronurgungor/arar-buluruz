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

Bu dosya, projede çalışan ana sohbet, Lovable, Codex ve bağımsız denetim sohbetleri için kısa çalışma sözleşmesidir.

## Kanonik kaynak sırası

1. GitHub `main` branch'indeki güncel kod
2. İncelenen feature branch/PR ve mevcut test kanıtları
3. `docs/ARAR_BULURUZ_CURRENT_STATE.md`
4. `docs/ARAR_BULURUZ_BACKLOG.md`
5. Eski sohbetler ve geçmiş notlar yalnız gerektiğinde

Çelişki halinde daha yukarıdaki kaynak esas alınır.

## Roller

- **Ana sohbet:** Ürün ve teknik yönetim merkezi; GitHub üzerinden kod, branch, commit, push, diff ve sonuç yönetimini yürütür.
- **Kurucu:** Ürün gözlemi ve nihai karar mercii; ayrı onay kapılarını açar.
- **Lovable:** Sınırları belirli frontend, mobil UX ve görsel akış işleri için aktif kod yazarıdır.
- **Codex:** Local terminal, uzun debugging, büyük otomatik refactor veya yerel test zorunluluğunda kullanılır; aynı görevde analiz, uygulama, test ve öz-eleştiri birlikte istenebilir.
- **Work:** Mimari, backend, güvenlik, KVKK, gerçek veri, public pilot ve geri dönüşü pahalı kararlarda bağımsız karar ortağıdır.

## Tek yazıcı kuralı

Aynı anda yalnız bir araç kod yazar. Yazar değişmeden önce mevcut görev tamamlanır veya durdurulur; değişiklikler commit/push ile güvenli hale getirilir; exact branch ve SHA doğrulanır.

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
- Varsayılan kontroller: `bun run lint` ve `bun run build`.
- `npm run lint/build` teknik olarak yasak değildir.
- `npm install`, `npm ci`, ikinci lockfile veya izinsiz dependency değişikliği yapılmaz.
- İlgisiz refactor ve biçimlendirme aynı göreve eklenmez.

## Backend sahipliği ve çıkış planı

- Lovable database kapalı kalır; Lovable üzerinden database, auth, storage, secret veya edge function etkinleştirilmez.
- Gelecekteki backend, kurucunun doğrudan sahibi olduğu ayrı bir Supabase projesinde kurulacaktır; hesap, organizasyon, billing ve yönetici erişimleri kurucunun kontrolünde olacaktır.
- Şema ve tüm migration'lar ilk günden GitHub'da kanonik olarak tutulacaktır. Dashboard'da yapılan değişiklikler migration'a dönüştürülmeden kalıcı kabul edilmez.
- Uygulama yalnız açıkça yönetilen environment değişkenleriyle backend'e bağlanacaktır; Lovable'a kalıcı backend sahipliği veya tek taraflı kontrol verilmeyecektir.
- Gerçek veri öncesinde yedekleme, export/restore, bölge, RLS, auth, veri saklama/KVKK ve sağlayıcıdan çıkış planı Work ile bağımsız değerlendirilip kurucu tarafından onaylanacaktır.

## Görev akışı

1. Başlangıç branch'i, SHA ve kapsam doğrulanır.
2. Dar feature branch'te minimum diff hazırlanır.
3. Diff, hedef davranışlar ve mümkün olan testler incelenir.
4. Gerekirse Codex veya Work'ten bağımsız/uzman kontrol alınır.
5. Onay modeline göre PR hazırlanır ve merge edilir veya karar için durulur.
6. Publish gerekiyorsa aynı risk değerlendirmesi ayrı olarak uygulanır.
7. Milestone sonrası current state ve backlog güncellenir.

## Raporlama

Kurucuya teknik ayrıntı yığını değil; yapılan değişiklik, kanıt, kalan risk ve gereken karar sunulur. Test çalışmadıysa başarılıymış gibi gösterilmez.
