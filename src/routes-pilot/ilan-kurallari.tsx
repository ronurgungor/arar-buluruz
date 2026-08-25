import { createFileRoute } from "@tanstack/react-router";
import { PilotPublisherInfoPage } from "@/build-profiles/pilot/PilotPublisherInfoPage";

export const Route = createFileRoute("/ilan-kurallari")({
  head: () => ({
    meta: [
      { title: "İlan Kuralları — Arar Buluruz" },
      {
        name: "description",
        content: "Arar Buluruz Çorlu Stage 1–3 özel satıcı ve ilan kuralları.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: ListingRules,
});

function ListingRules() {
  return (
    <PilotPublisherInfoPage
      title="İlan Kuralları"
      intro="Stage 1–3 pilotu bilinçli olarak çok dardır: yalnız özel kişilerin ara sıra kendi kullanılmış kişisel veya ev eşyalarını ilan etmesi desteklenir."
      sections={[
        {
          title: "Satıcı ve ürün kapsamı",
          bullets: [
            "Satıcı özel kişi olarak hareket etmeli ve ara sıra ilan vermelidir.",
            "İlan yalnız satıcının kendi kullanılmış kişisel veya ev eşyası için verilebilir.",
            "Profesyonel/işletme satıcıları, düzenli satış yapanlar ve ticari stok bu aşamada desteklenmez.",
            "Yeniden satış amacıyla alınmış veya üretilmiş yeni ürünler desteklenmez.",
            "Kapsamdan emin olunmayan ilan yayınlanmaz; önce incelenir.",
          ],
        },
        {
          title: "İlan doğru ve yeterli bilgi vermeli",
          bullets: [
            "Başlık ve açıklama ürünü doğru anlatmalı; fiyat ve konum yanıltıcı olmamalıdır.",
            "Yalnız sahip olduğunuz veya satmaya/yayımlamaya yetkili olduğunuz ürün, fotoğraf ve metni paylaşın.",
            "Önemli kusurları veya satış şartlarını saklamayın.",
            "Çocuk, tanınabilir üçüncü kişi, başkasına ait telefon/adres, plaka, kimlik/belge, ödeme bilgisi veya özel nitelikli kişisel veri paylaşmayın.",
            "Yayınlanacak telefon satıcıya ait olmalı ve yalnız ilanla ilgili iletişim amacıyla kamuya açılmalıdır.",
          ],
        },
        {
          title: "Yayımlanmayacak içerikler",
          bullets: [
            "Yasa dışı ürün/hizmetler, sahte/taklit ürünler ve hak ihlali oluşturan içerikler.",
            "Silahlar, patlayıcılar ve benzeri yüksek riskli ürünler.",
            "Alkol, tütün/nikotin, keyif verici veya uyuşturucu maddeler.",
            "Reçeteli/kısıtlı ilaçlar, kumar ürün veya hizmetleri, finansal ürün veya yatırım teklifleri.",
            "Cinsel açıdan açık/adult içerik ve ilk pilot kapsamı dışında kalan düzenlemeye tabi veya belirsiz kategoriler.",
            "Stage 1–3 için profesyonel satıcı, yeni-for-resale veya düzenli ticari satış ilanları.",
          ],
        },
        {
          title: "İnceleme ve yayından kaldırma",
          paragraphs: [
            "Kurucu her ilanı yayın öncesinde satıcı kapsamı, metin, fotoğraf, telefon ve güvenlik kuralları bakımından manuel inceler. Fotoğrafın teknik olarak temizlenmesi insan incelemesinin yerine geçmez.",
            "Yanlış telefon, size ait kişisel veri, çocuk/özel nitelikli veri veya açık hukuka aykırılık bildirimi gibi yüksek riskli durumlarda ilan önce yayından kaldırılır, sonra incelenir.",
          ],
        },
        {
          title: "Ödeme ve haricî satış",
          paragraphs: [
            "Arar Buluruz Stage 1–3 pilotunda ödeme almaz, sipariş/rezervasyon oluşturmaz, komisyon tahsil etmez ve haricî satış linki yayınlamaz. Satış koşulları satıcı ve alıcı arasında doğrudan belirlenir.",
          ],
        },
      ]}
    />
  );
}
