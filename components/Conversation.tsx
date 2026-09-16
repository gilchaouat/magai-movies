"use client";

import { useState } from "react";
import type { RecommendResult } from "@/lib/types";
import { readTasteProfile } from "@/lib/tasteClient";
import { topLikedGenreLabels } from "@/lib/taste";
import ResultsClient from "./ResultsClient";

type Turn = {
  query: string;
  result: RecommendResult;
  initialLikedIds: number[];
  initialDislikedIds: number[];
  tasteLabels: string[];
};

export default function Conversation({
  initialQuery,
  initialResult,
  initialLikedIds,
  initialDislikedIds,
  initialTasteLabels,
  aiConfigured,
}: {
  initialQuery: string;
  initialResult: RecommendResult;
  initialLikedIds: number[];
  initialDislikedIds: number[];
  initialTasteLabels: string[];
  aiConfigured: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([
    {
      query: initialQuery,
      result: initialResult,
      initialLikedIds,
      initialDislikedIds,
      tasteLabels: initialTasteLabels,
    },
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
          tasteLabels: result.usedTasteDefault ? topLikedGenreLabels(profile) : [],
        },
      ]);
      setFollowUp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בלתי צפויה. נסו שוב.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-10">
      {turns.map((turn, i) => (
        <TurnView key={i} turn={turn} isFirst={i === 0} aiConfigured={aiConfigured} />
      ))}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-lg shadow-black/5 ring-1 ring-black/5 sm:flex-row"
      >
        <input
          type="text"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          placeholder="המשך לשוחח... למשל: קצת יותר קליל, או תראה לי עוד כאלה"
          disabled={pending}
          dir="rtl"
          className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink/40 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || !followUp.trim()}
          className="shrink-0 rounded-xl bg-accent px-6 py-3 text-base font-bold text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          {pending ? "חושב..." : "שלח"}
        </button>
      </form>
      {error && <p className="text-center text-sm text-accent">{error}</p>}
    </div>
  );
}

function TurnView({
  turn,
  isFirst,
  aiConfigured,
}: {
  turn: Turn;
  isFirst: boolean;
  aiConfigured: boolean;
}) {
  return (
    <div>
      {!isFirst && (
        <div className="mb-4 flex justify-end">
          <p className="max-w-md rounded-2xl rounded-tl-sm bg-ink px-4 py-2.5 text-sm text-white">
            {turn.query}
          </p>
        </div>
      )}

      <div className="mb-6 flex justify-start">
        <div className="max-w-lg rounded-2xl rounded-tr-sm bg-accent/10 px-4 py-2.5 text-sm text-ink">
          <p>{turn.result.preferences.assistantReply}</p>
          {turn.tasteLabels.length > 0 && (
            <p className="mt-1 text-xs text-ink/50">
              בהתבסס על מה שאהבת בעבר: {turn.tasteLabels.join(", ")}
            </p>
          )}
        </div>
      </div>

      {!turn.result.usedAI && (
        <p className="mb-6 text-center text-xs text-ink/40">
          {aiConfigured
            ? "מנוע ה-AI לא היה זמין כרגע, כך שההמלצות מבוססות על חיפוש חכם ב-TMDB בלבד."
            : "לא הוגדר מפתח AI (Anthropic/OpenAI) — ההמלצות מבוססות על חיפוש חכם ב-TMDB בלבד."}
        </p>
      )}

      {turn.result.recommendations.length === 0 ? (
        <p className="text-center text-ink/50">לא מצאתי סרטים מתאימים לבקשה הזו.</p>
      ) : (
        <ResultsClient
          recommendations={turn.result.recommendations}
          initialLikedIds={turn.initialLikedIds}
          initialDislikedIds={turn.initialDislikedIds}
        />
      )}
    </div>
  );
}
