"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-serif text-2xl font-bold text-ink">משהו השתבש</p>
      <p className="mt-2 max-w-sm text-sm text-ink/60">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
      >
        נסו שוב
      </button>
    </div>
  );
}
