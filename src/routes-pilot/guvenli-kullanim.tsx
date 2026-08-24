import { createFileRoute } from "@tanstack/react-router";
import { PilotPublisherInfoPage } from "@/build-profiles/pilot/PilotPublisherInfoPage";

export const Route = createFileRoute("/guvenli-kullanim")({
  head: () => ({
    meta: [
      { title: "Güvenli Kullanım — Arar Buluruz" },
      {
        name: "description",
        content: "İlan değerlendirirken dikkat edilmesi gereken temel güvenlik sınırları.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: SafeUse,
});

function SafeUse() {
  return (
    <PilotPublisherInfoPage
      title="Güvenli Kullanım"
      intro="İlan platformlarında en önemli güvenlik adımı, ödeme veya teslim kararından önce ilanı ve karşı tarafı bağımsız olarak doğrulamaktır."
      sections={[
        {
          title: "İşlemden önce kontrol et",
          bullets: [
            "Ürün veya hizmetin açıklamasını, fiyatını, konumunu ve varsa fotoğraflarını birlikte değerlendir.",
            "Gerçekçi olmayan fiyat, acele ödeme baskısı veya platform dışına yönlendiren şüpheli taleplerde işlemi durdur.",
            "Parola, SMS doğrulama kodu, kart bilgisi veya hesap erişim bilgisini başka kişilerle paylaşma.",
            "Mümkün olduğunda ürünün durumunu ve karşı tarafın kimliğini işlemden önce doğrula.",
          ],
        },
        {
          title: "Ödeme ve üçüncü taraf bağlantıları",
          paragraphs: [
            "Arar Buluruz ödeme tutmaz, emanet/escrow hizmeti vermez ve alıcı koruması garantisi sunmaz. Haricî bir satış veya ödeme bağlantısına geçersen o hizmet Arar Buluruz'dan bağımsızdır; koşullarını ve güvenliğini ayrıca değerlendirmelisin.",
          ],
        },
        {
          title: "Sorunlu ilanlar",
          paragraphs: [
            "Yanıltıcı, yasak veya güvenlik riski oluşturan bir ilan tespit edildiğinde kurucu moderasyonu kapsamında ilan yeniden incelenebilir ve gerektiğinde yayından kaldırılabilir.",
            "Acil tehlike veya suç şüphesinde platform işlemlerine güvenmek yerine ilgili resmî mercilere başvurmalısın.",
          ],
        },
      ]}
    />
  );
}
