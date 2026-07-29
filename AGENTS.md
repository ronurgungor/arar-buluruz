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

## Ayrı kurucu onayı gereken işlemler

- `main` branch'e merge
- Public publish veya republish
- Backend veya database açma
- Auth veya SMS
- Secret veya environment değişikliği
- Gerçek kullanıcı/satıcı verisi
- Ödeme veya reklam ağı entegrasyonu
- Ücretli ya da recurring servis
- Git geçmişini değiştirme veya force-push

Merge ve public publish aynı onay değildir.

## Teknik kurallar

- Repository: `ronurgungor/arar-buluruz`
- Yerel klasör: `C:\Projects\arar-buluruz`
- Public adres: `https://arar-buluruz.lovable.app`
- `bun.lock` kanoniktir.
- Varsayılan kontroller: `bun run lint` ve `bun run build`.
- `npm run lint/build` teknik olarak yasak değildir.
- `npm install`, `npm ci`, ikinci lockfile veya izinsiz dependency değişikliği yapılmaz.
- İlgisiz refactor ve biçimlendirme aynı göreve eklenmez.

## Backend sınırı

Backend şu anda kapalıdır. Zamanı geldiğinde kurucunun kontrolündeki Supabase kullanılacak ve migration'lar ilk günden GitHub'da tutulacaktır. Backend, auth veya gerçek veri açık onay olmadan etkinleştirilmez.

## Görev akışı

1. Başlangıç branch'i, SHA ve kapsam doğrulanır.
2. Dar feature branch'te minimum diff hazırlanır.
3. Diff, hedef davranışlar ve mümkün olan testler incelenir.
4. Gerekirse Codex veya Work'ten bağımsız/uzman kontrol alınır.
5. PR hazırlanır; merge yalnız kurucu onayıyla yapılır.
6. Publish gerekiyorsa ayrıca kurucu onayı alınır.
7. Milestone sonrası current state ve backlog güncellenir.

## Raporlama

Kurucuya teknik ayrıntı yığını değil; yapılan değişiklik, kanıt, kalan risk ve gereken karar sunulur. Test çalışmadıysa başarılıymış gibi gösterilmez.