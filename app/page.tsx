import { Suspense } from "react";
import type { Metadata } from "next";
import PromptForm from "@/components/PromptForm";
import ResultsClient from "@/components/ResultsClient";
import { getRecommendations } from "@/lib/recommend";
import { TmdbConfigError } from "@/lib/tmdb";
import { activeAiProvider } from "@/lib/ai";

type SearchParams = Promise<{ q?: string | string[] }>;

function normalizeQuery(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const q = normalizeQuery((await searchParams).q);
  if (!q) {
    return {
      title: "MAGAI Movies — מה נראה הערב?",
      description: "כתוב מה בא לך לראות — ונבנה לך רשימה אישית.",
    };
  }
  return {
    title: q,
    description: `המלצות סרטים אישיות עבור: "${q}"`,
    openGraph: {
      title: `${q} — MAGAI Movies`,
      description: `המלצות סרטים אישיות שנבנו במיוחד עבור: "${q}"`,
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = normalizeQuery((await searchParams).q);

  return (
    <main className="flex-1">
      <section className="px-6 pb-14 pt-20 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-accent">
            MAGAI Movies
          </p>
          <h1 className="font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
            מה נראה הערב?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink/60">
            כתוב מה בא לך לראות — ונבנה לך רשימה אישית.
          </p>
        </div>
        <div className="mt-10">
          <PromptForm initialQuery={q} />
        </div>
      </section>

      {q && (
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink sm:text-3xl">
              הרשימה שנבנתה בשבילך
            </h2>
            <Suspense fallback={<ResultsSkeleton />}>
              <Results query={q} />
            </Suspense>
          </div>
        </section>
      )}
    </main>
  );
}

async function Results({ query }: { query: string }) {
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_ACCESS_TOKEN) {
    return (
      <ErrorState
        title="חסר מפתח TMDB"
        message="כדי להציג המלצות אמיתיות, יש להגדיר את משתנה הסביבה TMDB_API_KEY (או TMDB_ACCESS_TOKEN)."
      />
    );
  }

  let result;
  try {
    result = await getRecommendations(query);
  } catch (err) {
    if (err instanceof TmdbConfigError) {
      return <ErrorState title="חסר מפתח TMDB" message={err.message} />;
    }
    return (
      <ErrorState
        title="לא הצלחנו לבנות המלצות כרגע"
        message={err instanceof Error ? err.message : "שגיאה לא צפויה. נסו שוב בעוד רגע."}
      />
    );
  }

  if (!result.recommendations.length) {
    return (
      <ErrorState
        title="לא מצאנו סרטים מתאימים"
        message="נסו לנסח את הבקשה קצת אחרת, למשל בלי הגבלת זמן או ז'אנר ספציפי."
      />
    );
  }

  return (
    <>
      {!result.usedAI && (
        <p className="mb-6 text-center text-xs text-ink/40">
          {activeAiProvider()
            ? "מנוע ה-AI לא היה זמין כרגע, כך שההמלצות מבוססות על חיפוש חכם ב-TMDB בלבד."
            : "לא הוגדר מפתח AI (Anthropic/OpenAI) — ההמלצות מבוססות על חיפוש חכם ב-TMDB בלבד."}
        </p>
      )}
      <ResultsClient recommendations={result.recommendations} />
    </>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
      <p className="text-lg font-bold text-accent">{title}</p>
      <p className="mt-2 text-sm text-ink/60">{message}</p>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-md shadow-black/5 ring-1 ring-black/5"
        >
          <div className="aspect-[2/3] w-full bg-paper-dim" />
          <div className="space-y-2 p-5">
            <div className="h-4 w-3/4 rounded bg-paper-dim" />
            <div className="h-3 w-1/2 rounded bg-paper-dim" />
            <div className="h-16 rounded bg-paper-dim" />
          </div>
        </div>
      ))}
    </div>
  );
}
