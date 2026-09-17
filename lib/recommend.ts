import { GENRE_IDS, GENRE_LABELS_HE } from "./config";
import {
  parsePromptToPreferences,
  selectRelevantAndWriteBlurbs,
  writeEditorialBlurbs,
  type BlurbOutput,
  type CandidateInput,
} from "./ai";
import {
  discoverMovies,
  genreNamesFromIds,
  getMovieDetail,
  getMovieVideos,
  isVerifiedOnNetflix,
  netflixSearchUrl,
  pickTrailerUrl,
  posterUrl,
  backdropUrl,
  TmdbConfigError,
  type DiscoverParams,
  type TmdbDiscoverMovie,
} from "./tmdb";
import type { Preferences, Recommendation, RecommendResult } from "./types";
import {
  emptyProfile,
  profileSummaryForAI,
  topLikedGenreIds,
  topLikedGenreLabels,
  type TasteProfile,
} from "./taste";

const RESULT_COUNT = 8;
const CANDIDATE_POOL = 16;
// The bar for "good enough to show as-is." A handful of genuinely matching
// movies is a better answer than padding a thin result with unrelated
// popular titles just to hit a round number — so this stays low, and the
// cascade below only keeps loosening constraints while under it.
const MIN_RESULTS = 3;

function genreLabel(key: string): string {
  return GENRE_LABELS_HE[key] ?? key;
}

function yearFromDate(date: string | undefined): string | null {
  if (!date) return null;
  const y = date.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

// TMDB has no "features child characters" filter — the closest real lever
// is a content-rating ceiling, which at least keeps clearly adult-oriented
// titles (e.g. an R-rated thriller) out of "family"/"kids" requests. It's a
// proxy, not a semantic match: it can't guarantee children are prominent
// characters, only that the content itself isn't for adults.
function certificationForAudience(audience: string | null): string | null {
  if (!audience) return null;
  const a = audience.toLowerCase();
  if (a.includes("famil") || a.includes("kid") || a.includes("child")) return "PG";
  if (a.includes("teen")) return "PG-13";
  return null;
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

async function fetchCandidatePool(
  prefs: Preferences,
  profile: TasteProfile
): Promise<{
  results: TmdbDiscoverMovie[];
  usedTasteDefault: boolean;
  relaxedSearch: boolean;
}> {
  const explicitGenres = prefs.genres.map((g) => GENRE_IDS[g]).filter(Boolean);
  // When the request doesn't name a genre, lean on what this device has
  // previously liked instead of pure popularity — this is what lets someone
  // stop re-describing their mood every time.
  const tasteGenres = explicitGenres.length ? [] : topLikedGenreIds(profile);
  const withGenres = explicitGenres.length ? explicitGenres : tasteGenres;
  const usedTasteDefault = tasteGenres.length > 0;
  const withoutGenres = prefs.excludeGenres.map((g) => GENRE_IDS[g]).filter(Boolean);
  const certificationLte = certificationForAudience(prefs.audience);
  const multiGenre = withGenres.length > 1;

  const baseParams: DiscoverParams = {
    withGenres,
    withoutGenres,
    maxRuntime: prefs.maxRuntime,
    minRuntime: prefs.minRuntime,
    minYear: prefs.minYear,
    maxYear: prefs.maxYear,
    sortBy: prefs.highlyRated ? ("vote_average.desc" as const) : ("popularity.desc" as const),
    minVoteCount: prefs.highlyRated ? 300 : withGenres.includes(GENRE_IDS.documentary) ? 20 : 80,
    certificationLte,
  };

  // Attempts run strictest-first and stop as soon as one clears MIN_RESULTS —
  // a thin-but-accurate result is shown as-is rather than padded by
  // loosening further. When multiple genres are identified, requiring ALL of
  // them (not just any one) is what actually narrows a compound request like
  // "music, history, drama" to genuinely relevant titles — OR-ing a broad
  // genre like "drama" in with more specific ones just returns generic
  // popular dramas. certificationLte is our own inference (not something the
  // user explicitly asked for), so it's dropped before genre exclusions and
  // runtime/year, which the user did state explicitly; Netflix-only goes
  // last, so a niche request still returns something rather than nothing.
  const attempts: DiscoverParams[] = [
    { ...baseParams, genreMatchAll: multiGenre, netflixOnly: true },
  ];
  if (multiGenre) attempts.push({ ...baseParams, genreMatchAll: false, netflixOnly: true });
  if (certificationLte)
    attempts.push({ ...baseParams, genreMatchAll: false, certificationLte: null, netflixOnly: true });
  if (withoutGenres.length)
    attempts.push({ ...baseParams, genreMatchAll: false, withoutGenres: [], netflixOnly: true });
  if (prefs.maxRuntime || prefs.minYear)
    attempts.push({
      ...baseParams,
      genreMatchAll: false,
      maxRuntime: null,
      minYear: null,
      netflixOnly: true,
    });
  attempts.push({ ...baseParams, genreMatchAll: false, certificationLte: null });

  let results: TmdbDiscoverMovie[] = [];
  let usedAttemptIndex = 0;
  for (let i = 0; i < attempts.length; i++) {
    results = await discoverMovies({ ...attempts[i], page: 1 });
    usedAttemptIndex = i;
    if (results.length >= MIN_RESULTS) break;
  }
  const relaxedSearch = usedAttemptIndex > 0;

  // The winning attempt found a real pool — fetch a second page under the
  // *same* filters for more depth, not a looser match.
  if (results.length > 0 && results.length < CANDIDATE_POOL) {
    const page2 = await discoverMovies({ ...attempts[usedAttemptIndex], page: 2 });
    results = [...results, ...page2];
  }

  const seen = new Set<number>();
  const disliked = new Set(profile.disliked.map((e) => e.id));
  const deduped = results.filter((m) => {
    if (seen.has(m.id) || !m.poster_path || disliked.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  return { results: deduped.slice(0, CANDIDATE_POOL), usedTasteDefault, relaxedSearch };
}

function templateWhy(
  prefs: Preferences,
  m: { genres: string[]; rating: number | null; runtime: number | null },
  tasteLabels: string[]
): string {
  const bits: string[] = [];
  if (prefs.genres.length)
    bits.push(`תואם לחיפוש שלך אחר ${prefs.genres.map(genreLabel).join("/")}`);
  else if (tasteLabels.length)
    bits.push(`מבוסס על הז'אנרים שאהבת בעבר (${tasteLabels.join(", ")})`);
  if (prefs.maxRuntime && m.runtime) bits.push(`אורך של ${m.runtime} דקות עומד בדרישת הזמן`);
  if (prefs.highlyRated && m.rating) bits.push(`דירוג גבוה של ${m.rating.toFixed(1)}/10`);
  if (prefs.excludeGenres.length)
    bits.push(`ללא ${prefs.excludeGenres.map(genreLabel).join("/")}`);
  if (certificationForAudience(prefs.audience)) bits.push(`מתאים לקהל: ${prefs.audience}`);
  if (!bits.length) bits.push("נבחר על סמך פופולריות ואיכות התאמה לבקשה שלך");
  return bits.join(" · ");
}

export async function getRecommendations(
  query: string,
  profile: TasteProfile = emptyProfile(),
  previousPreferences: Preferences | null = null
): Promise<RecommendResult> {
  const { preferences, usedAI, aiError } = await parsePromptToPreferences(
    query,
    profileSummaryForAI(profile),
    previousPreferences
  );

  let candidates: TmdbDiscoverMovie[];
  let usedTasteDefault = false;
  let relaxedSearch = false;
  try {
    const pool = await fetchCandidatePool(preferences, profile);
    candidates = pool.results;
    usedTasteDefault = pool.usedTasteDefault;
    relaxedSearch = pool.relaxedSearch;
  } catch (err) {
    if (err instanceof TmdbConfigError) throw err;
    throw new Error(
      `Failed to load movies from TMDB: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const tasteLabels = usedTasteDefault ? topLikedGenreLabels(profile) : [];
  const prefsSummary =
    preferencesToSummary(preferences) +
    (tasteLabels.length ? ` | הותאם לפי טעם קודם: ${tasteLabels.join(", ")}` : "");

  // When AI is available, let it read each candidate's actual plot and pick
  // which ones genuinely fit the request — TMDB's genre tags alone can't
  // tell "about classical composers" from any other drama. Falls back to
  // plain popularity order if the call fails or the AI finds nothing it's
  // confident about, so a thin/no-op result never means a blank page.
  let top = candidates.slice(0, RESULT_COUNT);
  let preselectedBlurbs: BlurbOutput = {};
  if (usedAI) {
    const candidateInputs: CandidateInput[] = candidates.map((c) => ({
      id: c.id,
      title: c.title,
      overview: c.overview,
      year: yearFromDate(c.release_date),
      rating: typeof c.vote_average === "number" ? c.vote_average : null,
      genres: genreNamesFromIds(c.genre_ids).map(genreLabel),
    }));
    const selection = await selectRelevantAndWriteBlurbs(
      query,
      prefsSummary,
      candidateInputs,
      RESULT_COUNT
    );
    if (selection && selection.selectedIds.length > 0) {
      const byId = new Map(candidates.map((c) => [c.id, c]));
      top = selection.selectedIds
        .map((id) => byId.get(id))
        .filter((c): c is TmdbDiscoverMovie => !!c);
      preselectedBlurbs = selection.blurbs;
    }
  }

  const details = await Promise.all(
    top.map(async (c) => {
      try {
        const [detail, videos] = await Promise.all([
          getMovieDetail(c.id),
          getMovieVideos(c.id).catch(() => ({ results: [] })),
        ]);
        return { detail, videos };
      } catch {
        return null;
      }
    })
  );

  const enriched = details
    .map((d, i) => ({ d, base: top[i] }))
    .filter((x): x is { d: NonNullable<typeof x.d>; base: TmdbDiscoverMovie } => !!x.d)
    .map(({ d: { detail: d, videos }, base }) => {
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
        trailerUrl: pickTrailerUrl(videos),
        netflixVerified: isVerifiedOnNetflix(d["watch/providers"]),
        netflixUrl: netflixSearchUrl(d.title),
      };
    });

  let blurbs: BlurbOutput = preselectedBlurbs;
  if (usedAI && Object.keys(preselectedBlurbs).length === 0) {
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
      whyItMatches: blurb?.why || templateWhy(preferences, m, tasteLabels),
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
    usedTasteDefault,
    relaxedSearch,
  };
}
