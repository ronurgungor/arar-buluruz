import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { locationCities } from "@/data/turkiye-locations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arar Buluruz — Çorlu pilotu" },
      { name: "description", content: "Çorlu pilotunda yayındaki ilanları ara ve satıcıyla doğrudan iletişime geç." },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { property: "og:title", content: "Arar Buluruz — Çorlu pilotu" },
      { property: "og:description", content: "Çorlu pilotunda yayındaki ilanları ara ve satıcıyla doğrudan iletişime geç." },
    ],
  }),
  component: Home,
});

const infoLinks = [
  { to: "/nasil-calisir", label: "Nasıl Çalışır" },
  { to: "/ilan-kurallari", label: "İlan Kuralları" },
  { to: "/guvenli-kullanim", label: "Güvenli Kullanım" },
  { to: "/gizlilik", label: "Gizlilik" },
] as const;

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Tüm Türkiye");

  return (
    <main className="flex min-h-screen flex-col px-4">
      <div className="mx-auto flex w-full max-w-xl justify-end gap-2 py-4">
        <Link
          to="/ilan-ver"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          İlan Başvurusu
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center pb-24">
        <h1 className="text-center"><Wordmark size="lg" /></h1>
        <p className="mt-3 text-center text-base text-muted-foreground">Ne arıyorsan yaz, gerisini biz bulalım.</p>

        <form
          className="mt-8 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void navigate({ to: "/ara", search: { q, il: city, sirala: "yeni" } });
          }}
        >
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Ne arıyorsun?"
              aria-label="Ne arıyorsun?"
              className="h-16 w-full rounded-full border border-border bg-card pl-13 pr-5 text-lg shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              aria-label="Konum"
              className="h-12 w-full min-w-0 rounded-full border border-border bg-card px-4 text-sm font-medium outline-none focus:border-primary"
            >
              {locationCities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button type="submit" className="h-12 shrink-0 rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
              Ara
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">Hedefimiz: ilan vermek her zaman ücretsiz.</p>
        <nav aria-label="Arar Buluruz bilgi ve kuralları" className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {infoLinks.map((item) => (
            <Link key={item.to} to={item.to} className="inline-flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4 hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
