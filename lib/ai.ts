import { GENRE_IDS } from "./config";
import type { Preferences } from "./types";

const ALLOWED_GENRES = Object.keys(GENRE_IDS).filter(
  (g) => g !== "scifi" // keep one canonical spelling for the LLM
);

export type AiProvider = "anthropic" | "openai" | null;

export function activeAiProvider(): AiProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

class AiCallError extends Error {}

async function callAnthropic(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiCallError(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new AiCallError("Anthropic response had no text content");
  return text as string;
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiCallError(`OpenAI API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new AiCallError("OpenAI response had no content");
  return text as string;
}

async function callLLM(system: string, user: string): Promise<string> {
  const provider = activeAiProvider();
  if (provider === "anthropic") return callAnthropic(system, user);
  if (provider === "openai") return callOpenAI(system, user);
  throw new AiCallError("No AI provider configured");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new AiCallError("No JSON object found in AI response");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function currentYear(): number {
  return new Date().getFullYear();
}

function sanitizeGenreList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const g of input) {
    if (typeof g !== "string") continue;
    const key = g.trim().toLowerCase();
    if (ALLOWED_GENRES.includes(key) && !out.includes(key)) out.push(key);
  }
  return out;
}

function coercePreferences(raw: unknown, fallbackSummary: string): Preferences {
  const r = (raw ?? {}) as Record<string, unknown>;
  const maxRuntime = typeof r.max_runtime === "number" ? Math.round(r.max_runtime) : null;
  const minRuntime = typeof r.min_runtime === "number" ? Math.round(r.min_runtime) : null;
  const minYear = typeof r.min_year === "number" ? Math.round(r.min_year) : null;
  const maxYear = typeof r.max_year === "number" ? Math.round(r.max_year) : null;
  return {
    genres: sanitizeGenreList(r.genres),
    excludeGenres: sanitizeGenreList(r.exclude_genres),
    maxRuntime: maxRuntime && maxRuntime > 0 && maxRuntime < 400 ? maxRuntime : null,
    minRuntime: minRuntime && minRuntime > 0 && minRuntime < 400 ? minRuntime : null,
    minYear: minYear && minYear > 1900 && minYear <= currentYear() + 1 ? minYear : null,
    maxYear: maxYear && maxYear > 1900 && maxYear <= currentYear() + 1 ? maxYear : null,
    highlyRated: r.highly_rated === true,
    tone: typeof r.tone === "string" && r.tone.trim() ? r.tone.trim() : null,
    audience: typeof r.audience === "string" && r.audience.trim() ? r.audience.trim() : null,
    summary:
      typeof r.summary === "string" && r.summary.trim()
        ? r.summary.trim()
        : fallbackSummary,
  };
}

const PREFS_SYSTEM_PROMPT = `You convert a free-text movie-watching request (often in Hebrew, sometimes English) into structured search preferences for a movie database query.

Respond with ONLY a JSON object, no prose, matching exactly this shape:
{
  "genres": string[],          // chosen only from: ${ALLOWED_GENRES.join(", ")}
  "exclude_genres": string[],  // same allowed list, genres to avoid
  "max_runtime": number|null,  // minutes, if the user gave an upper time bound
  "min_runtime": number|null,  // minutes, if the user gave a lower time bound
  "min_year": number|null,     // e.g. if user wants "last 3 years", compute from current year ${currentYear()}
  "max_year": number|null,
  "highly_rated": boolean,     // true if the user wants high quality / highly rated / best
  "tone": string|null,         // short descriptor, e.g. "smart", "light", "dark", "feel-good"
  "audience": string|null,     // e.g. "couple", "family", "teenagers", "solo"
  "summary": string            // one short Hebrew sentence paraphrasing the request
}

Rules:
- Only use genres from the allowed list above (in English, lowercase, exactly as spelled).
- If the request excludes something (e.g. "בלי אימה" = no horror), put it in exclude_genres.
- Infer max_runtime from phrases like "עד שעתיים" (up to 2 hours) -> 120, "under 90 minutes" -> 90.
- Infer min_year from phrases like "מהשנים האחרונות" or "last 3 years" using the current year.
- If nothing is specified for a field, use null (or false for highly_rated, or [] for genre arrays).
- Never invent genres outside the allowed list.`;

const HEURISTIC_GENRE_TERMS: { key: string; terms: string[] }[] = [
  { key: "thriller", terms: ["מותחן", "מתח", "thriller"] },
  { key: "comedy", terms: ["קומדיה", "קליל", "מצחיק", "comedy", "funny"] },
  { key: "drama", terms: ["דרמה", "drama"] },
  { key: "documentary", terms: ["דוקו", "תיעודי", "documentary"] },
  { key: "family", terms: ["משפחתי", "family", "ילדים"] },
  { key: "horror", terms: ["אימה", "אימה", "horror", "scary"] },
  { key: "action", terms: ["אקשן", "action"] },
  { key: "romance", terms: ["רומנטי", "רומנטיקה", "romance", "רומנס"] },
  { key: "animation", terms: ["אנימציה", "animation", "מצויר"] },
  { key: "crime", terms: ["פשע", "crime"] },
  { key: "mystery", terms: ["תעלומה", "מיסתורין", "mystery"] },
  { key: "science fiction", terms: ["מדע בדיוני", "sci-fi", "scifi", "science fiction"] },
  { key: "fantasy", terms: ["פנטזיה", "fantasy"] },
  { key: "war", terms: ["מלחמה", "war"] },
  { key: "music", terms: ["מוזיקלי", "מוזיקה", "musical", "music"] },
];

function heuristicParse(query: string): Preferences {
  const q = query.toLowerCase();
  const genres: string[] = [];
  const excludeGenres: string[] = [];

  for (const { key, terms } of HEURISTIC_GENRE_TERMS) {
    const matchedTerm = terms.find((t) => q.includes(t.toLowerCase()));
    if (!matchedTerm) continue;
    const negated = ["בלי ", "ללא ", "no "].some((neg) =>
      q.includes(`${neg}${matchedTerm.toLowerCase()}`)
    );
    if (negated) excludeGenres.push(key);
    else genres.push(key);
  }

  let maxRuntime: number | null = null;
  const hoursMatch = q.match(/עד\s+(\d+(?:\.\d+)?)\s*שע/) || q.match(/under\s+(\d+)\s*h/);
  if (hoursMatch) maxRuntime = Math.round(parseFloat(hoursMatch[1]) * 60);
  const minutesMatch = q.match(/עד\s+(\d+)\s*דק/) || q.match(/under\s+(\d+)\s*min/);
  if (minutesMatch) maxRuntime = parseInt(minutesMatch[1], 10);
  if (q.includes("שעתיים") && !maxRuntime) maxRuntime = 120;

  let minYear: number | null = null;
  const yearsMatch = q.match(/(\d+)\s*שנים האחרונות/) || q.match(/last\s+(\d+)\s*years?/);
  if (yearsMatch) minYear = currentYear() - parseInt(yearsMatch[1], 10);

  const highlyRated =
    /מדורג גבוה|מומלץ ביותר|best|highly rated|high rating|איכותי|הכי טוב/.test(q);

  let audience: string | null = null;
  if (q.includes("זוג")) audience = "couple";
  else if (q.includes("משפחה") || q.includes("ילדים")) audience = "family";
  else if (q.includes("נוער") || q.includes("teen")) audience = "teenagers";

  let tone: string | null = null;
  if (q.includes("קליל")) tone = "light";
  if (q.includes("איכותי") || q.includes("חכם") || q.includes("smart")) tone = "smart";

  return {
    genres,
    excludeGenres,
    maxRuntime,
    minRuntime: null,
    minYear,
    maxYear: null,
    highlyRated,
    tone,
    audience,
    summary: query,
  };
}

export async function parsePromptToPreferences(query: string): Promise<{
  preferences: Preferences;
  usedAI: boolean;
  aiError: string | null;
}> {
  const provider = activeAiProvider();
  if (!provider) {
    return { preferences: heuristicParse(query), usedAI: false, aiError: null };
  }
  try {
    const raw = await callLLM(PREFS_SYSTEM_PROMPT, query);
    const json = extractJson(raw);
    return {
      preferences: coercePreferences(json, query),
      usedAI: true,
      aiError: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI error";
    return { preferences: heuristicParse(query), usedAI: false, aiError: message };
  }
}

export type BlurbInput = {
  id: number;
  title: string;
  overview: string;
  year: string | null;
  runtime: number | null;
  rating: number | null;
  genres: string[];
};

export type BlurbOutput = Record<number, { overview: string; why: string }>;

export async function writeEditorialBlurbs(
  query: string,
  preferencesSummary: string,
  movies: BlurbInput[]
): Promise<BlurbOutput> {
  if (!activeAiProvider() || movies.length === 0) return {};
  const system = `You are an editorial movie critic writing for a premium Hebrew recommendation site called "MAGAI Movies".
For each movie given, write:
- "overview": a punchy 1-2 sentence Hebrew editorial description (spoiler-free).
- "why": one short Hebrew sentence explaining specifically why this movie matches the user's request.

Respond with ONLY a JSON object shaped like:
{ "<movie id>": { "overview": "...", "why": "..." }, ... }
Use natural, elegant Hebrew. Do not invent plot details not implied by the provided overview.`;
  const user = JSON.stringify({
    user_request: query,
    interpreted_preferences: preferencesSummary,
    movies: movies.map((m) => ({
      id: m.id,
      title: m.title,
      original_overview: m.overview,
      year: m.year,
      runtime_minutes: m.runtime,
      rating: m.rating,
      genres: m.genres,
    })),
  });
  try {
    const raw = await callLLM(system, user);
    const json = extractJson(raw) as Record<string, { overview?: string; why?: string }>;
    const out: BlurbOutput = {};
    for (const m of movies) {
      const entry = json[String(m.id)];
      if (entry?.overview && entry?.why) {
        out[m.id] = { overview: entry.overview, why: entry.why };
      }
    }
    return out;
  } catch {
    return {};
  }
}
