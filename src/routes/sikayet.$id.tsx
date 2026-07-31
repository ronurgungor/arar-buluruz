import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { buildControlledWhatsAppHref } from "@/lib/prototype-contact";

export const Route = createFileRoute("/sikayet/$id")({
  head: () => ({
    meta: [
      { title: "Şikâyet demosu — Arar Buluruz" },
      {
        name: "description",
        content: "V0 test sürümünde gerçek şikâyet veya moderasyon işlemi yapılmaz.",
      },
      { property: "og:title", content: "Şikâyet demosu — Arar Buluruz" },
      {
        property: "og:description",
        content: "V0 test sürümünde moderasyon işlemi kapalıdır.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Report,
});

const reasons = ["Yanıltıcı ilan", "Yasak ürün", "Yanlış fiyat", "Sahte satıcı", "Diğer"];
const gate1TestOperationsEnabled =
  import.meta.env.VITE_GATE1_TEST_OPERATIONS === "enabled";

function Report() {
  if (gate1TestOperationsEnabled) return <Gate1ComplaintForm />;

  const { id } = Route.useParams();

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Şikâyet demosu</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold text-foreground">Gerçek şikâyet işlemi bu fazda kapalı.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            V0 moderasyonun sürdürülebilirliğini doğrulamaz. İlan ID’si {id} için herhangi bir kayıt,
            WhatsApp bildirimi veya kişisel veri işleme yapılmaz.
          </p>
          <Link
            to="/ilan/$id"
            params={{ id }}
            className="mt-5 flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            İlana dön
          </Link>
        </div>
      </main>
    </div>
  );
}

function Gate1ComplaintForm() {
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
