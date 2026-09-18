"use client";

import { useEffect, useState } from "react";
import { GENRE_LABELS_HE, GENRE_ID_TO_KEY } from "@/lib/config";
import { emptyProfile, withCustomTaste, type TasteProfile } from "@/lib/taste";
import { readTasteProfile, writeTasteProfile } from "@/lib/tasteClient";

function topGenreLabels(counts: Record<string, number>): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => GENRE_LABELS_HE[GENRE_ID_TO_KEY[Number(id)]] ?? null)
    .filter((v): v is string => !!v);
}

export default function TasteSummary() {
  // Open by default — this is meant to be the app's visible, editable
  // starting point, not something tucked behind a click.
  const [open, setOpen] = useState(true);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [customTasteInput, setCustomTasteInput] = useState("");

  useEffect(() => {
    // Reading the cookie has to wait for the client (no `document` during
    // SSR) — deferring the state update to a microtask, rather than calling
    // it synchronously in the effect body, avoids a render-cascade warning
    // for what's otherwise a plain "sync from an external source" read.
    Promise.resolve().then(() => {
      const current = readTasteProfile();
      setProfile(current);
      setCustomTasteInput(current.customTaste);
    });
  }, []);

  function handleToggle() {
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

  const likedGenres = profile ? topGenreLabels(profile.likedGenres) : [];
  const hasLearnedAnything = !!(profile && (likedGenres.length || profile.liked.length));

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
          <div>
            <label className="mb-2 block text-xs font-bold text-ink/50">
              תארו את הטעם שלכם במילים שלכם
            </label>
            <textarea
              value={customTasteInput}
              onChange={(e) => setCustomTasteInput(e.target.value)}
              onBlur={handleCustomTasteBlur}
              placeholder="למשל: אני אוהב/ת דרמות איטיות, לא אוהב/ת אקשן, מעדיף/ה סרטים קצרים"
              rows={6}
              maxLength={300}
              dir="rtl"
              className="w-full resize-none rounded-lg border border-ink/15 p-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div className="border-t border-ink/10 pt-4">
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
