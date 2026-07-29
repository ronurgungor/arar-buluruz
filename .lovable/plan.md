Kod değiştirilmedi. Bulgular `src/routes/ara.tsx`, `src/routes/ilan.$id.tsx`, `src/routes/ilan-ver.tsx`, `src/routes/giris.tsx`, `src/routes/sikayet.$id.tsx`, `src/components/TopBar.tsx` ve `src/data/listings.ts` okunarak doğrulandı. Aşağıdaki 5 madde yalnız mevcut akışlardaki sorunlardır; yeni özellik önerisi içermez.

## B1 — Arama kutusu URL'deki sorguyla senkron kalmıyor

**Kanıt:** `ara.tsx:39` — `const [term, setTerm] = useState(q ?? "")`. Bu yalnız ilk render'da okunur; `q` sonradan değişince (tarayıcı geri/ileri, ana sayfadaki örnek çipten gelen ikinci gezinme, "Tüm Türkiye'de ara" sonrası geri) input eski metni gösterir.

**Kullanıcı etkisi:** Mobilde geri tuşu ana gezinme yoludur. Sonuç listesi bir sorguyu, arama kutusu başka bir sorguyu gösterir; kullanıcı "Ara"ya basınca beklemediği sonuca döner ve aramaya güveni düşer.

**Şiddet:** Yüksek.

**Önerilen düşük riskli düzeltme:** Kontrollü input'u URL'ye bağlamak — örneğin input'a `key={q}` vermek veya `q` değişiminde `term`'i eşitlemek. Tek dosya, birkaç satır.

## B2 — İlan detayından arama sonuçlarına dönüş yolu yok

**Kanıt:** `ilan.$id.tsx` sayfasında geri bağlantısı yok; `TopBar.tsx` yalnız logo (→ "/"), "İlan Ver" ve "Giriş" içeriyor. Logoya basmak kullanıcıyı sonuç listesinden ana ekrana atar.

**Kullanıcı etkisi:** 390 px'de tarama davranışı "ilana gir → geri dön → sonraki ilan"dır. Tek elle erişilebilir bir geri kontrolü olmadığı için kullanıcı logoya basar, sorgusunu kaybeder ve baştan yazar; oturum başına görüntülenen ilan sayısı düşer.

**Şiddet:** Yüksek.

**Önerilen düşük riskli düzeltme:** Detay sayfasının içerik başına, mevcut tipografiyle uyumlu tek bir metin bağlantısı ("← Sonuçlara dön") koymak; tarayıcı geçmişinde geri gitmesi yeterli. Yeni sayfa veya bileşen gerekmez.

## B3 — İlan verme formundaki 4 fotoğraf kutusu hiçbir şey yapmıyor

**Kanıt:** `ilan-ver.tsx:89-98` — dört adet `type="button"`, `onClick` yok, dosya seçici yok. Önizleme kartında da (`ilan-ver.tsx:44-46`) sabit "Fotoğraf önizlemesi" gri alanı görünür.

**Kullanıcı etkisi:** Fotoğraf, ilan verenin en önemsediği alandır. Kullanıcı dokunur, hiçbir tepki almaz; "uygulama bozuk" kaydı düşer ve testin asıl konusu olan akış geri bildirimi kaybolur.

**Şiddet:** Yüksek (ilan verme ana gelir akışı).

**Önerilen düşük riskli düzeltme:** İki seçenekten biri — (a) kutuları gerçek `<input type="file" accept="image/*">` ile yerel `URL.createObjectURL` önizlemesine bağlamak (yükleme yok, sunucu yok), veya (b) daha ucuzu: kutuları etkileşimsiz yer tutucu hale getirip altına "Fotoğraf yükleme bu prototipte kapalı" notu koymak. Kararı kapsam bütçesi belirler; (b) tek satırlık iştir.

## B4 — Reklam kartı organik ilanın `<li>` öğesinin içinde

**Kanıt:** `ara.tsx:158-162` — reklam bloğu, ilanın `Link`'iyle aynı `<li>` içinde ve o ilanın hemen altına render ediliyor.

**Kullanıcı etkisi:** Görsel olarak reklam 4. ilana yapışık görünür; ekran okuyucu tek liste öğesi olarak okur. Reklamın organik ilanla karışmaması ilkesine aykırı, ayrıca sonuç 4 ilanda bitiyorsa reklam listenin en dibinde tek başına kalır.

**Şiddet:** Orta.

**Önerilen düşük riskli düzeltme:** Reklamı ayrı bir `<li aria-hidden="false">` öğesine taşımak ve üst/alt boşluğu biraz artırmak. Frekans (4. ilandan sonra, sonra her 6 ilanda bir) aynen korunur.

## B5 — Giriş formu boş telefonla da "gönderiliyor"

**Kanıt:** `giris.tsx:39-47` — telefon input'unda `required`, `pattern` veya değer durumu yok; boş formda "Kod gönder" doğrudan `setSent(true)` yapıp "Kod gönderilmedi; giriş bu prototipte devre dışı." mesajını gösteriyor.

**Kullanıcı etkisi:** Kullanıcı numarasını hiç yazmadan da aynı sonucu görür; ekranın ne test ettiği belirsizleşir ve alan doğrulama davranışı hakkında geri bildirim toplanamaz.

**Şiddet:** Düşük.

**Önerilen düşük riskli düzeltme:** Input'a `required` ve basit `inputMode="tel"` + minimum uzunluk vermek; mesaj metni aynı kalır.

## Kapsam dışı bırakılanlar

Backend, auth, SMS, storage, analytics, reklam SDK'sı, deploy, yeni sayfa, kategori/otomatik tamamlama, gerçek konum ve genel refactor bu denetimin dışındadır ve önerilmemiştir.

## Uygulama sırası önerisi

Onay verirsen tek küçük turda B1 + B2 (aynı iki dosya, en yüksek etki), ardından ayrı turda B3'ün seçilen varyantı yapılabilir. B4 ve B5 en sona bırakılabilir.
