import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";

type PublisherSection = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

type PublisherInfoPageProps = {
  title: string;
  intro: string;
  sections: readonly PublisherSection[];
};

export function PublisherInfoPage({ title, intro, sections }: PublisherInfoPageProps) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
          <p className="mt-4 leading-7 text-muted-foreground">{intro}</p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 leading-7 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <p className="mt-10 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
            Bu sayfa hizmetin kalıcı çalışma sınırlarını açıklar. Üstteki faz bildirimi, bugün hangi
            işlevlerin gerçekten açık olduğunu gösterir.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Ana sayfaya dön
          </Link>
        </article>
      </main>
    </div>
  );
}
