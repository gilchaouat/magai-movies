import { GENRE_IDS } from "./config";
import { parsePromptToPreferences, writeEditorialBlurbs } from "./ai";
import {
  discoverMovies,
  genreNamesFromIds,
  getMovieDetail,
  isVerifiedOnNetflix,
  netflixSearchUrl,
  pickTrailerUrl,
  posterUrl,
  backdropUrl,
  TmdbConfigError,
  type TmdbDiscoverMovie,
} from "./tmdb";
import type { Preferences, Recommendation, RecommendResult } from "./types";

const RESULT_COUNT = 8;
const CANDIDATE_POOL = 16;

function yearFromDate(date: string | undefined): string | null {
  if (!date) return null;
  const y = date.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

function preferencesToSummary(p: Preferences): string {
  const parts: string[] = [];
  if (p.genres.length) parts.push(`ז'אנרים: ${p.genres.join(", ")}`);
  if (p.excludeGenres.length) parts.push(`לא כולל: ${p.excludeGenres.join(", ")}`);
  if (p.maxRuntime) parts.push(`עד ${p.maxRuntime} דקות`);
  if (p.minYear) parts.push(`משנת ${p.minYear} ואילך`);
  if (p.highlyRated) parts.push("מדורג גבוה");
  if (p.audience) parts.push(`קהל יעד: ${p.audience}`);
  if (p.tone) parts.push(`טון: ${p.tone}`);
  return parts.length ? parts.join(" | ") : p.summary;
}

async function fetchCandidatePool(prefs: Preferences): Promise<TmdbDiscoverMovie[]> {
  const withGenres = prefs.genres.map((g) => GENRE_IDS[g]).filter(Boolean);
  const withoutGenres = prefs.excludeGenres.map((g) => GENRE_IDS[g]).filter(Boolean);

  const baseParams = {
    withGenres,
    withoutGenres,
    maxRuntime: prefs.maxRuntime,
    minRuntime: prefs.minRuntime,
    minYear: prefs.minYear,
    maxYear: prefs.maxYear,
    sortBy: prefs.highlyRated ? ("vote_average.desc" as const) : ("popularity.desc" as const),
    minVoteCount: prefs.highlyRated ? 300 : withGenres.includes(GENRE_IDS.documentary) ? 20 : 80,
  };

  // Primary attempt: only titles TMDB reports as actually streaming (flatrate)
  // on Netflix in Israel right now. This is what keeps "watch tonight" honest —
  // without it, discover happily returns movies still in theaters or on other
  // platforms entirely.
  let results = await discoverMovies({ ...baseParams, netflixOnly: true, page: 1 });
  if (results.length < CANDIDATE_POOL) {
    const page2 = await discoverMovies({ ...baseParams, netflixOnly: true, page: 2 });
    results = [...results, ...page2];
  }

  // If the strict combination of filters is too narrow, progressively relax —
  // genre exclusions and runtime/year first, Netflix-only last, so a niche
  // request still returns something rather than nothing.
  if (results.length < 4 && withoutGenres.length) {
    results = await discoverMovies({
      ...baseParams,
      withoutGenres: [],
      netflixOnly: true,
      page: 1,
    });
  }
  if (results.length < 4 && (prefs.maxRuntime || prefs.minYear)) {
    results = await discoverMovies({
      ...baseParams,
      maxRuntime: null,
      minYear: null,
      withoutGenres,
      netflixOnly: true,
      page: 1,
    });
  }
  if (results.length < 4) {
    results = await discoverMovies({ ...baseParams, page: 1 });
  }

  const seen = new Set<number>();
  const deduped = results.filter((m) => {
    if (seen.has(m.id) || !m.poster_path) return false;
    seen.add(m.id);
    return true;
  });

  return deduped.slice(0, CANDIDATE_POOL);
}

function templateWhy(prefs: Preferences, m: {
  genres: string[];
  rating: number | null;
  runtime: number | null;
}): string {
  const bits: string[] = [];
  if (prefs.genres.length) bits.push(`תואם לחיפוש שלך אחר ${prefs.genres.join("/")}`);
  if (prefs.maxRuntime && m.runtime) bits.push(`אורך של ${m.runtime} דקות עומד בדרישת הזמן`);
  if (prefs.highlyRated && m.rating) bits.push(`דירוג גבוה של ${m.rating.toFixed(1)}/10`);
  if (prefs.excludeGenres.length) bits.push(`ללא ${prefs.excludeGenres.join("/")}`);
  if (!bits.length) bits.push("נבחר על סמך פופולריות ואיכות התאמה לבקשה שלך");
  return bits.join(" · ");
}

export async function getRecommendations(query: string): Promise<RecommendResult> {
  const { preferences, usedAI, aiError } = await parsePromptToPreferences(query);

  let candidates: TmdbDiscoverMovie[];
  try {
    candidates = await fetchCandidatePool(preferences);
  } catch (err) {
    if (err instanceof TmdbConfigError) throw err;
    throw new Error(
      `Failed to load movies from TMDB: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const top = candidates.slice(0, RESULT_COUNT);

  const details = await Promise.all(
    top.map(async (c) => {
      try {
        return await getMovieDetail(c.id);
      } catch {
        return null;
      }
    })
  );

  const enriched = details
    .map((d, i) => ({ d, base: top[i] }))
    .filter((x): x is { d: NonNullable<typeof x.d>; base: TmdbDiscoverMovie } => !!x.d)
    .map(({ d, base }) => {
      const genreNames = d.genres?.length
        ? d.genres.map((g) => g.name)
        : genreNamesFromIds(base.genre_ids);
      return {
        id: d.id,
        title: d.title,
        year: yearFromDate(d.release_date),
        runtime: d.runtime ?? null,
        genres: genreNames,
        genreIds: d.genres?.map((g) => g.id) ?? base.genre_ids,
        rating: typeof d.vote_average === "number" ? d.vote_average : null,
        overview: d.overview || base.overview || "",
        posterUrl: posterUrl(d.poster_path),
        backdropUrl: backdropUrl(d.backdrop_path),
        trailerUrl: pickTrailerUrl(d.videos),
        netflixVerified: isVerifiedOnNetflix(d["watch/providers"]),
        netflixUrl: netflixSearchUrl(d.title),
      };
    });

  const prefsSummary = preferencesToSummary(preferences);

  let blurbs: Awaited<ReturnType<typeof writeEditorialBlurbs>> = {};
  if (usedAI) {
    blurbs = await writeEditorialBlurbs(
      query,
      prefsSummary,
      enriched.map((m) => ({
        id: m.id,
        title: m.title,
        overview: m.overview,
        year: m.year,
        runtime: m.runtime,
        rating: m.rating,
        genres: m.genres,
      }))
    );
  }

  const recommendations: Recommendation[] = enriched.map((m, i) => {
    const blurb = blurbs[m.id];
    return {
      id: m.id,
      rank: i + 1,
      title: m.title,
      year: m.year,
      runtime: m.runtime,
      genres: m.genres,
      genreIds: m.genreIds,
      rating: m.rating,
      overview: blurb?.overview || m.overview || "אין תקציר זמין לסרט זה.",
      whyItMatches: blurb?.why || templateWhy(preferences, m),
      posterUrl: m.posterUrl,
      backdropUrl: m.backdropUrl,
      trailerUrl: m.trailerUrl,
      netflixUrl: m.netflixUrl,
      netflixVerified: m.netflixVerified,
    };
  });

  return {
    query,
    preferences,
    recommendations,
    usedAI,
    aiError,
  };
}
