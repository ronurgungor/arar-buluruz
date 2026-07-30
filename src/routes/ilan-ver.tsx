import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { cities } from "@/data/listings";
import { buildControlledWhatsAppHref } from "@/lib/prototype-contact";

export const Route = createFileRoute("/ilan-ver")({
  head: () => ({
    meta: [
      { title: "İlan başvurusu — Arar Buluruz" },
      {
        name: "description",
        content: "İlan bilgilerini kontrollü Arar Buluruz WhatsApp hattına gönder.",
      },
      { property: "og:title", content: "İlan başvurusu — Arar Buluruz" },
      {
        property: "og:description",
        content: "Pilot ilan başvurunu merkezi WhatsApp hattına ilet.",
      },
    ],
  }),
  component: PostListing,
});

const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary";

function PostListing() {
  const [sellerDisplayName, setSellerDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("Tekirdağ");
  const [district, setDistrict] = useState("Çorlu");
  const [description, setDescription] = useState("");

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">İlan Başvurusu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilot sürecinde başvurular merkezi WhatsApp hattında incelenir. Bu form veritabanına kayıt
          yazmaz.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            const message = [
              "Merhaba, Arar Buluruz için ilan başvurusu yapmak istiyorum.",
              "",
              `İlanda görünecek ad: ${sellerDisplayName.trim()}`,
              `Başlık: ${title.trim()}`,
              `Fiyat: ${price.trim()} TL`,
              `Konum: ${city} / ${district.trim()}`,
              `Açıklama: ${description.trim()}`,
            ].join("\n");

            window.location.href = buildControlledWhatsAppHref(message);
          }}
        >
          <div>
            <span className="text-sm font-medium">Fotoğraflar</span>
            <div className="mt-1 grid grid-cols-4 gap-2" aria-hidden>
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-muted-foreground"
                >
                  <Plus className="h-5 w-5" />
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Fotoğraf yükleme ilk pilotta kapalıdır; başvuru mesajına fotoğraf eklemeyin.
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium">İlanda görünecek ad</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={sellerDisplayName}
              onChange={(event) => setSellerDisplayName(event.target.value)}
              placeholder="Ad veya işletme adı"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Başlık</span>
            <input
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Kısa ve net yaz"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Fiyat (TL)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">İl</span>
            <select
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={`mt-1 ${fieldClass}`}
            >
              {cities.slice(1).map((province) => (
                <option key={province}>{province}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">İlçe</span>
            <input
              required
              minLength={2}
              maxLength={64}
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Çorlu"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Açıklama</span>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ürünün durumu, teslim şekli ve önemli ayrıntılar"
              className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground hover:bg-primary/90"
          >
            WhatsApp ile başvur
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Gönderimden sonra ilan otomatik yayınlanmaz; kurallara uygunluğu manuel olarak incelenir.
          </p>
        </form>
      </main>
    </div>
  );
}
