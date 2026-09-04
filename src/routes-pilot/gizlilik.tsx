import { createFileRoute, Link } from "@tanstack/react-router";
import { pilotPublicOperatorInfo } from "@/build-profiles/pilot/public-operator-info";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: [
      { title: "Gizlilik ve Aydınlatma — Arar Buluruz" },
      {
        name: "description",
        content: "Arar Buluruz kişisel veri işleme ve aydınlatma bilgileri.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const info = pilotPublicOperatorInfo;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <Link to="/" className="text-sm font-semibold text-primary underline underline-offset-4">
          Ana sayfaya dön
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Gizlilik ve Aydınlatma</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Bu sayfa, ilan verirken hangi bilgilerin neden işlendiğini anlatır. Aydınlatma metni bir
          genel açık rıza kutusu değildir.
        </p>

        <div className="mt-8 space-y-7 text-sm leading-6">
          <section>
            <h2 className="font-semibold">İşletmeci ve iletişim</h2>
            <p className="mt-2 text-muted-foreground">
              İşletmeci / veri sorumlusu: {info.legalName}
            </p>
            {info.address && <p className="mt-1 text-muted-foreground">Adres: {info.address}</p>}
            <p className="mt-1 text-muted-foreground">
              Elektronik iletişim: {info.electronicContact}
            </p>
            <p className="mt-1 text-muted-foreground">Telefon: {info.phoneDisplay}</p>
            <Link
              to="/iletisim"
              className="mt-2 inline-flex font-semibold text-primary underline underline-offset-4"
            >
              İletişim ve kaldırma
            </Link>
          </section>

          <section>
            <h2 className="font-semibold">Hangi bilgiler işlenir?</h2>
            <p className="mt-2 text-muted-foreground">
              İlan oluşturma ve yönetiminde gerekli olduğu ölçüde görünen satıcı adı, kamuya açık
              telefon, ilan başlığı, isteğe bağlı açıklama ve durum bilgisi, fiyat/Ücretsiz bilgisi,
              İl/İlçe, fotoğraflar, yayın talimatı ve satıcı oturumu ile sınırlı güvenlik/moderasyon
              kayıtları işlenebilir.
            </p>
            <p className="mt-2 font-medium">
              T.C. kimlik/pasaport, açık ev adresi, banka/ödeme verisi, çocuk verisi, özel nitelikli
              kişisel veri veya size ait olmayan telefon/fotoğraf gibi gereksiz verileri eklemeyin.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Telefon neden herkese açık?</h2>
            <p className="mt-2 text-muted-foreground">
              Yayındaki ilanın satıcının yayımlanmasını istediği telefonu, alıcının satıcıya
              doğrudan ulaşabilmesi için ilan aktif olduğu sürece herkese açık görünür. Aynı
              numaradan <strong>Ara</strong> ve
              <strong> WhatsApp</strong> bağlantıları oluşturulur. Arar Buluruz bu iletişimi kendi
              içinde mesajlaşma sistemine dönüştürmez.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Yayın ve satıcı oturumu</h2>
            <p className="mt-2 text-muted-foreground">
              Satıcı ilanı kendisi oluşturur. Geçerli satıcı oturumu, zorunlu alanlar ve güvenli
              fotoğraf işlemi tamamlandığında ilan teknik kontrollerle otomatik yayımlanabilir.
              Telefon, satıcı kimliği veya yönetim yetkisi değildir. Yayın öncesi kurucu onayı
              normal akışın parçası değildir.
            </p>
            <p className="mt-2 text-muted-foreground">
              İlanı yayınlama işlemi, ekranda bağlantısı verilen güncel İlan Kuralları'nın kabulü ve
              telefonun ilan amacıyla yayımlanması yönündeki talimatın kaydıdır.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Fotoğraf ve içerik</h2>
            <p className="mt-2 text-muted-foreground">
              Fotoğraflar güvenli yeniden kodlama işleminden geçirilir ve ilan aktif değilken özel
              depolamada tutulur. Yalnız paylaşmaya yetkili olduğunuz içerikleri yükleyin; gereksiz
              üçüncü kişi verisi, çocuk görüntüsü, belge, açık adres veya hassas bilgi eklemeyin.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Kimlerle paylaşılır?</h2>
            <p className="mt-2 text-muted-foreground">
              Aktif ilanın başlığı, fiyatı, İl/İlçesi, satıcı görünen adı, seçilmiş içerik alanları,
              güvenli fotoğrafları ve kamuya açık telefonu site ziyaretçilerine açıklanır. Diğer
              veriler yalnız hizmeti güvenli işletmek, yasal yükümlülükleri yerine getirmek ve
              başvuru/şikâyetleri yönetmek için gerekli olduğu ölçüde işlenir.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Ödeme ve satış</h2>
            <p className="mt-2 text-muted-foreground">
              Arar Buluruz şu aşamada ödeme almaz, sipariş/rezervasyon oluşturmaz, komisyon tahsil
              etmez ve kargo sistemi işletmez. Alıcı ve satıcı doğrudan iletişim kurar.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Kaldırma ve haklar</h2>
            <p className="mt-2 text-muted-foreground">
              Yanlış kişiye ait telefon, çocuk görüntüsü, hassas veri, yetkisiz kişisel veri veya
              benzeri yüksek riskli bildirimlerde ilan önce yayından kaldırılır, sonra incelenir.
              KVKK kapsamındaki başvurular ve içerik kaldırma talepleri için iletişim kanalını
              kullanabilirsiniz.
            </p>
            <Link
              to="/iletisim"
              className="mt-2 inline-flex font-semibold text-primary underline underline-offset-4"
            >
              Başvuru / kaldırma kanalını aç
            </Link>
          </section>

          <section>
            <h2 className="font-semibold">Saklama</h2>
            <p className="mt-2 text-muted-foreground">
              Canlı ilan, telefon ve fotoğraf gibi içerikler amaç ve geçerli saklama ihtiyacı sona
              erdiğinde silinir veya erişimden kaldırılır. Kanunen ayrı saklanması gereken asgari
              trafik/güvenlik kayıtları varsa bunlar ilan içeriğinden ayrı değerlendirilir.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
