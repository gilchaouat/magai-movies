"use client";

import { useState } from "react";
import type { RecommendResult } from "@/lib/types";
import { readTasteProfile } from "@/lib/tasteClient";
import ResultsClient from "./ResultsClient";

type Turn = {
  query: string;
  result: RecommendResult;
  initialLikedIds: number[];
  initialDislikedIds: number[];
};

export default function Conversation({
  initialQuery,
  initialResult,
  initialLikedIds,
  initialDislikedIds,
  aiConfigured,
}: {
  initialQuery: string;
  initialResult: RecommendResult;
  initialLikedIds: number[];
  initialDislikedIds: number[];
  aiConfigured: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([
    { query: initialQuery, result: initialResult, initialLikedIds, initialDislikedIds },
  ]);
  const [followUp, setFollowUp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = followUp.trim();
    if (!text || pending) return;
    setPending(true);
    setError(null);
    try {
      const lastTurn = turns[turns.length - 1];
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text, previousPreferences: lastTurn.result.preferences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "שגיאה בלתי צפויה");
      const result = data as RecommendResult;
      const profile = readTasteProfile();
      setTurns((t) => [
        ...t,
        {
          query: text,
          result,
          initialLikedIds: profile.liked.map((e) => e.id),
          initialDislikedIds: profile.disliked.map((e) => e.id),
        },
      ]);
      setFollowUp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בלתי צפויה. נסו שוב.");
    } finally {
      setPending(false);
    }
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
          {turns.map((turn, i) => (
            <p
              key={i}
              className="rounded-2xl rounded-tl-sm bg-ink px-4 py-2 text-sm text-white"
            >
              {turn.query}
            </p>
          ))}
        </div>
      )}

      {!latestTurn.result.usedAI && (
        <p className="text-center text-xs text-ink/40">
          {aiConfigured
            ? "מנוע ה-AI לא היה זמין כרגע, כך שההמלצות מבוססות על חיפוש חכם ב-TMDB בלבד."
            : "לא הוגדר מפתח AI (Anthropic/OpenAI) — ההמלצות מבוססות על חיפוש חכם ב-TMDB בלבד."}
        </p>
      )}

      {latestTurn.result.recommendations.length === 0 ? (
        <p className="text-center text-ink/50">לא מצאתי סרטים מתאימים לבקשה הזו.</p>
      ) : (
        <ResultsClient
          key={turns.length}
          recommendations={latestTurn.result.recommendations}
          initialLikedIds={latestTurn.initialLikedIds}
          initialDislikedIds={latestTurn.initialDislikedIds}
        />
      )}
    </div>
  );
}
