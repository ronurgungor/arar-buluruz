Kod değiştirilmedi. Aşağıdaki tespitler `src/routes/index.tsx`, `src/routes/ara.tsx`, `src/routes/ilan.$id.tsx`, `src/routes/ilan-ver.tsx`, `src/components/TopBar.tsx` ve `src/data/listings.ts` okunarak doğrulandı.

## 1. Testi gerçekten bozabilecek 5 UX sorunu

**S1 — Arama yalnız birebir kelime eşleşmesi yapıyor**
Doğrulandı: `ara.tsx` filtresi sadece `title` ve `description` içinde `includes` arıyor. Mock veride "otomobil" var ama "araba" yok; "ev" araması "daire/dükkân" ilanlarını getirmez. Kategori ağacı olmadığı için aramanın affediciliği ürünün tamamı demek.

**S2 — İl filtresi neredeyse her zaman 0 sonuç üretiyor**
Doğrulandı: 12 ilanın 12'si farklı ilde. Tester bir il seçip bir kelime yazdığında sonuç boş kalır ve "uygulama boş/bozuk" izlenimi doğar. Şu an boş durumda ili gevşetme yolu yok.

**S3 — Ana ekranda ne yazacağını bilmeyen kullanıcı için sıfır ipucu**
Doğrulandı: `index.tsx` yalnız arama kutusu + konum + Ara içeriyor. Kategori olmaması ilke; ama hiç örnek yoksa tester ilk 10 saniyede takılır.

**S4 — "Yakınımda" filtresi konum izni istemeden mesafeye göre sıralıyor**
Doğrulandı: `distanceKm` sabit mock alan. Tester bunu "yanlış çalışıyor" diye raporlar; test geri bildirimi gerçek üründen çok prototip kusuruna harcanır.

**S5 — İlan Ver akışı çıktısız bitiyor**
Doğrulandı: `ilan-ver.tsx` gönderimde yalnız "Prototip — gerçek kayıt yapılmaz" metni gösteriyor; kullanıcı girdiği başlık/fiyat/fotoğrafı hiçbir yerde görmüyor. Ana gelir akışının test edilebilirliği düşer.

## 2. Her sorun için en ucuz çözüm ve çözülmezse etkisi

| # | En ucuz çözüm (sıfır bütçe, frontend) | Çözülmezse test etkisi |
|---|---|---|
| S1 | Mock ilanlara görünmeyen `keywords: string[]` alanı ekleyip filtreye dahil etmek (araba/oto, ev/daire/kiralık, mobilya/masa, tarım/traktör). Yapay zekâ, API, sözlük yok. | Testerların yarısı ilk aramada "Sonuç bulunamadı" görür; arama motoru vaadi çöker |
| S2 | Boş sonuçta "Tüm Türkiye'de ara" düğmesi göstermek (ili sıfırlayan tek buton) | İl seçen her tester ölü ekranla karşılaşır, ürünü boş sanır |
| S3 | Arama kutusunun altına 4-5 metin çipi ("traktör", "kiralık daire", "ikinci el masa", "oto") — kategori değil, örnek sorgu | İlk etkileşim gecikir; "ne yazacağımı bilemedim" geri bildirimi asıl soruları gölgeler |
| S4 | "Yakınımda" etiketini "Yakın konum (örnek veri)" gibi dürüst hale getirmek veya prototip turunda gizlemek | Hatalı özellik raporları test gündemini işgal eder |
| S5 | Yayınla sonrası girilen başlık/fiyat/konumu bir sonuç kartı biçiminde önizleme olarak göstermek (kayıt yok, yeni sayfa yok) | Satıcı tarafı testi sonuçsuz kalır; "ilan verdim, ne oldu?" belirsizliği |

## 3. Lovable'da tek küçük promptta yapılacak yalnız 1 sonraki iş

**Aramayı affedici hale getirmek: mock ilanlara gizli anahtar kelime alanı + boş sonuçta "Tüm Türkiye'de ara" düğmesi.**

Neden bu: S1 ve S2 aynı dosya çiftinde (`src/data/listings.ts`, `src/routes/ara.tsx`) çözülür, tek küçük prompt eder, yeni sayfa/özellik açmaz ve testin en olası tek kırılma noktasını (boş sonuç ekranı) kapatır. Diğer dördü bu turdan sonra sıraya alınabilir.

## 4. Yapılmaması gereken gereksiz geliştirmeler

- Kategori ağacı, kategori çipleri, "popüler kategoriler" bölümü — ilkeye aykırı
- Otomatik tamamlama, arama geçmişi, kayıtlı arama, bildirim
- Gerçek geolocation izni, harita, mesafe hesabı
- Favori, mesajlaşma, satıcı profili, puan/yorum
- Backend, veritabanı, auth, storage, analytics, reklam SDK'sı, deploy
- Reklam sıklığı/yerleşimi değişikliği veya yeni reklam formatı
- Genel refactor, tasarım sistemi değişimi, animasyon/onboarding turu
- Mock ilan sayısını büyütmek (12 ilan test için yeterli; iş S1'in çözümünde)
