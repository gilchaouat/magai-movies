"use client";

import { useEffect, useState } from "react";
import type { Preferences, Recommendation, RecommendResult } from "@/lib/types";
import { RESULT_FILTERS } from "@/lib/config";
import ResultsClient from "./ResultsClient";

type Turn = {
  query: string;
  result: RecommendResult;
};

type BlurbMap = Record<number, { overview: string; why: string }>;

// Writing real editorial copy for several movies is the slowest step in a
// search — this is called after the movies (with plain template text) are
// already rendered, so it can take its time without blocking the first
// paint. Fails silently: the template text it's replacing is a perfectly
// fine permanent fallback, not a loading placeholder.
async function fetchBlurbs(
  query: string,
  prefsSummary: string,
  recommendations: Recommendation[]
): Promise<BlurbMap | null> {
  try {
    const res = await fetch("/api/recommend/blurbs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        prefsSummary,
        movies: recommendations.map((m) => ({
          id: m.id,
          title: m.title,
          overview: m.overview,
          year: m.year,
          runtime: m.runtime,
          rating: m.rating,
          genres: m.genres,
        })),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.blurbs as BlurbMap) ?? null;
  } catch {
    return null;
  }
}

export default function Conversation({
  initialQuery,
  initialResult,
  aiConfigured,
}: {
  initialQuery: string;
  initialResult: RecommendResult;
  aiConfigured: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([{ query: initialQuery, result: initialResult }]);
  const [followUp, setFollowUp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which result-filter chip is active right now — folded into the next
  // follow-up message so "דרמה" + "רק 2024-2026" combines without retyping
  // the genre, while the filter itself stays an instant, free, local filter.
  const [activeFilterGenreId, setActiveFilterGenreId] = useState<number | null>(null);

  function applyBlurbs(turnQuery: string, blurbs: BlurbMap) {
    setTurns((current) =>
      current.map((turn) => {
        if (turn.query !== turnQuery) return turn;
        return {
          ...turn,
          result: {
            ...turn.result,
            recommendations: turn.result.recommendations.map((m) => {
              const blurb = blurbs[m.id];
              return blurb ? { ...m, overview: blurb.overview, whyItMatches: blurb.why } : m;
            }),
          },
        };
      })
    );
  }

  // The server-rendered first turn's posters/details are already on screen —
  // fetch its richer AI descriptions now instead of having made the whole
  // page wait on them.
  useEffect(() => {
    if (!initialResult.blurbsPending) return;
    fetchBlurbs(initialQuery, initialResult.prefsSummary, initialResult.recommendations).then(
      (blurbs) => {
        if (blurbs && Object.keys(blurbs).length) applyBlurbs(initialQuery, blurbs);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runQuery(
    text: string,
    previousPreferences: Preferences | null
  ): Promise<boolean> {
    if (!text || pending) return false;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text, previousPreferences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "שגיאה בלתי צפויה");
      const result = data as RecommendResult;
      const newTurn: Turn = { query: text, result };
      // Re-running an earlier query moves it to the end instead of appearing
      // twice in the history log.
      setTurns((t) => [...t.filter((turn) => turn.query !== text), newTurn]);
      // The new grid starts unfiltered ("הכול"), so forget the old selection.
      setActiveFilterGenreId(null);
      if (result.blurbsPending) {
        fetchBlurbs(text, result.prefsSummary, result.recommendations).then((blurbs) => {
          if (blurbs && Object.keys(blurbs).length) applyBlurbs(text, blurbs);
        });
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בלתי צפויה. נסו שוב.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = followUp.trim();
    if (!text) return;
    // Only fold in a label when a specific filter is active — "הכול" itself
    // (genreId: null, the default) isn't a real qualifier worth prepending.
    const activeFilterLabel =
      activeFilterGenreId !== null
        ? RESULT_FILTERS.find((f) => f.genreId === activeFilterGenreId)?.label
        : null;
    const effectiveText = activeFilterLabel ? `${activeFilterLabel}, ${text}` : text;
    const ok = await runQuery(effectiveText, turns[turns.length - 1].result.preferences);
    if (ok) setFollowUp("");
  }

  function handleHistoryClick(query: string) {
    // Clicking an earlier question is a clean restart on that topic, not a
    // refinement of whatever is currently showing.
    runQuery(query, null);
  }

  const latestTurn = turns[turns.length - 1];

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-stretch gap-3 rounded-2xl bg-white p-2.5 shadow-lg shadow-black/5 ring-1 ring-black/5 sm:flex-row"
      >
        <input
          type="text"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          placeholder="המשך לשוחח... למשל: קצת יותר קליל, או תראה לי עוד כאלה"
          disabled={pending}
          autoComplete="off"
          dir="rtl"
          className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3.5 text-base text-ink placeholder:text-ink/40 outline-none disabled:opacity-60 sm:text-lg"
        />
        <button
          type="submit"
          disabled={pending || !followUp.trim()}
          className="shrink-0 rounded-xl bg-accent px-6 py-3.5 text-base font-bold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
        >
          {pending ? "חושב..." : "שלח"}
        </button>
      </form>
      {error && <p className="text-center text-sm text-accent">{error}</p>}

      {turns.length > 1 && (
        <div className="flex flex-wrap justify-end gap-2">
          {turns.map((turn, i) => {
            const isCurrent = i === turns.length - 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleHistoryClick(turn.query)}
                disabled={pending}
                aria-pressed={isCurrent}
                className={`rounded-2xl rounded-tl-sm px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCurrent
                    ? "bg-accent text-white"
                    : "bg-ink text-white hover:bg-ink/80"
                }`}
              >
                {turn.query}
              </button>
            );
          })}
        </div>
      )}

      {!latestTurn.result.usedAI && (
        <p className="text-center text-xs text-ink/40">
          {aiConfigured
            ? "מנוע ה-AI לא היה זמין כרגע, כך שההמלצות מבוססות על חיפוש חכם ב-TMDB בלבד."
            : "לא הוגדר מפתח AI (Anthropic/OpenAI) — ההמלצות מבוססות על חיפוש חכם ב-TMDB בלבד."}
        </p>
      )}
      {latestTurn.result.relaxedSearch && (
        <p className="text-center text-xs text-ink/40">
          לא נמצאו הרבה סרטים שמתאימים בול לבקשה, אז הרחבנו קצת את החיפוש.
        </p>
      )}
      {latestTurn.result.recommendations.length === 0 ? (
        <p className="text-center text-ink/50">לא מצאתי סרטים מתאימים לבקשה הזו.</p>
      ) : (
        <ResultsClient
          key={turns.length}
          recommendations={latestTurn.result.recommendations}
          onFilterChange={setActiveFilterGenreId}
        />
      )}
    </div>
  );
}
