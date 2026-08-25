import {
  GENRE_ID_TO_KEY,
  NETFLIX_PROVIDER_ID,
  TMDB_IMAGE_BASE,
  WATCH_REGION,
} from "./config";

const TMDB_BASE = "https://api.themoviedb.org/3";

export class TmdbConfigError extends Error {}
export class TmdbRequestError extends Error {}

function authHeaders(): HeadersInit {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

function withApiKey(params: URLSearchParams) {
  const apiKey = process.env.TMDB_API_KEY;
  const hasToken = !!process.env.TMDB_ACCESS_TOKEN;
  if (!hasToken) {
    if (!apiKey) {
      throw new TmdbConfigError(
        "Missing TMDB credentials. Set TMDB_API_KEY or TMDB_ACCESS_TOKEN."
      );
    }
    params.set("api_key", apiKey);
  }
  return params;
}

async function tmdbFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const usp = withApiKey(new URLSearchParams(params));
  const res = await fetch(`${TMDB_BASE}${path}?${usp.toString()}`, {
    headers: authHeaders(),
    // Always fetch fresh — recommendations must genuinely reflect the request.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TmdbRequestError(
      `TMDB request failed (${res.status}) for ${path}: ${body.slice(0, 300)}`
    );
  }
  return res.json() as Promise<T>;
}

export type TmdbDiscoverMovie = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
};

export type DiscoverParams = {
  withGenres?: number[];
  withoutGenres?: number[];
  maxRuntime?: number | null;
  minRuntime?: number | null;
  minYear?: number | null;
  maxYear?: number | null;
  sortBy?: "popularity.desc" | "vote_average.desc";
  minVoteCount?: number;
  page?: number;
  // When true, only return titles TMDB reports as streaming (flatrate) on
  // Netflix in WATCH_REGION right now — not just "popular movies in general."
  netflixOnly?: boolean;
};

export async function discoverMovies(
  opts: DiscoverParams
): Promise<TmdbDiscoverMovie[]> {
  const params: Record<string, string> = {
    language: "he-IL",
    include_adult: "false",
    include_video: "false",
    sort_by: opts.sortBy ?? "popularity.desc",
    "vote_count.gte": String(opts.minVoteCount ?? 50),
    page: String(opts.page ?? 1),
    watch_region: WATCH_REGION,
  };
  if (opts.withGenres?.length) params.with_genres = opts.withGenres.join("|");
  if (opts.withoutGenres?.length)
    params.without_genres = opts.withoutGenres.join(",");
  if (opts.maxRuntime) params["with_runtime.lte"] = String(opts.maxRuntime);
  if (opts.minRuntime) params["with_runtime.gte"] = String(opts.minRuntime);
  if (opts.minYear) params["primary_release_date.gte"] = `${opts.minYear}-01-01`;
  if (opts.maxYear) params["primary_release_date.lte"] = `${opts.maxYear}-12-31`;
  if (opts.netflixOnly) {
    params.with_watch_providers = String(NETFLIX_PROVIDER_ID);
    params.with_watch_monetization_types = "flatrate";
  }

  const data = await tmdbFetch<{ results: TmdbDiscoverMovie[] }>(
    "/discover/movie",
    params
  );
  return data.results ?? [];
}

export type TmdbVideo = {
  key: string;
  site: string;
  type: string;
  official: boolean;
  name: string;
};

export type TmdbWatchProviders = {
  results: Record<
    string,
    {
      link?: string;
      flatrate?: { provider_id: number; provider_name: string }[];
    }
  >;
};

export type TmdbMovieDetail = TmdbDiscoverMovie & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  videos?: { results: TmdbVideo[] };
  "watch/providers"?: TmdbWatchProviders;
};

export async function getMovieDetail(id: number): Promise<TmdbMovieDetail> {
  return tmdbFetch<TmdbMovieDetail>(`/movie/${id}`, {
    language: "he-IL",
    append_to_response: "videos,watch/providers",
  });
}

export function pickTrailerUrl(videos?: { results: TmdbVideo[] }): string | null {
  if (!videos?.results?.length) return null;
  const candidates = videos.results.filter(
    (v) => v.site === "YouTube" && v.type === "Trailer" && v.key
  );
  if (!candidates.length) return null;
  const official = candidates.find((v) => v.official) ?? candidates[0];
  return `https://www.youtube.com/watch?v=${official.key}`;
}

export function isVerifiedOnNetflix(providers?: TmdbWatchProviders): boolean {
  const region = providers?.results?.[WATCH_REGION];
  if (!region?.flatrate?.length) return false;
  return region.flatrate.some((p) => p.provider_id === NETFLIX_PROVIDER_ID);
}

export function posterUrl(path: string | null, size = "w500"): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size = "w1280"): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function netflixSearchUrl(title: string): string {
  return `https://www.netflix.com/search?q=${encodeURIComponent(title)}`;
}

export function genreNamesFromIds(ids: number[]): string[] {
  return ids
    .map((id) => GENRE_ID_TO_KEY[id])
    .filter((v): v is string => !!v);
}

let genreListCache: { id: number; name: string }[] | null = null;

export async function getGenreListHe(): Promise<{ id: number; name: string }[]> {
  if (genreListCache) return genreListCache;
  const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(
    "/genre/movie/list",
    { language: "he-IL" }
  );
  genreListCache = data.genres ?? [];
  return genreListCache;
}
