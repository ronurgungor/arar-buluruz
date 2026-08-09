import { createFileRoute } from "@tanstack/react-router";
import { PublisherInfoPage } from "@/components/PublisherInfoPage";
import { getRuntimeRobotsDirective } from "@/lib/discovery-contract";

export const Route = createFileRoute("/guvenli-kullanim")({
  head: () => ({
    meta: [
      { title: "Güvenli Kullanım ve Şikâyet — Arar Buluruz" },
      {
        name: "description",
        content: "İlan değerlendirirken dikkat edilmesi gerekenler ve sorunlu ilan bildirim sınırları.",
      },
      { name: "robots", content: getRuntimeRobotsDirective("publisher-info") },
    ],
  }),
  component: SafeUse,
});

function SafeUse() {
  return (
    <PublisherInfoPage
      title="Güvenli Kullanım / Şikâyet"
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
          title: "Hangi ilanı bildir?",
          bullets: [
            "Yanıltıcı açıklama veya sahte fiyat.",
            "Yasak veya yüksek riskli ürün/hizmet.",
            "Sahte satıcı veya dolandırıcılık şüphesi.",
            "Fikrî mülkiyet ihlali, uygunsuz içerik veya başka bir güvenlik sorunu.",
          ],
        },
        {
          title: "Şikâyet ne sağlar?",
          paragraphs: [
            "Bildirim, ilanı yeniden incelememize ve gerektiğinde yayından kaldırmamıza yardımcı olur. Şikâyet süreci ödeme iadesi, tazminat, kimlik doğrulama veya uyuşmazlık çözüm garantisi değildir.",
            "Acil tehlike veya suç şüphesinde yalnız platform içi bildirime güvenmek yerine ilgili resmî mercilere başvurmalısın.",
          ],
        },
      ]}
    />
  );
}
