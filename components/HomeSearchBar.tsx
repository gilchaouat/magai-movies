"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TASTE_SEARCH_QUERY } from "@/lib/config";

// The single search action for the homepage: type something specific to
// refine, or leave it empty and just go on the taste profile above as-is —
// one button either way, instead of a separate "search by taste" action
// competing with a follow-up box.
export default function HomeSearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setSubmitting(true);
    if (!value.trim()) {
      // A plain empty "q" would just bounce back to this same homepage —
      // route an empty submission to the taste-only search instead.
      e.preventDefault();
      router.push(`/?q=${encodeURIComponent(TASTE_SEARCH_QUERY)}`);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <form
        action="/"
        method="GET"
        onSubmit={handleSubmit}
        className="flex flex-col items-stretch gap-3 rounded-2xl bg-white p-2.5 shadow-lg shadow-black/5 ring-1 ring-black/5 sm:flex-row"
      >
        <input
          type="text"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="המשך לשוחח (אופציונלי)... למשל: קצת יותר קליל, או תראה לי עוד כאלה"
          disabled={submitting}
          autoComplete="off"
          dir="rtl"
          className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3.5 text-base text-ink placeholder:text-ink/40 outline-none disabled:opacity-60 sm:text-lg"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-bold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg"
        >
          {submitting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              מחפשים...
            </>
          ) : (
            "🔍 מצא לי סרט"
          )}
        </button>
      </form>
    </div>
  );
}
