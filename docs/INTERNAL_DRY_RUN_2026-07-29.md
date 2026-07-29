# Arar Buluruz — İç Dry-Run

_Tarih: 2026-07-29_

## Kapsam

Aşağıdaki akışlar güncel GitHub `main` kaynağı ve Lovable senkron kanıtları üzerinden incelendi:

- Ana ekran ve arama başlangıcı
- Arama sonuçları, şehir filtresi ve sıralama
- İlan detayı ve kontrollü iletişim
- İlan verme ve sonuç önizlemesi
- Giriş yer tutucusu
- Şikâyet akışı
- Site-wide noindex/nofollow koruması

Bu turda dış ağ erişimi başarısız olduğu için canlı site üzerinde bağımsız tarayıcı etkileşimi ve `X-Robots-Tag` header okuması yapılamadı. Bu belge kaynak-seviyesi dry-run sonucudur; gerçek mobil davranış kullanıcı testinde doğrulanacaktır.

## Doğrulanan durum

### Arama

- Mock ilanlar görünmeyen `keywords` alanlarıyla affedici arama yapıyor.
- Şehir filtresi nedeniyle sonuç sıfırlandığında `Tüm Türkiye'de ara` kurtarma düğmesi mevcut.
- Ana ekranda doğrudan çalışan örnek aramalar eklendi:
  - traktör
  - kiralık daire
  - ikinci el masa
  - oto
- Mock mesafe sıralaması `Yakın (örnek)` olarak açıkça işaretleniyor.
- Yakın sıralama seçildiğinde gerçek konum kullanılmadığı açıklanıyor.

### İlan detayı ve iletişim

- Tüm mock ilanlar merkezi kontrollü test hattına yönleniyor.
- `Ara` hedefi: `tel:+905321739111`
- `WhatsApp` hedefi: `https://wa.me/905321739111`
- Eski mock telefon numaraları ve `Listing.phone` kaldırıldı.
- Telefon numarası görünür ilan metninde basılmıyor.
- Şikâyet bağlantısı korunuyor.

### İlan verme

- Başlık, fiyat, konum ve açıklama form state'inde tutuluyor.
- Gönderim sonrası kullanıcının kendi değerleriyle ilan önizleme kartı gösteriliyor.
- Gerçek kayıt yapılmadığı açıkça belirtiliyor.
- Kullanıcı `İlanı düzenle` ile forma ve mevcut değerlerine dönebiliyor.
- Gerçek fotoğraf yükleme, backend veya storage etkin değil.

### Giriş ve şikâyet

- Giriş ekranı gerçek SMS göndermediğini açıklıyor.
- Şikâyet ekranı bildirimin kaydedilmediğini açıklıyor ve ilana dönüş sağlıyor.

### Arama motoru koruması

- Root metadata: `noindex, nofollow, noarchive, nosnippet`
- Server header kaynağı: `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- Lovable database kapalı.

## Bu turda düzeltilen test kırıkları

1. İlan verme akışının çıktısız bitmesi
2. İlk kullanıcıya ne arayacağına dair hiç örnek verilmemesi
3. Mock mesafe sıralamasının gerçek konum özelliği gibi görünmesi

## Kullanıcı testi olmadan doğrulanamayacak konular

- Sabit iletişim alanının farklı mobil ekranlarda içeriği örtüp örtmediği
- Safe-area davranışı
- Mobil klavye açıldığında ilan formunun ergonomisi
- Arama sonuçlarında kart yoğunluğu ve başlık/fiyat okunabilirliği
- Örnek aramaların kullanıcıya kategori hissi verip vermediği
- Kullanıcının prototip ile gerçek servis sınırını anlayıp anlamadığı
- İlan önizleme kartının yeterince gerçekçi ve anlaşılır bulunup bulunmadığı

## Karar

Yeni görsel özellik veya genel polish eklenmeyecek. Sonraki ürün değişikliği, moderatörlü testlerde tekrar eden veya görevi bloke eden somut bir probleme dayanmalıdır.
