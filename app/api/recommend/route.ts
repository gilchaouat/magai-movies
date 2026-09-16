import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRecommendations } from "@/lib/recommend";
import { TmdbConfigError } from "@/lib/tmdb";
import { TASTE_COOKIE, decodeProfile } from "@/lib/taste";
import type { Preferences } from "@/lib/types";

function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    Array.isArray(p.genres) &&
    Array.isArray(p.excludeGenres) &&
    typeof p.summary === "string" &&
    typeof p.assistantReply === "string"
  );
}

export async function POST(request: Request) {
  let body: { query?: unknown; previousPreferences?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "Missing 'query' string" }, { status: 400 });
  }
  const previousPreferences = isPreferences(body.previousPreferences)
    ? body.previousPreferences
    : null;

  try {
    const cookieStore = await cookies();
    const profile = decodeProfile(cookieStore.get(TASTE_COOKIE)?.value);
    const result = await getRecommendations(query, profile, previousPreferences);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TmdbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
