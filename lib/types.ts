export type Preferences = {
  genres: string[];
  excludeGenres: string[];
  maxRuntime: number | null;
  minRuntime: number | null;
  minYear: number | null;
  maxYear: number | null;
  highlyRated: boolean;
  tone: string | null;
  audience: string | null;
  summary: string;
};

export type Recommendation = {
  id: number;
  rank: number;
  title: string;
  year: string | null;
  runtime: number | null;
  genres: string[];
  genreIds: number[];
  rating: number | null;
  overview: string;
  whyItMatches: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  netflixUrl: string;
  netflixVerified: boolean;
};

export type RecommendResult = {
  query: string;
  preferences: Preferences;
  recommendations: Recommendation[];
  usedAI: boolean;
  aiError: string | null;
  // True when the request didn't name a genre and the taste profile filled
  // one in — what lets the UI honestly say "based on what you like" instead
  // of always claiming personalization happened.
  usedTasteDefault: boolean;
  // True when the strict search (all identified genres/filters together)
  // came up too thin and had to loosen constraints to find enough movies —
  // lets the UI admit the results are a broader match, not a perfect one.
  relaxedSearch: boolean;
};
