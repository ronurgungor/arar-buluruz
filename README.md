# Find It Fast

Yeni ve bağımsız bir proje oluştur. Proje çalışma adı: “Arar Buluruz”. Tarladan projesiyle hiçbir kod, veri, entegrasyon veya marka unsuru paylaşma.

Amaç: Türkiye geneline hitap eden, ücretsiz ilan verme ve ilan arama hizmeti sunan, reklam geliri odaklı, aşırı sade ve çok hızlı bir mobil-öncelikli web uygulaması/PWA prototipi.

Bu ilk aşamada yalnızca frontend prototipi oluştur. Veritabanı, Supabase/Lovable Cloud, kimlik doğrulama, ödeme, reklam SDK’sı, gerçek telefon bağlantısı, dış servis veya backend etkinleştirme. Bunları daha sonra ayrı kararla bağlayacağız. Örnek ilanları yerel mock data ile göster.

Temel ürün ilkeleri:
- Kullanıcı arayüzünde kategori menüsü veya kategori bölümü olmasın.
- Ana ekran Google benzeri sade olsun: marka adı, çok büyük tek arama çubuğu, konum seçimi, “İlan Ver” ve giriş/profil erişimi.
- Kullanıcı doğrudan ne aradığını yazar; kategori ağacında dolaşmaz.
- Hız, sadelik ve mobil kullanım öncelikli olsun.
- Gereksiz kartlar, banner karuselleri, haber akışı, kampanya alanları, sosyal özellikler, puan sistemi, harita, canlı sohbet, ödeme/kargo/sipariş akışı olmasın.

Hazırlanacak ekranlar:
1. Ana ekran: logo/metin “Arar Buluruz”, büyük arama çubuğu, konum, İlan Ver, profil.
2. Arama sonuçları: fotoğraf, başlık, fiyat, il/ilçe; sade filtreler yalnız “En yeni”, “Fiyat”, “Yakınımda”. Kategori filtresi gösterme.
3. İlan detayı: fotoğraflar, başlık, fiyat, kısa açıklama, konum, satıcı/işletme adı, “Ara” ve “WhatsApp” düğmeleri, “Şikâyet Et”.
4. İlan verme: fotoğraf, başlık, fiyat, konum, açıklama ve Yayınla. Kategori seçimi gösterme.
5. Basit giriş/profil yer tutucu ekranı.

Reklam yerleşimi için yalnız tasarım yer tutucuları oluştur:
- Ana arama ekranında reklam yok.
- Arama sonuçlarında 4. gerçek ilandan sonra bir “Reklam” kartı; sonra her 6 ilanda bir.
- İlan detayında temel bilgilerden sonra bir reklam alanı.
- İlan verme, giriş ve şikâyet ekranlarında reklam yok.
- Tam ekran, açılış veya yanıltıcı reklam tasarlama.

Tasarım dili:
- Sıcak, sempatik, güven veren ama çocukça olmayan.
- Çok açık arka plan, güçlü tipografi, bol boşluk.
- Kullanıcıya kategori ve sistem karmaşıklığı hissettirme.
- Her ekranda yalnız ana işe yarayan kontroller olsun.
- Mobilde tek elle kullanılabilir, masaüstünde de temiz.

Şimdilik yayınlama/deploy yapma. Önce çalışan önizleme oluştur ve yapılanları özetle.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://arar-buluruz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dca896f8-bb48-4a67-ae49-0493610ca6ad).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
