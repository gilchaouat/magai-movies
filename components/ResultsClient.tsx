"use client";

import { useMemo, useState } from "react";
import { RESULT_FILTERS } from "@/lib/config";
import type { Recommendation } from "@/lib/types";
import { recordInterest } from "@/lib/taste";
import { readTasteProfile, writeTasteProfile } from "@/lib/tasteClient";
import MovieCard from "./MovieCard";

// Weights for implicit taste learning — a Netflix click is a real intent
// signal and counts for more than a trailer click, which just shows
// curiosity.
const WATCH_WEIGHT = 2;
const TRAILER_WEIGHT = 1;

export default function ResultsClient({
  recommendations,
  onFilterChange,
}: {
  recommendations: Recommendation[];
  // Notifies the parent which genre filter is active, purely so a follow-up
  // message can fold it in — the filtering itself stays instant/local here.
  onFilterChange?: (genreId: number | null) => void;
}) {
  const [activeFilter, setActiveFilterState] = useState<number | null>(null);
  function setActiveFilter(genreId: number | null) {
    setActiveFilterState(genreId);
    onFilterChange?.(genreId);
  }

  const filtered = useMemo(() => {
    if (activeFilter === null) return recommendations;
    return recommendations.filter((m) => m.genreIds.includes(activeFilter));
  }, [recommendations, activeFilter]);

  function recordClick(movie: Recommendation, weight: number) {
    // Read fresh from the cookie (not just this render's state) so a click
    // on a previous search's results isn't clobbered by a stale copy.
    const current = readTasteProfile();
    const next = recordInterest(
      current,
      { id: movie.id, title: movie.title, genreIds: movie.genreIds },
      weight
    );
    writeTasteProfile(next);
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
              onWatchClick={() => recordClick(movie, WATCH_WEIGHT)}
              onTrailerClick={() => recordClick(movie, TRAILER_WEIGHT)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
