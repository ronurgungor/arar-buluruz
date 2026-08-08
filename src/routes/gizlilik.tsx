import { createFileRoute, Link } from "@tanstack/react-router";
import { PROTOTYPE_CONTACT } from "@/lib/prototype-contact";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: [
      { title: "Gizlilik — Arar Buluruz V0" },
      {
        name: "description",
        content: "Arar Buluruz V0 test sürümünün kısa ve güncel gizlilik açıklaması.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <Link
          to="/"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Ana sayfaya dön
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Gizlilik</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Arar Buluruz şu anda yalnız synthetic/mock ilanlarla çalışan bir V0 test sürümüdür.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-foreground">
          <section>
            <h2 className="font-semibold">Bu sürümde toplanmayan veriler</h2>
            <p className="mt-2 text-muted-foreground">
              Demo ilan oluşturma ekranına yazdığınız başlık, fiyat, konum ve açıklama ile
              seçtiğiniz yerel fotoğraf yalnız tarayıcıda geçici olarak kullanılır; uygulama bu
              içeriği sunucuya göndermez, kaydetmez veya yayınlamaz. Gerçek hesap açılmaz. Telefon,
              e-posta veya iletişim formu verisi alınmaz. Reklam ve analytics kullanılmaz. Zorunlu
              olmayan çerez veya tracker bulunmaz; bu nedenle çerez onay bandı gösterilmez.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Teknik erişim kayıtları</h2>
            <p className="mt-2 text-muted-foreground">
              Barındırma sağlayıcısı, hizmetin güvenliği ve işletilmesi amacıyla teknik erişim
              kayıtları tutabilir.
            </p>
          </section>

          <section>
            <h2 className="font-semibold">Kontrollü iletişim kanalı</h2>
            <p className="mt-2 text-muted-foreground">
              Mevcut kontrollü iletişim kanalı merkezi telefon ve WhatsApp hattıdır. V0 sayfaları bu
              kanala yazılan mesajları veya arama içeriğini toplamaz.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={PROTOTYPE_CONTACT.phoneHref}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Telefon
              </a>
              <a
                href={PROTOTYPE_CONTACT.whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                WhatsApp
              </a>
            </div>
          </section>

          <section>
            <h2 className="font-semibold">Gelecekteki değişiklikler</h2>
            <p className="mt-2 text-muted-foreground">
              Kullanıcı verisi toplamaya başlanmadan önce bu metin, gerçek veri akışını ve ilgili
              hakları açıklayacak şekilde güncellenecektir.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
