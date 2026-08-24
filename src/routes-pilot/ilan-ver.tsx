import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { buildPilotIntakeWhatsAppHref, isPilotIntakeConfigured } from "@/lib/pilot-intake";
import { PILOT_DISTRICT, PILOT_PROVINCE } from "@/lib/pilot-operator-contract";

export const Route = createFileRoute("/ilan-ver")({
  head: () => ({
    meta: [
      { title: "İlan Başvurusu — Arar Buluruz" },
      { name: "description", content: "Çorlu pilotunda ilan başvurusu WhatsApp üzerinden alınır ve kurucu tarafından manuel olarak incelenir." },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: PilotApplicationForm,
});

const fieldClass = "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary";

function PilotApplicationForm() {
  const [sellerDisplayName, setSellerDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const intakeE164 = import.meta.env.VITE_PILOT_INTAKE_E164 as string | undefined;
  const intakeConfigured = isPilotIntakeConfigured(intakeE164);

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">İlan Başvurusu</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Çorlu pilotunda başvurular WhatsApp üzerinden alınır. İlan kurucu tarafından incelenir, güvenli fotoğraf akışından geçirilir ve ancak onaydan sonra yayınlanır.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-accent/40 p-3 text-sm">
          <p className="font-semibold">Pilot konumu: {PILOT_PROVINCE} / {PILOT_DISTRICT}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Fotoğrafları WhatsApp görüşmesinde paylaşabilirsiniz. Orijinal dosyalar doğrudan public Storage’a alınmaz; kurucu yayın öncesinde sanitize edilmiş WebP kopyasını yükler.
          </p>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            const message = [
              "Merhaba, Arar Buluruz Çorlu pilotu için ilan başvurusu yapmak istiyorum.",
              "",
              `İlanda görünecek ad: ${sellerDisplayName.trim()}`,
              `Başlık: ${title.trim()}`,
              `Fiyat: ${price.trim()} TL`,
              `Konum: ${PILOT_PROVINCE} / ${PILOT_DISTRICT}`,
              `Açıklama: ${description.trim()}`,
            ].join("\n");
            const href = buildPilotIntakeWhatsAppHref(intakeE164 ?? "", message);
            if (!href) {
              setError("İlan başvuru hattı bu ortamda henüz etkin değil.");
              return;
            }
            window.location.href = href;
          }}
        >
          <label className="block">
            <span className="text-sm font-medium">İlanda görünecek ad</span>
            <input required minLength={2} maxLength={80} value={sellerDisplayName} onChange={(event) => setSellerDisplayName(event.target.value)} placeholder="Ad veya işletme adı" className={`mt-1 ${fieldClass}`} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Başlık</span>
            <input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Kısa ve net yaz" className={`mt-1 ${fieldClass}`} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Fiyat (TL)</span>
            <input required type="number" min="0" step="0.01" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" className={`mt-1 ${fieldClass}`} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Açıklama</span>
            <textarea required minLength={10} maxLength={5000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ürünün durumu, teslim şekli ve önemli ayrıntılar" className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary" />
          </label>
          <button type="submit" disabled={!intakeConfigured} className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
            WhatsApp ile başvur
          </button>
          <p className="text-center text-xs text-muted-foreground">Başvuru ilanı otomatik yayınlamaz. İletişim kontrolü, fotoğraf işleme ve yayın işlemi kurucu tarafından ayrı ayrı tamamlanır.</p>
        </form>

        <div className="mt-6 text-center">
          <Link to="/ilan-kurallari" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">İlan kurallarını görüntüle</Link>
        </div>
      </main>
    </div>
  );
}
