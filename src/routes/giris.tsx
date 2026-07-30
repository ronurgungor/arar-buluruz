import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/giris")({
  head: () => ({
    meta: [
      { title: "Giriş — Arar Buluruz" },
      {
        name: "description",
        content: "İlk kontrollü pilotta kullanıcı girişi ve hesap yönetimi bulunmaz.",
      },
      { property: "og:title", content: "Giriş — Arar Buluruz" },
      {
        property: "og:description",
        content: "İlk kontrollü pilotta kullanıcı girişi bulunmaz.",
      },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-sm px-4 pb-16">
        <h1 className="mt-10 text-2xl font-extrabold tracking-tight">Giriş</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold text-foreground">Pilot sürecinde giriş bulunmuyor.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            İlk Çorlu pilotunda alıcı veya satıcı hesabı, SMS kodu ve ilan yönetim paneli açılmadı.
            İlan başvuruları merkezi WhatsApp hattı üzerinden alınır ve kurucu tarafından manuel
            olarak incelenir.
          </p>
          <Link
            to="/ilan-ver"
            className="mt-5 flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            İlan başvurusu yap
          </Link>
          <Link
            to="/"
            className="mt-3 flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    </div>
  );
}
