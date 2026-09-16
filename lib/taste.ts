import { GENRE_ID_TO_KEY } from "./config";

export const TASTE_COOKIE = "magai_taste";
const MAX_IDS = 25;

export type TasteProfile = {
  likedGenres: Record<string, number>;
  dislikedGenres: Record<string, number>;
  likedIds: number[];
  dislikedIds: number[];
};

export function emptyProfile(): TasteProfile {
  return { likedGenres: {}, dislikedGenres: {}, likedIds: [], dislikedIds: [] };
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
      likedIds: Array.isArray(parsed.likedIds) ? parsed.likedIds.slice(-MAX_IDS) : [],
      dislikedIds: Array.isArray(parsed.dislikedIds) ? parsed.dislikedIds.slice(-MAX_IDS) : [],
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
  movie: { id: number; genreIds: number[] },
  liked: boolean
): TasteProfile {
  const next: TasteProfile = {
    likedGenres: { ...profile.likedGenres },
    dislikedGenres: { ...profile.dislikedGenres },
    likedIds: [...profile.likedIds],
    dislikedIds: [...profile.dislikedIds],
  };

  const genreBucket = liked ? next.likedGenres : next.dislikedGenres;
  for (const gid of movie.genreIds) {
    genreBucket[gid] = (genreBucket[gid] ?? 0) + 1;
  }

  const idBucket = liked ? next.likedIds : next.dislikedIds;
  const oppositeBucket = liked ? next.dislikedIds : next.likedIds;
  const oppIdx = oppositeBucket.indexOf(movie.id);
  if (oppIdx !== -1) oppositeBucket.splice(oppIdx, 1);
  if (!idBucket.includes(movie.id)) idBucket.push(movie.id);
  if (idBucket.length > MAX_IDS) idBucket.splice(0, idBucket.length - MAX_IDS);

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
