import { NextResponse } from "next/server";
import { writeEditorialBlurbs, type BlurbInput } from "@/lib/ai";

function isBlurbInput(value: unknown): value is BlurbInput {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "number" &&
    typeof m.title === "string" &&
    typeof m.overview === "string" &&
    Array.isArray(m.genres)
  );
}

// Deliberately separate from /api/recommend: writing full editorial copy for
// several movies is the slowest step in a search, and the client already has
// posters/titles/ratings on screen by the time it calls this — so a search
// feels fast even though this request can still take several seconds.
export async function POST(request: Request) {
  let body: { query?: unknown; prefsSummary?: unknown; movies?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const prefsSummary = typeof body.prefsSummary === "string" ? body.prefsSummary : "";
  const movies = Array.isArray(body.movies) ? body.movies.filter(isBlurbInput) : [];

  if (!query || movies.length === 0) {
    return NextResponse.json({ blurbs: {}, error: null });
  }

  const { blurbs, error } = await writeEditorialBlurbs(query, prefsSummary, movies);
  return NextResponse.json({ blurbs, error });
}
