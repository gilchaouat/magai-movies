import { GENRE_ID_TO_KEY, GENRE_LABELS_HE } from "./config";

export const TASTE_COOKIE = "magai_taste";
const MAX_ENTRIES = 25;

const MAX_CUSTOM_TASTE_LENGTH = 300;

export type LikedEntry = { id: number; title: string };

export type TasteProfile = {
  likedGenres: Record<string, number>;
  // Kept only so an old cookie written before thumbs were removed still
  // decodes cleanly — nothing writes to this anymore.
  dislikedGenres: Record<string, number>;
  liked: LikedEntry[];
  disliked: LikedEntry[];
  // Free text the user can write/edit directly, describing their own taste
  // in their own words — carried to the AI alongside the auto-learned
  // genres, and the one thing here that isn't inferred.
  customTaste: string;
};

export function emptyProfile(): TasteProfile {
  return {
    likedGenres: {},
    dislikedGenres: {},
    liked: [],
    disliked: [],
    customTaste: "",
  };
}

function sanitizeEntries(raw: unknown): LikedEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is LikedEntry =>
        e && typeof e.id === "number" && typeof e.title === "string"
    )
    .slice(-MAX_ENTRIES);
}

export function decodeProfile(raw: string | undefined | null): TasteProfile {
  if (!raw) return emptyProfile();
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return {
      likedGenres:
        parsed.likedGenres && typeof parsed.likedGenres === "object" ? parsed.likedGenres : {},
      dislikedGenres:
        parsed.dislikedGenres && typeof parsed.dislikedGenres === "object"
          ? parsed.dislikedGenres
          : {},
      liked: sanitizeEntries(parsed.liked),
      disliked: sanitizeEntries(parsed.disliked),
      customTaste:
        typeof parsed.customTaste === "string"
          ? parsed.customTaste.slice(0, MAX_CUSTOM_TASTE_LENGTH)
          : "",
    };
  } catch {
    return emptyProfile();
  }
}

export function encodeProfile(profile: TasteProfile): string {
  return encodeURIComponent(JSON.stringify(profile));
}

// Learns from what someone actually does, not a separate rating step: a
// click on "watch on Netflix" is a real signal of intent (weighted higher),
// a trailer click a softer one — both nudge the liked-genre counts used to
// personalize future default searches. There's no negative counterpart: an
// unclicked recommendation is too noisy a signal to safely read as dislike.
export function recordInterest(
  profile: TasteProfile,
  movie: { id: number; title: string; genreIds: number[] },
  weight: number
): TasteProfile {
  const next: TasteProfile = {
    ...profile,
    likedGenres: { ...profile.likedGenres },
    liked: [...profile.liked],
  };

  for (const gid of movie.genreIds) {
    next.likedGenres[gid] = (next.likedGenres[gid] ?? 0) + weight;
  }

  if (!next.liked.some((e) => e.id === movie.id)) {
    next.liked = [...next.liked, { id: movie.id, title: movie.title }];
    if (next.liked.length > MAX_ENTRIES) {
      next.liked = next.liked.slice(next.liked.length - MAX_ENTRIES);
    }
  }

  return next;
}

export function withCustomTaste(profile: TasteProfile, text: string): TasteProfile {
  return { ...profile, customTaste: text.slice(0, MAX_CUSTOM_TASTE_LENGTH) };
}

function topGenreIds(counts: Record<string, number>, n: number): number[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => Number(id));
}

export function topLikedGenreIds(profile: TasteProfile, n = 2): number[] {
  return topGenreIds(profile.likedGenres, n);
}

export function topLikedGenreLabels(profile: TasteProfile, n = 2): string[] {
  return topLikedGenreIds(profile, n)
    .map((id) => GENRE_LABELS_HE[GENRE_ID_TO_KEY[id]])
    .filter((v): v is string => !!v);
}

export function profileSummaryForAI(profile: TasteProfile): string | null {
  const liked = topGenreIds(profile.likedGenres, 3)
    .map((id) => GENRE_ID_TO_KEY[id])
    .filter(Boolean);
  const parts: string[] = [];
  if (liked.length) parts.push(`genres inferred from past interest: ${liked.join(", ")}`);
  if (profile.customTaste.trim()) parts.push(`user-described taste: ${profile.customTaste.trim()}`);
  if (!parts.length) return null;
  return parts.join("; ");
}
