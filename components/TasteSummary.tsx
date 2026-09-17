"use client";

import { useState } from "react";
import { GENRE_LABELS_HE, GENRE_ID_TO_KEY } from "@/lib/config";
import { emptyProfile, withCustomTaste, type TasteProfile } from "@/lib/taste";
import { readTasteProfile, writeTasteProfile } from "@/lib/tasteClient";

// A deliberately generic phrase — no genre words in it — so the existing
// "no genre named -> fall back to the taste profile" logic in lib/recommend
// kicks in on its own, and the free-text taste description gets read as
// real context instead of being overridden by an explicit request.
const TASTE_SEARCH_QUERY = "תמצא לי סרט טוב שמתאים לטעם שלי";

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
  const [customTasteInput, setCustomTasteInput] = useState("");

  function handleToggle() {
    if (!open) {
      const current = readTasteProfile();
      setProfile(current);
      setCustomTasteInput(current.customTaste);
    }
    setOpen((o) => !o);
  }

  function handleReset() {
    writeTasteProfile(emptyProfile());
    setProfile(emptyProfile());
    setCustomTasteInput("");
  }

  function handleCustomTasteBlur() {
    const current = readTasteProfile();
    const next = withCustomTaste(current, customTasteInput);
    writeTasteProfile(next);
    setProfile(next);
  }

  function handleSearchByTaste() {
    // Make sure a just-typed, not-yet-blurred edit is saved before the
    // search reads the cookie.
    const current = readTasteProfile();
    writeTasteProfile(withCustomTaste(current, customTasteInput));
  }

  const likedGenres = profile ? topGenreLabels(profile.likedGenres) : [];
  const hasLearnedAnything = !!(profile && (likedGenres.length || profile.liked.length));
  const hasAnyTaste = hasLearnedAnything || !!customTasteInput.trim();

  return (
    <div className="mx-auto mt-4 max-w-xl text-center">
      <button
        type="button"
        onClick={handleToggle}
        className="text-xs font-semibold text-ink/50 underline decoration-dotted underline-offset-4 hover:text-ink/80"
      >
        הטעם שלך {open ? "▲" : "▼"}
      </button>

      {open && profile && (
        <div className="mt-3 space-y-4 rounded-xl bg-white p-4 text-right text-sm shadow-sm ring-1 ring-black/5">
          {hasAnyTaste && (
            <a
              href={`/?q=${encodeURIComponent(TASTE_SEARCH_QUERY)}`}
              onClick={handleSearchByTaste}
              className="inline-block rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-dark"
            >
              🔍 חפש לי סרט לפי הטעם שלי
            </a>
          )}

          <div>
            <p className="mb-2 text-xs font-bold text-ink/50">
              נלמד אוטומטית מהסרטים שצפיתם בהם או שהצגתם עניין (טריילר / נטפליקס)
            </p>
            {hasLearnedAnything ? (
              <div className="space-y-2">
                {likedGenres.length > 0 && (
                  <p>
                    <span className="font-bold">אוהב/ת: </span>
                    {likedGenres.join(", ")}
                  </p>
                )}
                {profile.liked.length > 0 && (
                  <p className="text-ink/60">
                    <span className="font-bold text-ink">הראית עניין ב: </span>
                    {profile.liked.map((e) => e.title).join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-ink/50">
                עוד לא צפיתם בטריילר או לחצתם על נטפליקס לאף סרט — ברגע שתעשו זאת, זה יופיע כאן.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-ink/50">
              תארו את הטעם שלכם במילים שלכם (אופציונלי)
            </label>
            <textarea
              value={customTasteInput}
              onChange={(e) => setCustomTasteInput(e.target.value)}
              onBlur={handleCustomTasteBlur}
              placeholder="למשל: אני אוהב/ת דרמות איטיות, לא אוהב/ת אקשן, מעדיף/ה סרטים קצרים"
              rows={2}
              maxLength={300}
              dir="rtl"
              className="w-full resize-none rounded-lg border border-ink/15 p-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-accent hover:text-accent-dark"
          >
            אפס את הטעם שלי
          </button>
        </div>
      )}
    </div>
  );
}
