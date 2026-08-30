import { createFileRoute } from "@tanstack/react-router";
import { PilotPublisherInfoPage } from "@/build-profiles/pilot/PilotPublisherInfoPage";

export const Route = createFileRoute("/ilan-kurallari")({
  head: () => ({
    meta: [
      { title: "İlan Kuralları — Arar Buluruz" },
      {
        name: "description",
        content: "Arar Buluruz ilan yayınlama ve içerik kuralları.",
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
      intro="İlanın doğru, güvenli ve alıcı için anlaşılır olmalı. İlanı yayınlayarak bu kuralların güncel sürümünü kabul etmiş olursun."
      sections={[
        {
          title: "Doğru ilan bilgisi",
          bullets: [
            "Başlık, fiyat/Ücretsiz bilgisi, İl/İlçe ve varsa açıklama gerçeği yansıtmalıdır.",
            "Yalnız satmaya veya yayımlamaya yetkili olduğunuz ürün, fotoğraf ve metni paylaşın.",
            "Önemli kusurları, yanıltıcı fiyatı veya ürünün niteliğini gizlemeyin.",
            "Durum ve açıklama her ilan için zorunlu değildir; ekliyorsanız doğru bilgi verin.",
          ],
        },
        {
          title: "Kişisel veri ve fotoğraf",
          bullets: [
            "Açık ev adresi, kimlik/pasaport, banka/ödeme bilgisi veya özel nitelikli kişisel veri eklemeyin.",
            "Çocuk veya gereksiz tanınabilir üçüncü kişi görüntüsü paylaşmayın.",
            "Başkasına ait telefon, adres, belge, plaka veya kişisel bilgiyi yetkisiz şekilde yayımlamayın.",
            "Yüklenen fotoğraf ve metni paylaşmaya hakkınız olmalıdır.",
          ],
        },
        {
          title: "Telefon ve doğrudan iletişim",
          paragraphs: [
            "İlan verirken doğrulanan telefon, ilan aktif olduğu sürece herkese açık görünür. Alıcı için hem Ara hem WhatsApp bağlantısı aynı açık numaradan oluşturulur.",
            "Telefon bilgisini yalnız ilgili ilan hakkında iletişim amacıyla kullanın; reklam, pazarlama veya ilgisiz iletişim için kullanmayın.",
          ],
        },
        {
          title: "Yayımlanmayacak içerikler",
          bullets: [
            "Yasa dışı ürün/hizmetler, sahte/taklit ürünler ve açık hak ihlali oluşturan içerikler.",
            "Silah, patlayıcı ve benzeri yüksek riskli veya ağır biçimde düzenlenen ürünler.",
            "Alkol, tütün/nikotin, uyuşturucu/keyif verici maddeler ve yasaklı maddeler.",
            "Reçeteli/kısıtlı ilaç, kumar ürünü/hizmeti, finansal ürün veya yatırım teklifi.",
            "Cinsel açıdan açık içerik veya açıkça hukuka/ürün güvenliğine aykırı içerik.",
          ],
        },
        {
          title: "Vasıta / Araç",
          paragraphs: [
            "Vasıta kategorisi ürün deneyimi ve sentetik geliştirme/test kapsamında korunur.",
            "Gerçek production araç ilanı, gerekli EİDS yetkilendirme doğrulaması devreye alınmadan yayımlanmayacaktır.",
          ],
        },
        {
          title: "Yayın ve moderasyon",
          paragraphs: [
            "Telefon doğrulaması, gerekli alanlar ve güvenli fotoğraf işlemi tamamlandığında ilan teknik kontrollerle otomatik yayımlanabilir. Normal akışta yayın öncesi kurucu onayı yoktur.",
            "Arar Buluruz ilanı sonradan inceleyebilir, şikâyet üzerine veya kurallara aykırılık halinde yayından kaldırabilir ya da silebilir.",
            "Yanlış kişiye ait telefon, çocuk görüntüsü, hassas/özel nitelikli veri veya yetkisiz kişisel veri bildirimi gibi yüksek riskli durumlarda ilan önce yayından kaldırılır, sonra incelenir.",
          ],
        },
        {
          title: "Ödeme ve satış",
          paragraphs: [
            "Arar Buluruz şu aşamada ödeme almaz, sipariş veya rezervasyon oluşturmaz, komisyon tahsil etmez ve kargo sistemi işletmez. Satış koşulları alıcı ile satıcı arasında doğrudan belirlenir.",
          ],
        },
      ]}
    />
  );
}
