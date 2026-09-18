import { Suspense } from "react";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import HomeSearchBar from "@/components/HomeSearchBar";
import Conversation from "@/components/Conversation";
import TasteSummary from "@/components/TasteSummary";
import { getRecommendations } from "@/lib/recommend";
import { TmdbConfigError } from "@/lib/tmdb";
import { activeAiProvider } from "@/lib/ai";
import { TASTE_COOKIE, decodeProfile } from "@/lib/taste";

function hasMeaningfulTaste(profile: ReturnType<typeof decodeProfile>): boolean {
  return !!(
    profile.customTaste.trim() ||
    profile.liked.length > 0 ||
    Object.keys(profile.likedGenres).length > 0
  );
}

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

  // Whether to show onboarding copy vs. a "ready to go" homepage depends on
  // whether taste exists yet, not on whether a search is in progress — a
  // returning visitor who hasn't searched *this* visit still has taste, so
  // shouldn't see "let's meet your taste" again. No auto-redirect into a
  // search here: that used to force the ~20-30s AI+TMDB round trip to finish
  // before anything could render, which showed as a long blank screen.
  const cookieStore = await cookies();
  const profile = decodeProfile(cookieStore.get(TASTE_COOKIE)?.value);
  const hasTaste = hasMeaningfulTaste(profile);

  return (
    <main className="flex-1">
      <section className="px-6 pb-14 pt-20 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-accent">
            MAGAI Movies
          </p>
          {!hasTaste ? (
            <>
              <h1 className="font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
                קודם כל, בואו נכיר את הטעם שלך
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-ink/60">
                זה הבסיס שממנו הכול מתחיל. כל חיפוש שתבצעו — עכשיו ובכל פעם אחרת — הוא רק עידון
                של הטעם הזה, ותמיד מבוסס עליו.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
                מה נראה הערב?
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-ink/60">
                הטעם שלכם כבר כאן ומוכן — תכתבו בקשה ספציפית, או תנו לנו למצוא לפי הטעם.
              </p>
            </>
          )}
        </div>
        <TasteSummary defaultOpen={!q} />
        {!q && (
          <div className="mt-8">
            <HomeSearchBar />
          </div>
        )}
      </section>

      {q && (
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-6xl">
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

  const cookieStore = await cookies();
  const profile = decodeProfile(cookieStore.get(TASTE_COOKIE)?.value);

  let result;
  try {
    result = await getRecommendations(query, profile);
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
    <Conversation
      initialQuery={query}
      initialResult={result}
      aiConfigured={!!activeAiProvider()}
    />
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

// A real search takes ~20-30 seconds (an AI call to understand the request,
// a TMDB search, fetching posters/trailers, a second AI call to write
// descriptions) — a plain spinner reads as stuck that long, so this sets a
// time expectation and shows visible, ongoing progress instead.
function ResultsSkeleton() {
  return (
    <div className="mx-auto max-w-md py-14 text-center">
      <div className="mx-auto mb-4 h-[3px] w-full overflow-hidden rounded-full bg-paper-dim">
        <div className="h-full w-2/5 animate-sweep rounded-full bg-gradient-to-r from-transparent via-accent to-transparent" />
      </div>
      <p className="text-sm text-ink/50">
        מרכיבים בשבילך המלצות מדויקות · <span className="font-bold text-ink">כ-20 שניות</span>
      </p>
    </div>
  );
}
