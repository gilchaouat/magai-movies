import Image from "next/image";
import type { Recommendation } from "@/lib/types";

const GENRE_LABELS_HE: Record<string, string> = {
  action: "אקשן",
  adventure: "הרפתקאות",
  animation: "אנימציה",
  comedy: "קומדיה",
  crime: "פשע",
  documentary: "דוקומנטרי",
  drama: "דרמה",
  family: "משפחתי",
  fantasy: "פנטזיה",
  history: "היסטוריה",
  horror: "אימה",
  music: "מוזיקה",
  mystery: "מיסתורין",
  romance: "רומנטי",
  "science fiction": "מדע בדיוני",
  thriller: "מותחן",
  war: "מלחמה",
  western: "מערבון",
  "tv movie": "טלוויזיה",
};

export default function MovieCard({ movie }: { movie: Recommendation }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-md shadow-black/5 ring-1 ring-black/5 transition hover:shadow-xl hover:shadow-black/10">
      <div className="relative">
        <div className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/80 text-sm font-bold text-white backdrop-blur">
          {movie.rank}
        </div>
        <div className="relative aspect-[2/3] w-full bg-paper-dim">
          {movie.posterUrl ? (
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 90vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink/30 text-sm">
              אין תמונת פוסטר
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-serif text-xl font-bold leading-snug text-ink">
            {movie.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/60">
            {movie.year && <span>{movie.year}</span>}
            {movie.runtime && (
              <>
                <span aria-hidden>·</span>
                <span>{movie.runtime} דק&apos;</span>
              </>
            )}
            {movie.rating !== null && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-gold">
                  ★ {movie.rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
        </div>

        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {movie.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-ink/70"
              >
                {GENRE_LABELS_HE[g] ?? g}
              </span>
            ))}
          </div>
        )}

        <p className="line-clamp-3 text-sm leading-relaxed text-ink/75">
          {movie.overview}
        </p>

        <div className="rounded-xl bg-accent/5 p-3 ring-1 ring-accent/10">
          <p className="text-xs font-bold text-accent">למה זה מתאים לך</p>
          <p className="mt-1 line-clamp-2 text-sm text-ink/80">{movie.whyItMatches}</p>
        </div>

        <div className="mt-auto flex gap-2 pt-1">
          {movie.trailerUrl ? (
            <a
              href={movie.trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border border-ink/15 px-3 py-2.5 text-center text-sm font-semibold text-ink transition hover:border-ink/40"
            >
              ▶ צפו בטריילר
            </a>
          ) : (
            <span className="flex-1 cursor-not-allowed rounded-xl border border-ink/10 px-3 py-2.5 text-center text-sm font-semibold text-ink/30">
              אין טריילר זמין
            </span>
          )}
          <a
            href={movie.netflixUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-accent-dark"
          >
            {movie.netflixVerified ? "✓ צפו בנטפליקס" : "חפשו בנטפליקס"}
          </a>
        </div>
        {!movie.netflixVerified && (
          <p className="text-center text-[11px] text-ink/40">
            זמינות בנטפליקס לא אומתה — הקישור פותח חיפוש עבור הכותר
          </p>
        )}
      </div>
    </article>
  );
}
