import { createFileRoute, Link } from "@tanstack/react-router";
import { pilotPublicOperatorInfo } from "@/build-profiles/pilot/public-operator-info";

export const Route = createFileRoute("/iletisim")({
  head: () => ({
    meta: [
      { title: "İletişim ve Kaldırma — Arar Buluruz" },
      {
        name: "description",
        content: "Arar Buluruz işletmeci iletişim, gizlilik ve içerik kaldırma bilgileri.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const info = pilotPublicOperatorInfo;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <Link to="/" className="text-sm font-semibold text-primary underline underline-offset-4">
          Ana sayfaya dön
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">İletişim ve Kaldırma</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          İşletmeci iletişim bilgileri ile gizlilik, yanlış telefon ve içerik kaldırma bildirimleri
          için kullanılacak kanallar burada yayımlanır.
        </p>

        <dl className="mt-8 space-y-5 text-sm">
          <div>
            <dt className="font-semibold">İşletmeci</dt>
            <dd className="mt-1 text-muted-foreground">{info.legalName}</dd>
          </div>
          <div>
            <dt className="font-semibold">Adres</dt>
            <dd className="mt-1 whitespace-pre-line text-muted-foreground">{info.address}</dd>
          </div>
          <div>
            <dt className="font-semibold">Elektronik iletişim</dt>
            <dd className="mt-1 text-muted-foreground">
              {info.emailHref ? (
                <a href={info.emailHref} className="text-primary underline underline-offset-4">
                  {info.electronicContact}
                </a>
              ) : (
                info.electronicContact
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Telefon</dt>
            <dd className="mt-1 text-muted-foreground">
              {info.phoneHref ? (
                <a href={info.phoneHref} className="text-primary underline underline-offset-4">
                  {info.phoneDisplay}
                </a>
              ) : (
                info.phoneDisplay
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Vergi / ticaret sicili</dt>
            <dd className="mt-1 text-muted-foreground">{info.taxRegistry}</dd>
          </div>
        </dl>

        <section className="mt-8 rounded-2xl border border-border bg-accent/30 p-5">
          <h2 className="font-bold">Yanlış telefon, size ait veri veya acil kaldırma</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Bir ilanda size ait olmayan telefon, fotoğraf veya başka kişisel veri görürseniz; çocuk
            veya özel nitelikli kişisel veri bulunduğunu düşünürseniz; ya da içeriğin hukuka aykırı
            olduğunu bildiriyorsanız ilan bağlantısını veya ilan kimliğini iletin. Yüksek riskli
            gizlilik bildirimlerinde yaklaşımımız önce yayından kaldırmak, sonra incelemektir.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {info.phoneHref && (
              <a href={info.phoneHref} className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground">
                Telefonla bildir
              </a>
            )}
            {info.emailHref && (
              <a href={info.emailHref} className="inline-flex min-h-11 items-center rounded-full border border-primary px-4 text-sm font-bold text-primary">
                E-posta ile bildir
              </a>
            )}
          </div>
        </section>

        <p className="mt-6 text-sm text-muted-foreground">
          Kişisel verilerle ilgili haklar ve işleme açıklamaları için{" "}
          <Link to="/gizlilik" className="font-semibold text-primary underline underline-offset-4">
            Gizlilik ve Aydınlatma
          </Link>{" "}
          sayfasını inceleyin.
        </p>
      </article>
    </main>
  );
}
