import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { isPilotReleaseCandidate } from "@/lib/product-phase";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: isPilotReleaseCandidate
      ? [
          { title: "Gizlilik — Arar Buluruz" },
          {
            name: "description",
            content:
              "Arar Buluruz ilan, iletişim ve teknik erişim verisi sınırlarının kısa açıklaması.",
          },
        ]
      : [
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
  return isPilotReleaseCandidate ? <PilotPrivacyPage /> : <V0PrivacyPage />;
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <Link
          to="/"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Ana sayfaya dön
        </Link>
        {children}
      </article>
    </main>
  );
}

function PilotPrivacyPage() {
  return (
    <PageShell>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Gizlilik</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Arar Buluruz hesap açmadan ilan keşfi, kurucu moderasyonu ve satıcıyla doğrudan iletişim
        modeliyle çalışır.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-foreground">
        <section>
          <h2 className="font-semibold">İlan ve iletişim bilgileri</h2>
          <p className="mt-2 text-muted-foreground">
            Yayındaki bir ilanda başlık, açıklama, fiyat, konum, satıcı görünen adı, fotoğraflar ve
            seçilen telefon veya WhatsApp iletişim bilgisi gösterilebilir. İlanlar yayın öncesinde
            kurucu tarafından incelenir; kullanıcı hesabı veya satıcı paneli bulunmaz.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">İlan başvurusu</h2>
          <p className="mt-2 text-muted-foreground">
            İlan başvurusu için uygulama içi hesap açılmaz. Başvuru iletişim bağlantısı üzerinden
            başlatıldığında mesajlaşma ilgili dış iletişim hizmetinde gerçekleşir; Arar Buluruz
            uygulaması mesaj içeriğini kendi içinde toplamaz.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Teknik erişim kayıtları</h2>
          <p className="mt-2 text-muted-foreground">
            Barındırma sağlayıcısı, hizmetin güvenliği ve işletilmesi amacıyla teknik erişim
            kayıtları tutabilir. Reklam, davranışsal analytics ve zorunlu olmayan tracker
            kullanılmaz.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">İletişim ve değişiklikler</h2>
          <p className="mt-2 text-muted-foreground">
            Veri akışı veya ürün kapsamı değişirse bu açıklama da güncel çalışma biçimini yansıtacak
            şekilde güncellenir.
          </p>
        </section>
      </div>
    </PageShell>
  );
}

function V0PrivacyPage() {
  return (
    <PageShell>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Gizlilik</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Arar Buluruz şu anda yalnız synthetic/mock ilanlarla çalışan bir V0 test sürümüdür.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-foreground">
        <section>
          <h2 className="font-semibold">Bu sürümde toplanmayan veriler</h2>
          <p className="mt-2 text-muted-foreground">
            Demo ilan oluşturma ekranına yazdığınız başlık, fiyat, konum ve açıklama ile seçtiğiniz
            yerel fotoğraf yalnız tarayıcıda geçici olarak kullanılır; uygulama bu içeriği sunucuya
            göndermez, kaydetmez veya yayınlamaz. Gerçek hesap açılmaz. Telefon, e-posta veya
            iletişim formu verisi alınmaz. Reklam ve analytics kullanılmaz. Zorunlu olmayan çerez
            veya tracker bulunmaz; bu nedenle çerez onay bandı gösterilmez.
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
          <h2 className="font-semibold">İletişim</h2>
          <p className="mt-2 text-muted-foreground">
            Bu V0 sürümünde gerçek telefon veya WhatsApp iletişim hattı yayımlanmaz ve uygulama
            iletişim mesajı toplamaz. Gerçek iletişim modeli, kişisel veri akışı açılmadan önce
            ayrıca belirlenip bu metne yansıtılacaktır.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Gelecekteki değişiklikler</h2>
          <p className="mt-2 text-muted-foreground">
            Kullanıcı verisi toplamaya başlanmadan önce bu metin, gerçek veri akışını ve ilgili
            hakları açıklayacak şekilde güncellenecektir.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
