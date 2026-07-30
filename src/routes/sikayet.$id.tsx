import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { buildControlledWhatsAppHref } from "@/lib/prototype-contact";

export const Route = createFileRoute("/sikayet/$id")({
  head: () => ({
    meta: [
      { title: "İlanı şikâyet et — Arar Buluruz" },
      { name: "description", content: "Kurallara aykırı ilanları merkezi hatta bildir." },
      { property: "og:title", content: "İlanı şikâyet et — Arar Buluruz" },
      { property: "og:description", content: "Kurallara aykırı ilanları bildir." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Report,
});

const reasons = ["Yanıltıcı ilan", "Yasak ürün", "Yanlış fiyat", "Sahte satıcı", "Diğer"];

function Report() {
  const { id } = Route.useParams();
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Şikâyet Et</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bildirim, ilan ID’siyle birlikte merkezi WhatsApp hattına gider. Veritabanına public kayıt
          yazılmaz.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            const message = [
              "Merhaba, Arar Buluruz ilan şikâyeti bildirmek istiyorum.",
              "",
              `İlan ID: ${id}`,
              `Sebep: ${reason}`,
              `Açıklama: ${details.trim() || "Ek açıklama yok"}`,
            ].join("\n");

            window.location.href = buildControlledWhatsAppHref(message);
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Sebep</legend>
            {reasons.map((item) => (
              <label
                key={item}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
              >
                <input
                  type="radio"
                  name="reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                {item}
              </label>
            ))}
          </fieldset>
          <textarea
            rows={4}
            maxLength={1000}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Kısa açıklama (isteğe bağlı)"
            className="w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
          />
          <button className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90">
            WhatsApp ile bildir
          </button>
        </form>

        <Link
          to="/ilan/$id"
          params={{ id }}
          className="mt-5 inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          İlana dön
        </Link>
      </main>
    </div>
  );
}
