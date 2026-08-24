import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: [
      { title: "Gizlilik — Arar Buluruz" },
      { name: "description", content: "Arar Buluruz ilan, iletişim ve teknik erişim verisi sınırlarının kısa açıklaması." },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <Link to="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">Ana sayfaya dön</Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Gizlilik</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Arar Buluruz hesap açmadan ilan keşfi, kurucu moderasyonu ve satıcıyla doğrudan iletişim modeliyle çalışır.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-6 text-foreground">
          <section>
            <h2 className="font-semibold">İlan ve iletişim bilgileri</h2>
            <p className="mt-2 text-muted-foreground">
              Yayındaki bir ilanda başlık, açıklama, fiyat, konum, satıcı görünen adı, fotoğraflar ve seçilen telefon veya WhatsApp iletişim bilgisi gösterilebilir. İlanlar yayın öncesinde kurucu tarafından incelenir; kullanıcı hesabı veya satıcı paneli bulunmaz.
            </p>
          </section>
          <section>
            <h2 className="font-semibold">İlan başvurusu</h2>
            <p className="mt-2 text-muted-foreground">
              İlan başvurusu için uygulama içi hesap açılmaz. Başvuru iletişim bağlantısı üzerinden başlatıldığında mesajlaşma ilgili dış iletişim hizmetinde gerçekleşir; Arar Buluruz uygulaması mesaj içeriğini kendi içinde toplamaz.
            </p>
          </section>
          <section>
            <h2 className="font-semibold">Teknik erişim kayıtları</h2>
            <p className="mt-2 text-muted-foreground">
              Barındırma sağlayıcısı, hizmetin güvenliği ve işletilmesi amacıyla teknik erişim kayıtları tutabilir. Reklam, davranışsal analytics ve zorunlu olmayan tracker kullanılmaz.
            </p>
          </section>
          <section>
            <h2 className="font-semibold">İletişim ve değişiklikler</h2>
            <p className="mt-2 text-muted-foreground">
              Veri akışı veya ürün kapsamı değişirse bu açıklama da güncel çalışma biçimini yansıtacak şekilde güncellenir.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
