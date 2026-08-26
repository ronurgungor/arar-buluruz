import { createFileRoute } from "@tanstack/react-router";
import { PilotPublisherInfoPage } from "@/build-profiles/pilot/PilotPublisherInfoPage";

export const Route = createFileRoute("/nasil-calisir")({
  head: () => ({
    meta: [
      { title: "Nasıl Çalışır — Arar Buluruz" },
      {
        name: "description",
        content: "Arar Buluruz'un ilan keşfi, iletişim ve işlem sınırlarını sade biçimde açıklar.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <PilotPublisherInfoPage
      title="Nasıl Çalışır"
      intro="Arar Buluruz, aradığın ilanı sade bir arama ve konum akışıyla bulmayı amaçlayan ücretsiz bir ilan keşif hizmetidir."
      sections={[
        {
          title: "1. Ara ve karşılaştır",
          paragraphs: [
            "Aradığın ürünü veya ilanı yazarsın; konum ve uygun filtrelerle yayımdaki ilanları daraltırsın. İlan detayında fiyat, konum, açıklama ve mevcutsa fotoğraflar gösterilir.",
          ],
        },
        {
          title: "2. İlanı ve satıcıyı değerlendir",
          paragraphs: [
            "Arar Buluruz ilanları keşfetmeyi kolaylaştırır; satıcının beyanının doğruluğunu, ürünün durumunu veya işlemin sonucunu garanti etmez. Karar vermeden önce ilanı, satıcıyı ve işlem koşullarını kendin doğrulamalısın.",
          ],
        },
        {
          title: "3. Satıcıyla doğrudan iletişim kur",
          paragraphs: [
            "Yayınlanmış satıcı telefonu ilan detayında gösterilir. Arar Buluruz ödeme tutmaz, sipariş veya rezervasyon oluşturmaz, emanet/escrow hizmeti vermez ve alıcı koruması garantisi sunmaz. Görüşme ve satış koşulları alıcı ile satıcı arasında doğrudan belirlenir.",
          ],
        },
        {
          title: "4. Kurucu moderasyonu",
          paragraphs: [
            "İlan başvuruları kurucu tarafından manuel incelenir. Kurallara uymayan veya sonradan sorunlu olduğu anlaşılan ilanlar yayınlanmayabilir ya da yayından kaldırılabilir.",
          ],
        },
      ]}
    />
  );
}
