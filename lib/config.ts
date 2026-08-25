export const SITE_NAME = "MAGAI Movies";

// TMDB genre IDs — stable API metadata (https://api.themoviedb.org/3/genre/movie/list)
export const GENRE_IDS: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science fiction": 878,
  scifi: 878,
  "tv movie": 10770,
  thriller: 53,
  war: 10752,
  western: 37,
};

export const GENRE_ID_TO_KEY: Record<number, string> = Object.entries(
  GENRE_IDS
).reduce(
  (acc, [key, id]) => {
    if (!acc[id]) acc[id] = key;
    return acc;
  },
  {} as Record<number, string>
);

// Region used for Netflix availability + release date filtering
export const WATCH_REGION = "IL";

// TMDB's stable provider id for Netflix
export const NETFLIX_PROVIDER_ID = 8;

export const QUICK_CHIPS = [
  "קליל לערב זוגי",
  "מתח בלי אימה",
  "דוקו פשע אמיתי",
  "סרט משפחתי מצחיק",
];

// Client-side result filters -> TMDB genre ids they match against
export const RESULT_FILTERS: { label: string; genreId: number | null }[] = [
  { label: "הכול", genreId: null },
  { label: "מתח", genreId: GENRE_IDS.thriller },
  { label: "קומדיה", genreId: GENRE_IDS.comedy },
  { label: "דרמה", genreId: GENRE_IDS.drama },
  { label: "דוקו", genreId: GENRE_IDS.documentary },
  { label: "משפחתי", genreId: GENRE_IDS.family },
];

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
