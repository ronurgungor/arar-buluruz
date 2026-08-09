import { createFileRoute } from "@tanstack/react-router";
import { PublisherInfoPage } from "@/components/PublisherInfoPage";
import { getRuntimeRobotsDirective } from "@/lib/discovery-contract";

export const Route = createFileRoute("/ilan-kurallari")({
  head: () => ({
    meta: [
      { title: "İlan Kuralları — Arar Buluruz" },
      {
        name: "description",
        content: "Arar Buluruz'da gerçek ilan yayını için temel doğruluk ve güvenlik kuralları.",
      },
      { name: "robots", content: getRuntimeRobotsDirective("publisher-info") },
    ],
  }),
  component: ListingRules,
});

function ListingRules() {
  return (
    <PublisherInfoPage
      title="İlan Kuralları"
      intro="Amaç, az sayıda da olsa gerçek, anlaşılır ve güvenli biçimde incelenebilir ilan yayımlamaktır. Kurallar hem ilan verenleri hem ilan arayanları korumak için uygulanır."
      sections={[
        {
          title: "İlan doğru ve yeterli bilgi vermeli",
          bullets: [
            "Başlık ve açıklama satılan veya kiralanan şeyi doğru anlatmalı.",
            "Fiyat ve konum yanıltıcı olmamalı; önemli kusurlar veya şartlar saklanmamalı.",
            "Yalnız satmaya, kiralamaya veya sunmaya yetkili olduğun içerik için ilan vermelisin.",
            "Fotoğraf ve metin başkasının fikrî mülkiyet hakkını ihlal etmemeli.",
            "İlan metnine gereksiz hassas kişisel veri, parola, doğrulama kodu veya ödeme bilgisi yazılmamalı.",
          ],
        },
        {
          title: "Yayımlanmayacak içerikler",
          bullets: [
            "Yasa dışı ürün veya hizmetler, sahte/taklit ürünler ve hak ihlali oluşturan içerikler.",
            "Cinsel açıdan açık içerik, tehlikeli veya aşağılayıcı/nefret içeriği ve dolandırıcılık ya da aldatıcı iddialar.",
            "Silahlar, patlayıcılar ve benzeri yüksek riskli ürünler.",
            "Tütün ve nikotin ürünleri, keyif verici/uyuşturucu maddeler ve alkol.",
            "Kumar ürün veya hizmetleri ile reçeteli veya kısıtlı ilaçlar.",
            "Google Publisher Policy veya Publisher Restrictions açısından yüksek risk oluşturan diğer içerikler.",
          ],
        },
        {
          title: "İlk gerçek pilotta manuel inceleme",
          paragraphs: [
            "İlk 5–10 gerçek ilanlık pilotta her ilan yayın öncesinde kurucu tarafından manuel incelenir. Google tarafından kısıtlı kabul edilen yüksek riskli kategoriler için sayfa bazlı reklam hariç tutma sistemi kurmak yerine ilan yayınlanmaz.",
            "Kurallara aykırı, şüpheli veya sonradan sorunlu olduğu anlaşılan ilan yayından kaldırılabilir.",
          ],
        },
        {
          title: "Haricî satış bağlantıları",
          paragraphs: [
            "İleride bir satıcı kendi satış bağlantısını paylaşırsa bağlantı satıcıya ait olmalı, ilanla ilgili olmalı ve kullanıcıyı yanıltmamalıdır. Arar Buluruz herhangi bir üçüncü taraf satış hizmetiyle ortaklık, ödeme garantisi veya alıcı koruması iddiasında bulunmaz.",
          ],
        },
      ]}
    />
  );
}
