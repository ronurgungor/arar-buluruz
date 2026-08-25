import { createFileRoute, Link } from "@tanstack/react-router";
import { pilotPublicOperatorInfo } from "@/build-profiles/pilot/public-operator-info";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: [
      { title: "Gizlilik ve Aydınlatma — Arar Buluruz" },
      {
        name: "description",
        content: "Arar Buluruz Çorlu pilotu kişisel veri işleme ve aydınlatma bilgileri.",
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
          Bu açıklama, kişisel veri alınmadan önce hangi verilerin neden işlendiğini ve haklarınızı
          anlatır. Aydınlatma bir “kabul” veya genel açık rıza değildir.
        </p>

        <div className="mt-8 space-y-7 text-sm leading-6">
          <section>
            <h2 className="font-semibold">Veri sorumlusu ve iletişim</h2>
            <p className="mt-2 text-muted-foreground">Veri sorumlusu / işletmeci: {info.legalName}</p>
            <p className="mt-1 text-muted-foreground">Adres: {info.address}</p>
            <p className="mt-1 text-muted-foreground">Elektronik iletişim: {info.electronicContact}</p>
            <p className="mt-1 text-muted-foreground">Telefon: {info.phoneDisplay}</p>
            <Link to="/iletisim" className="mt-2 inline-flex font-semibold text-primary underline underline-offset-4">
              İletişim ve kaldırma bilgileri
            </Link>
          </section>

          <section>
            <h2 className="font-semibold">Hangi veriler işlenebilir?</h2>
            <p className="mt-2 text-muted-foreground">
              Stage 1–3 pilotunda yalnız gerekli ölçüde satıcı görünen adı, telefon, ilan başlığı,
              açıklaması, fiyatı, Tekirdağ/Çorlu konumu, ürün fotoğrafları; telefon kontrolü/yayın
              talimatı kayıtları; minimum moderasyon, şikâyet ve güvenlik kayıtları işlenebilir.
            </p>
            <p className="mt-2 font-medium">
              T.C. kimlik/pasaport, açık ev adresi, ödeme/banka verisi, çocuk verisi, özel nitelikli
              kişisel veri veya üçüncü kişilere ait telefon/fotoğraf gibi gereksiz verileri
              göndermeyin.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Amaçlar ve hukuki sebepler</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>İlan başvurusu/hizmet talebinin yürütülmesi: gerekli olduğu ölçüde KVKK 5/2-c.</li>
              <li>
                Satıcı telefonunun ilanda kamuya açık yayımlanması: satıcının ilan amacıyla bilinçli
                alenileştirmesi kapsamında KVKK 5/2-d ve yalnız aynı amaçla kullanım.
              </li>
              <li>Moderasyon, kötüye kullanım ve güvenlik: ölçülülük/denge ile KVKK 5/2-f.</li>
              <li>Uyuşmazlık ve kaldırma kanıtı: gerekli minimum ölçüde KVKK 5/2-e.</li>
              <li>KVKK/5651 gibi kanuni kayıt yükümlülükleri: KVKK 5/2-ç.</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Tüm işlemler için tek bir genel açık rıza alınmaz. Telefonun kamuya açık yayımlanması
              için ayrı yayın beyanı alınır; bu beyan aydınlatmanın kabulü değildir.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Kamuya açık telefon</h2>
            <p className="mt-2 text-muted-foreground">
              Yayındaki satıcı telefonu ilan aktif olduğu sürece herkes tarafından görülebilir.
              Numara yalnız ilgili ilan hakkında iletişim amacıyla paylaşılır; reklam, pazarlama veya
              ilgisiz amaçlarla kullanılmamalıdır. Stage 1–3 pilotunda WhatsApp iletişim kanalı
              kullanılmaz.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Fotoğraflar ve içerik</h2>
            <p className="mt-2 text-muted-foreground">
              Yalnız satıcının sahip olduğu veya yayımlamaya yetkili olduğu metin ve fotoğraflar
              kabul edilir. Kurucu yayın öncesi manuel içerik/gizlilik incelemesi yapar ve fotoğraf
              dosyası güvenli yeniden-encode akışından geçirilir.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Kimlerle paylaşılır?</h2>
            <p className="mt-2 text-muted-foreground">
              Aktif ilanın başlık, açıklama, fiyat, konum, satıcı görünen adı, onaylı fotoğrafları ve
              bilerek yayımlanan telefon numarası site ziyaretçilerine açıklanır. Diğer veriler yalnız
              hizmetin güvenli işletimi için yetkili altyapı sağlayıcıları ve kanunen yetkili makamlarla
              gerekli olduğu ölçüde paylaşılır. Stage 1–3 ilan/veri toplama akışı WhatsApp’a aktarılmaz.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Saklama ve silme</h2>
            <p className="mt-2 text-muted-foreground">
              İlan, telefon ve fotoğraf gibi canlı içerikler amaç sona erdiğinde pilot saklama/silme
              planına göre kaldırılır. 5651 kapsamındaki asgari trafik kayıtları ise ilan içeriğinden
              ayrı bir kanuni kayıt sınıfıdır ve en az bir yıllık hedefle korunur; canlı ilan silme
              işlemi bu trafik kayıtlarını otomatik olarak silmez. Trafik kayıtlarında istek gövdesi,
              parola, token, telefon veya ilan içeriği tutulmaz.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Haklar ve kaldırma</h2>
            <p className="mt-2 text-muted-foreground">
              KVKK kapsamındaki erişim, düzeltme, silme ve diğer başvurularınız ile yanlış telefon,
              size ait veri veya acil içerik kaldırma bildirimlerinizi İletişim ve Kaldırma kanalına
              iletebilirsiniz. Yüksek riskli gizlilik bildirimlerinde ilan önce yayından kaldırılır,
              sonra incelenir.
            </p>
            <Link to="/iletisim" className="mt-2 inline-flex font-semibold text-primary underline underline-offset-4">
              Başvuru / kaldırma kanalını aç
            </Link>
          </section>
        </div>
      </article>
    </main>
  );
}
