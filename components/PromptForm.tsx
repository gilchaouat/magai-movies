"use client";

import { useRef, useState } from "react";
import { QUICK_CHIPS } from "@/lib/config";

export default function PromptForm({ initialQuery }: { initialQuery: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialQuery);
  const [submitting, setSubmitting] = useState(false);
  // Collapsed by default: the taste panel above is the primary action here,
  // this is only a secondary path for "I have something specific in mind
  // right now" — it refines the taste search, it doesn't replace it.
  const [revealed, setRevealed] = useState(!!initialQuery);

  function submitChip(chip: string) {
    setValue(chip);
    // Let the input reflect the chip before submitting on the next tick.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  if (!revealed) {
    return (
      <div className="mx-auto max-w-xl border-t border-dashed border-ink/15 pt-5 text-center">
        <p className="mb-1.5 text-xs font-bold text-ink/40">יש לכם משהו ספציפי בראש דווקא עכשיו?</p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="text-sm font-bold text-accent hover:text-accent-dark"
        >
          אפשר גם לתאר בקשה מסוימת — היא רק תעדן את הטעם שלמעלה, לא תחליף אותו ←
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        ref={formRef}
        action="/"
        method="GET"
        onSubmit={() => setSubmitting(true)}
        className="flex flex-col sm:flex-row items-stretch gap-3 rounded-2xl bg-white p-2.5 shadow-lg shadow-black/5 ring-1 ring-black/5"
      >
        <input
          ref={inputRef}
          type="text"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="למשל: מותחן איכותי לערב זוגי, עד שעתיים, בלי אימה"
          className="flex-1 min-w-0 rounded-xl bg-transparent px-4 py-3.5 text-base sm:text-lg text-ink placeholder:text-ink/40 outline-none"
          autoComplete="off"
          dir="rtl"
        />
        <button
          type="submit"
          disabled={!value.trim() || submitting}
          className="shrink-0 rounded-xl bg-accent px-6 py-3.5 text-base sm:text-lg font-bold text-white transition hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "בונים..." : "תתאים לי"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => submitChip(chip)}
            className="rounded-full border border-ink/15 bg-white/70 px-4 py-2 text-sm text-ink/80 transition hover:border-accent hover:text-accent"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
