import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "MAGAI",
    description: "כתוב מה בא לך לראות — ונבנה לך רשימת המלצות סרטים אישית, חיה ומעודכנת.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#17140f",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
