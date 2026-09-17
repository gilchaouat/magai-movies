import type { Metadata, Viewport } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const frankRuhl = Frank_Ruhl_Libre({
  variable: "--font-frank",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const viewport: Viewport = {
  themeColor: "#17140f",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MAGAI Movies — מה נראה הערב?",
    template: "%s — MAGAI Movies",
  },
  description: "כתוב מה בא לך לראות — ונבנה לך רשימת המלצות סרטים אישית, חיה ומעודכנת.",
  openGraph: {
    siteName: "MAGAI Movies",
    type: "website",
    locale: "he_IL",
  },
  twitter: {
    card: "summary_large_image",
  },
  // Lets someone add this to their iPhone home screen (Safari share menu ->
  // "Add to Home Screen") and have it open full-screen like a real app,
  // instead of as another browser tab.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MAGAI Movies",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${frankRuhl.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
