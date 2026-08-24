import { createFileRoute } from "@tanstack/react-router";
import { PublisherInfoPage } from "@/components/PublisherInfoPage";

export const Route = createFileRoute("/ilan-kurallari")({
  head: () => ({ meta: [
    { title: "İlan Kuralları — Arar Buluruz" },
    { name: "description", content: "Arar Buluruz'da gerçek ilan yayını için temel doğruluk ve güvenlik kuralları." },
    { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
  ] }),
  component: ListingRules,
});

function ListingRules() {
  return <PublisherInfoPage
    title="İlan Kuralları"
    intro="Amaç, gerçek, anlaşılır ve güvenli biçimde incelenebilir ilanlar yayımlamaktır. Kurallar hem ilan verenleri hem ilan arayanları korumak için uygulanır."
    sections={[
      { title: "İlan doğru ve yeterli bilgi vermeli", bullets: [
        "Başlık ve açıklama satılan veya kiralanan şeyi doğru anlatmalı.",
        "Fiyat ve konum yanıltıcı olmamalı; önemli kusurlar veya şartlar saklanmamalı.",
        "Yalnız satmaya, kiralamaya veya sunmaya yetkili olduğun içerik için ilan vermelisin.",
        "Fotoğraf ve metin başkasının fikrî mülkiyet hakkını ihlal etmemeli.",
        "İlan metnine gereksiz hassas kişisel veri, parola, doğrulama kodu veya ödeme bilgisi yazılmamalı.",
      ] },
      { title: "Yayımlanmayacak içerikler", bullets: [
        "Yasa dışı ürün veya hizmetler, sahte/taklit ürünler ve hak ihlali oluşturan içerikler.",
        "Cinsel açıdan açık içerik, tehlikeli veya aşağılayıcı/nefret içeriği ve dolandırıcılık ya da aldatıcı iddialar.",
        "Silahlar, patlayıcılar ve benzeri yüksek riskli ürünler.",
        "Tütün ve nikotin ürünleri, keyif verici/uyuşturucu maddeler ve alkol.",
        "Kumar ürün veya hizmetleri ile reçeteli veya kısıtlı ilaçlar.",
        "Kullanıcıların veya platformun güvenliğini ciddi biçimde riske atan diğer içerikler.",
      ] },
      { title: "İnceleme ve yayından kaldırma", paragraphs: [
        "İlanlar yayımlanmadan önce veya yayımlandıktan sonra kurallara uygunluk açısından incelenebilir. Yasa dışı, yasak, yanıltıcı, aldatıcı veya yüksek riskli içerikler reddedilebilir.",
        "Kurallara aykırı olduğu veya sonradan sorun oluşturduğu anlaşılan ilanlar yayından kaldırılabilir. Arar Buluruz, kullanıcıların ve platformun güvenliğini korumak için gerektiğinde daha sıkı yayın kuralları uygulayabilir.",
      ] },
      { title: "Haricî satış bağlantıları", paragraphs: [
        "İleride bir satıcı kendi satış bağlantısını paylaşırsa bağlantı satıcıya ait olmalı, ilanla ilgili olmalı ve kullanıcıyı yanıltmamalıdır. Arar Buluruz herhangi bir üçüncü taraf satış hizmetiyle ortaklık, ödeme garantisi veya alıcı koruması iddiasında bulunmaz.",
      ] },
    ]}
  />;
}
