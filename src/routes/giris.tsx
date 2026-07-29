import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/giris")({
  head: () => ({
    meta: [
      { title: "Giriş ve profil — Arar Buluruz" },
      {
        name: "description",
        content: "Telefon numaranla giriş yap, ilanlarını tek yerden yönet.",
      },
      { property: "og:title", content: "Giriş ve profil — Arar Buluruz" },
      { property: "og:description", content: "İlanlarını yönetmek için giriş yap." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-sm px-4 pb-16">
        <h1 className="mt-10 text-2xl font-extrabold tracking-tight">Giriş yap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          İlanlarını yönetmek için telefon numaran yeterli.
        </p>

        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <input
            placeholder="05xx xxx xx xx"
            inputMode="tel"
            aria-label="Telefon numarası"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary"
          />
          <button className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90">
            Kod gönder
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Prototip — gerçek kayıt yapılmaz.
          </p>
        </form>

        {sent && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-muted px-3 py-2 text-center text-xs text-muted-foreground"
          >
            Kod gönderilmedi; giriş bu prototipte devre dışı.
          </p>
        )}
      </main>
    </div>
  );
}
