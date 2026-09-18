"use client";

import { useState } from "react";
import Link from "next/link";

type Device = "ios" | "android" | "desktop";

const TABS: { id: Device; label: string }[] = [
  { id: "ios", label: "📱 אייפון" },
  { id: "android", label: "🤖 אנדרואיד" },
  { id: "desktop", label: "💻 מחשב" },
];

function StepNum({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink/15 text-xs font-extrabold text-ink/50">
      {n}
    </span>
  );
}

function openInSafari() {
  // iOS-only trick: prefixing the URL scheme with "x-safari-" hands the page
  // off to the real Safari app, escaping WhatsApp/Instagram/etc.'s in-app
  // browser. Unofficial (Apple doesn't document or guarantee it), but
  // harmless if it does nothing — if we're already in Safari, or on
  // Android/desktop, this simply has no effect.
  const bare = window.location.href.replace(/^https?:\/\//, "");
  window.location.href = "x-safari-https://" + bare;
}

export default function InstallGuide() {
  const [device, setDevice] = useState<Device>("ios");

  return (
    <main className="mx-auto max-w-md px-6 py-14 text-center">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-accent">
        MAGAI Movies
      </p>

      <h1 className="font-serif text-3xl font-bold leading-tight text-ink sm:text-4xl">
        לא יודעים מה לצפות הערב?
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink/60">
        MAGAI Movies הוא עוזר AI שממליץ לכם על סרטים בעברית, מותאם בדיוק לטעם שלכם, עם קישור ישיר
        לצפייה בנטפליקס — ולומד ומשתפר ככל שאתם משתמשים בו.
      </p>

      {/* Primary action: just start using it, in whatever browser is
          already open — no escaping, no install. Everything below is
          entirely optional and secondary. */}
      <Link
        href="/"
        className="mt-6 block w-full rounded-2xl bg-accent px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-accent/30 transition hover:bg-accent-dark"
      >
        🎬 התחילו לצפות עכשיו
      </Link>

      <div className="my-8 flex items-center gap-3 text-xs font-bold text-ink/40">
        <span className="h-px flex-1 bg-ink/10" />
        רוצים גישה מהירה יותר בפעם הבאה?
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <p className="text-[15px] font-extrabold text-ink">התקינו כמו אפליקציה</p>
      <p className="mt-1 text-xs text-ink/50">30 שניות, בלי חנות אפליקציות</p>

      <div className="mt-4 flex gap-1 rounded-full bg-paper-dim p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setDevice(tab.id)}
            className={`flex-1 rounded-full px-2 py-2 text-[13px] font-bold transition ${
              device === tab.id ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 text-right shadow-sm ring-1 ring-black/5">
        {device === "ios" && (
          <ol className="list-none">
            <li className="flex gap-3">
              <StepNum n={1} />
              <div>
                <p className="pt-0.5 text-sm text-ink">ודאו שאתם בספארי</p>
                <button
                  type="button"
                  onClick={openInSafari}
                  className="mt-2 rounded-xl bg-ink px-4 py-2.5 text-[13.5px] font-extrabold text-white hover:bg-black"
                >
                  🧭 פתחו בספארי
                </button>
              </div>
            </li>
            <li className="mt-4 flex gap-3 border-t border-ink/10 pt-4">
              <StepNum n={2} />
              <p className="pt-0.5 text-sm text-ink">
                לחצו על כפתור השיתוף ⬆️ למטה, ובחרו <b>הוסף למסך הבית</b>
              </p>
            </li>
            <li className="mt-4 flex gap-3 border-t border-ink/10 pt-4">
              <StepNum n={3} />
              <p className="pt-0.5 text-sm text-ink">
                לחצו <b>הוסף</b> — האייקון יופיע על מסך הבית שלכם
              </p>
            </li>
          </ol>
        )}
        {device === "android" && (
          <ol className="list-none">
            <li className="flex gap-3">
              <StepNum n={1} />
              <p className="pt-0.5 text-sm text-ink">
                פתחו את הקישור ב-Chrome — לרוב יופיע באנר &quot;התקן&quot;, לחצו עליו
              </p>
            </li>
            <li className="mt-4 flex gap-3 border-t border-ink/10 pt-4">
              <StepNum n={2} />
              <p className="pt-0.5 text-sm text-ink">
                לא רואים באנר? תפריט ⋮ למעלה ← <b>הוסף למסך הבית</b>
              </p>
            </li>
          </ol>
        )}
        {device === "desktop" && (
          <p className="text-sm text-ink">אין צורך בהתקנה — פשוט המשיכו בדפדפן.</p>
        )}
      </div>
    </main>
  );
}
