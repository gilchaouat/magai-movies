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
};
