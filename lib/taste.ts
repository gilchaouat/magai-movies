import { GENRE_ID_TO_KEY, GENRE_LABELS_HE } from "./config";

export const TASTE_COOKIE = "magai_taste";
const MAX_ENTRIES = 25;

export type LikedEntry = { id: number; title: string };

export type TasteProfile = {
  likedGenres: Record<string, number>;
  dislikedGenres: Record<string, number>;
  liked: LikedEntry[];
  disliked: LikedEntry[];
};

export function emptyProfile(): TasteProfile {
  return { likedGenres: {}, dislikedGenres: {}, liked: [], disliked: [] };
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
    };
  } catch {
    return emptyProfile();
  }
}

export function encodeProfile(profile: TasteProfile): string {
  return encodeURIComponent(JSON.stringify(profile));
}

export function applyFeedback(
  profile: TasteProfile,
  movie: { id: number; title: string; genreIds: number[] },
  liked: boolean
): TasteProfile {
  const next: TasteProfile = {
    likedGenres: { ...profile.likedGenres },
    dislikedGenres: { ...profile.dislikedGenres },
    liked: [...profile.liked],
    disliked: [...profile.disliked],
  };

  const genreBucket = liked ? next.likedGenres : next.dislikedGenres;
  for (const gid of movie.genreIds) {
    genreBucket[gid] = (genreBucket[gid] ?? 0) + 1;
  }

  const entry: LikedEntry = { id: movie.id, title: movie.title };
  const bucket = liked ? next.liked : next.disliked;
  const oppositeBucket = liked ? next.disliked : next.liked;
  const oppIdx = oppositeBucket.findIndex((e) => e.id === movie.id);
  if (oppIdx !== -1) oppositeBucket.splice(oppIdx, 1);
  if (!bucket.some((e) => e.id === movie.id)) bucket.push(entry);
  if (bucket.length > MAX_ENTRIES) bucket.splice(0, bucket.length - MAX_ENTRIES);

  return next;
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
  const disliked = topGenreIds(profile.dislikedGenres, 3)
    .map((id) => GENRE_ID_TO_KEY[id])
    .filter(Boolean);
  if (!liked.length && !disliked.length) return null;
  const parts: string[] = [];
  if (liked.length) parts.push(`previously enjoyed genres: ${liked.join(", ")}`);
  if (disliked.length) parts.push(`previously disliked genres: ${disliked.join(", ")}`);
  return parts.join("; ");
}
