import { NextResponse } from "next/server";
import { getRecommendations } from "@/lib/recommend";
import { TmdbConfigError } from "@/lib/tmdb";

export async function POST(request: Request) {
  let body: { query?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "Missing 'query' string" }, { status: 400 });
  }

  try {
    const result = await getRecommendations(query);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TmdbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
