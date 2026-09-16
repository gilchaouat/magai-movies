"use client";

import { useState } from "react";
import { GENRE_LABELS_HE, GENRE_ID_TO_KEY } from "@/lib/config";
import { emptyProfile, type TasteProfile } from "@/lib/taste";
import { readTasteProfile, writeTasteProfile } from "@/lib/tasteClient";

function topGenreLabels(counts: Record<string, number>): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => GENRE_LABELS_HE[GENRE_ID_TO_KEY[Number(id)]] ?? null)
    .filter((v): v is string => !!v);
}

export default function TasteSummary() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<TasteProfile | null>(null);

  function handleToggle() {
    if (!open) setProfile(readTasteProfile());
    setOpen((o) => !o);
  }

  function handleReset() {
    writeTasteProfile(emptyProfile());
    setProfile(emptyProfile());
  }

  const likedGenres = profile ? topGenreLabels(profile.likedGenres) : [];
  const dislikedGenres = profile ? topGenreLabels(profile.dislikedGenres) : [];
  const isEmpty =
    profile &&
    !likedGenres.length &&
    !dislikedGenres.length &&
    !profile.liked.length &&
    !profile.disliked.length;

  return (
    <div className="mx-auto mt-4 max-w-xl text-center">
      <button
        type="button"
        onClick={handleToggle}
        className="text-xs font-semibold text-ink/50 underline decoration-dotted underline-offset-4 hover:text-ink/80"
      >
        הטעם שלך {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-white p-4 text-right text-sm shadow-sm ring-1 ring-black/5">
          {isEmpty && (
            <p className="text-ink/50">
              עוד לא סימנת 👍 או 👎 על אף סרט — ברגע שתעשו זאת, זה יופיע כאן.
            </p>
          )}
          {!isEmpty && profile && (
            <div className="space-y-3">
              {likedGenres.length > 0 && (
                <p>
                  <span className="font-bold">אוהב/ת: </span>
                  {likedGenres.join(", ")}
                </p>
              )}
              {dislikedGenres.length > 0 && (
                <p>
                  <span className="font-bold">פחות אוהב/ת: </span>
                  {dislikedGenres.join(", ")}
                </p>
              )}
              {profile.liked.length > 0 && (
                <p className="text-ink/60">
                  <span className="font-bold text-ink">סימנת 👍: </span>
                  {profile.liked.map((e) => e.title).join(", ")}
                </p>
              )}
              {profile.disliked.length > 0 && (
                <p className="text-ink/60">
                  <span className="font-bold text-ink">סימנת 👎: </span>
                  {profile.disliked.map((e) => e.title).join(", ")}
                </p>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="mt-2 text-xs font-semibold text-accent hover:text-accent-dark"
              >
                אפס את הטעם שלי
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
