"use client";

import { useMemo, useState } from "react";
import { RESULT_FILTERS } from "@/lib/config";
import type { Recommendation } from "@/lib/types";
import MovieCard from "./MovieCard";

export default function ResultsClient({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const [activeFilter, setActiveFilter] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (activeFilter === null) return recommendations;
    return recommendations.filter((m) => m.genreIds.includes(activeFilter));
  }, [recommendations, activeFilter]);

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
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
