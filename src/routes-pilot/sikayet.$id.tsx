import { createFileRoute, Link } from "@tanstack/react-router";
import { pilotPublicOperatorInfo } from "@/build-profiles/pilot/public-operator-info";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";

export const Route = createFileRoute("/sikayet/$id")({
  head: () => ({
    meta: [
      { title: "İlan Bildirimi ve Kaldırma — Arar Buluruz" },
      {
        name: "description",
        content: "Yanlış telefon, kişisel veri veya hukuka aykırı ilan için kaldırma kanalı.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: TakedownPage,
});

function TakedownPage() {
  const { id } = Route.useParams();
  const info = pilotPublicOperatorInfo;

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">İlan Bildirimi ve Kaldırma</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Bu sayfa bildirim metni veya kişisel veri toplamaz. Bildirim için aşağıdaki doğrudan
          iletişim kanallarından birini kullanın ve yalnız gerekli bilgileri paylaşın.
        </p>

        <div className="mt-5 rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="font-semibold">İlan kimliği</p>
          <p className="mt-1 break-all text-muted-foreground">{id}</p>
        </div>

        <section className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="font-bold">Öncelikli bildirimler</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Yanlış veya size ait olmayan telefon numarası.</li>
            <li>Size ait kişisel veri veya izinsiz fotoğraf.</li>
            <li>Çocuk veya özel nitelikli kişisel veri.</li>
            <li>Açıkça hukuka aykırı veya acil kaldırılması gereken içerik.</li>
          </ul>
          <p className="mt-3 text-sm font-medium">
            Yüksek riskli gizlilik bildirimlerinde ilan önce yayından kaldırılır, sonra incelenir.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Bildirim kanalları</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            WhatsApp ve public şikâyet formu Stage 1–3 pilotunda kapalıdır. İlan kimliği, bildirim
            sebebi ve çözüm için zorunlu olan en az bilgiyi paylaşın.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {info.phoneHref && (
              <a
                href={info.phoneHref}
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"
              >
                Telefonla bildir
              </a>
            )}
            {info.emailHref && (
              <a
                href={info.emailHref}
                className="inline-flex min-h-11 items-center rounded-full border border-primary px-4 text-sm font-bold text-primary"
              >
                E-posta ile bildir
              </a>
            )}
          </div>
          {!info.phoneHref && !info.emailHref && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
            >
              Gerçek kaldırma iletişim kanalları aktivasyon öncesinde yayımlanacaktır.
            </p>
          )}
        </section>

        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link
            to="/ilan/$id"
            params={{ id }}
            className="font-medium text-primary underline underline-offset-4"
          >
            İlana dön
          </Link>
          <Link to="/iletisim" className="font-medium text-primary underline underline-offset-4">
            İletişim bilgileri
          </Link>
          <Link to="/gizlilik" className="font-medium text-primary underline underline-offset-4">
            Gizlilik ve Aydınlatma
          </Link>
        </div>
      </main>
    </div>
  );
}
