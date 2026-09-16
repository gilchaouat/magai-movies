"use client";

import { TASTE_COOKIE, decodeProfile, encodeProfile, type TasteProfile } from "./taste";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

export function readTasteProfile(): TasteProfile {
  if (typeof document === "undefined") return decodeProfile(null);
  return decodeProfile(readCookie(TASTE_COOKIE));
}

export function writeTasteProfile(profile: TasteProfile) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${TASTE_COOKIE}=${encodeProfile(profile)}; path=/; max-age=${oneYear}; samesite=lax`;
}
