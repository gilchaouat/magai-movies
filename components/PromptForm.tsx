"use client";

import { useRef, useState } from "react";
import { QUICK_CHIPS } from "@/lib/config";

export default function PromptForm({ initialQuery }: { initialQuery: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialQuery);
  const [submitting, setSubmitting] = useState(false);

  function submitChip(chip: string) {
    setValue(chip);
    // Let the input reflect the chip before submitting on the next tick.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
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
