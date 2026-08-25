import { createFileRoute, Link } from "@tanstack/react-router";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { PILOT_DISTRICT, PILOT_PROVINCE } from "@/lib/pilot-operator-contract";

export const Route = createFileRoute("/ilan-ver")({
  head: () => ({
    meta: [
      { title: "İlan Başvurusu — Arar Buluruz" },
      {
        name: "description",
        content:
          "Çorlu pilotunda ilan başvurusu telefonla alınır ve kurucu tarafından manuel olarak incelenir.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: PilotApplicationPage,
});

const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

function PilotApplicationPage() {
  const intakeE164 = (import.meta.env.VITE_PILOT_INTAKE_E164 as string | undefined)?.trim() ?? "";
  const intakeHref = E164_PATTERN.test(intakeE164) ? `tel:${intakeE164}` : null;

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">İlan Başvurusu</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Stage 1–3 Çorlu pilotunda bu sayfa ad, telefon, ilan metni veya fotoğraf toplamaz. Başvuru
          yalnız telefonla kurucuya yapılır; kurucu uygun ilanı mevcut güvenli operator akışında
          pending olarak oluşturur.
        </p>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Kişisel veri paylaşmadan önce</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Telefon görüşmesinde kişisel veri veya ilan içeriği paylaşmadan önce Gizlilik ve
            Aydınlatma metnini okuyun. Aydınlatma bir onay kutusu değildir; veri işlemeye başlamadan
            önce bilgi vermek içindir.
          </p>
          <Link
            to="/gizlilik"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
          >
            Gizlilik ve Aydınlatma metnini aç
          </Link>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Bu aşamada kimler ilan verebilir?</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Yalnız özel kişi olarak, ara sıra ilan veren satıcılar.</li>
            <li>Yalnız size ait, kullanılmış kişisel veya ev eşyaları.</li>
            <li>Profesyonel/işletme satıcıları ve yeniden satış için yeni ürünler desteklenmez.</li>
          </ul>
          <p className="mt-3 text-sm font-medium text-foreground">
            Kurucu, ilanı oluşturmadan önce satıcının özel/ara sıra hareket ettiğini ve ürünün kendi
            kullanılmış kişisel/ev eşyası olduğunu ayrıca teyit eder.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Telefon ve içerik kuralları</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Yalnız size ait telefonu verin. İlan aktifken bu numara herkes tarafından görülebilir
              ve yalnız ilanla ilgili iletişim amacıyla kullanılmalıdır.
            </li>
            <li>
              Yayın öncesinde ayrı olarak şu beyan teyit edilir: “Bu telefon numarası bana aittir ve
              ilan aktifken ilanla ilgili iletişim amacıyla kamuya açık yayımlanmasını istiyorum.”
            </li>
            <li>
              Yalnız size ait veya yayımlamaya yetkili olduğunuz fotoğraf ve metinleri paylaşın.
            </li>
            <li>
              Çocuk, tanınabilir üçüncü kişi, başkasına ait telefon/adres, plaka, kimlik/belge,
              ödeme bilgisi veya özel nitelikli kişisel veri göndermeyin.
            </li>
          </ul>
          <Link
            to="/ilan-kurallari"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
          >
            İlan kurallarını görüntüle
          </Link>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-accent/40 p-5">
          <h2 className="font-bold">Telefonla başvur</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Pilot konumu: {PILOT_PROVINCE} / {PILOT_DISTRICT}. WhatsApp, mesaj formu ve dosya
            yükleme bu aşamada kapalıdır.
          </p>
          {intakeHref ? (
            <a
              href={intakeHref}
              className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Kurucuyu ara
            </a>
          ) : (
            <p
              role="status"
              className="mt-4 rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground"
            >
              İlan başvuru telefonu bu sentetik ortamda etkin değil.
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Arar Buluruz bu sayfada veri toplamaz. Kurucu, uygun ilanı yayınlamadan önce telefon
            kontrolü, yayın talimatı, içerik/fotoğraf incelemesi ve gerekli operasyonel teyitleri
            ayrı ayrı tamamlar.
          </p>
        </section>

        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link to="/iletisim" className="font-medium text-primary underline underline-offset-4">
            İletişim ve kaldırma
          </Link>
          <Link to="/" className="font-medium text-primary underline underline-offset-4">
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    </div>
  );
}
