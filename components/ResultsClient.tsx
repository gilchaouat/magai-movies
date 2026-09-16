"use client";

import { useMemo, useState } from "react";
import { RESULT_FILTERS } from "@/lib/config";
import type { Recommendation } from "@/lib/types";
import { applyFeedback, clearFeedback } from "@/lib/taste";
import { readTasteProfile, writeTasteProfile } from "@/lib/tasteClient";
import MovieCard from "./MovieCard";

export default function ResultsClient({
  recommendations,
  initialLikedIds,
  initialDislikedIds,
}: {
  recommendations: Recommendation[];
  initialLikedIds: number[];
  initialDislikedIds: number[];
}) {
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState(() => new Set(initialLikedIds));
  const [dislikedIds, setDislikedIds] = useState(() => new Set(initialDislikedIds));

  const filtered = useMemo(() => {
    if (activeFilter === null) return recommendations;
    return recommendations.filter((m) => m.genreIds.includes(activeFilter));
  }, [recommendations, activeFilter]);

  function handleFeedback(movie: Recommendation, liked: boolean) {
    // Read fresh from the cookie (not just this render's state) so feedback
    // given on a previous search isn't clobbered by a stale in-memory copy.
    const current = readTasteProfile();
    const alreadyThisWay = liked
      ? current.liked.some((e) => e.id === movie.id)
      : current.disliked.some((e) => e.id === movie.id);
    const next = alreadyThisWay
      ? clearFeedback(current, { id: movie.id, genreIds: movie.genreIds })
      : applyFeedback(
          current,
          { id: movie.id, title: movie.title, genreIds: movie.genreIds },
          liked
        );
    writeTasteProfile(next);
    setLikedIds(new Set(next.liked.map((e) => e.id)));
    setDislikedIds(new Set(next.disliked.map((e) => e.id)));
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {RESULT_FILTERS.map((f) => {
          const isActive =
            (activeFilter === null && f.genreId === null) || activeFilter === f.genreId;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => setActiveFilter(f.genreId)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-ink text-white"
                  : "bg-white text-ink/70 ring-1 ring-black/10 hover:ring-ink/30"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-ink/50">אין סרטים בקטגוריה הזו כרגע.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              isLiked={likedIds.has(movie.id)}
              isDisliked={dislikedIds.has(movie.id)}
              onLike={() => handleFeedback(movie, true)}
              onDislike={() => handleFeedback(movie, false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
