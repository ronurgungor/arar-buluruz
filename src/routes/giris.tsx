import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";

const publicPilotRcRuntime = import.meta.env.VITE_ARAR_BUILD_SIGNATURE === "pilot-rc|listings=supabase|gate1=off|operator=off";

export const Route = createFileRoute("/giris")({
  beforeLoad: () => {
    if (publicPilotRcRuntime) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Giriş — Arar Buluruz" },
      {
        name: "description",
        content: "Bu sürümde kullanıcı hesabı veya giriş işlemi bulunmaz.",
      },
      { property: "og:title", content: "Giriş — Arar Buluruz" },
      {
        property: "og:description",
        content: "Bu sürümde hesap açma veya giriş işlemi yapılmaz.",
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
            V0, kullanıcıların hesap açacağını veya ilanlarını yöneteceğini doğrulamaz. E-posta,
            telefon, parola ya da başka kişisel veri toplanmaz.
          </p>
          <Link
            to="/"
            className="mt-5 flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    </div>
  );
}
