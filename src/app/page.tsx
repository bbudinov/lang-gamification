"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { initSpeech, speakAndWait, stopSpeech } from "@/lib/speech";

const STORY_PARTS = [
  "Преди много, много години, насред безкрайния океан, съществувал магически свят — ЛангУърлд.",
  "Всеки остров пазел тайните на различни думи и езици. Но с времето хората забравили тези тайни и островите потънали в мъгла.",
  "Само един смел изследовател можел да ги събуди отново — и този изследовател си ТИ!",
  "Професор Глоуб ще ти бъде водач. Открий всеки остров, научи думите му и събери най-голямата награда на света — ПОЗНАНИЕТО!",
  // Pause before the joke
  "Хахаха, шегичка! Естествено, че знанието е важно, но ще има и други награди — точки, звезди и изненади по пътя!",
];

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [storyLine, setStoryLine] = useState("");
  const skippedRef = useRef(false);

  useEffect(() => {
    initSpeech();
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      skippedRef.current = true;
      stopSpeech();
    };
  }, []);

  const handleStart = async () => {
    if (narrating) return;
    setNarrating(true);
    skippedRef.current = false;

    // Unlock speech via user gesture
    stopSpeech();

    for (let i = 0; i < STORY_PARTS.length; i++) {
      if (skippedRef.current) return;

      const text = STORY_PARTS[i];
      setStoryLine(text);

      // Add a 2-second pause before the joke (last part)
      if (i === STORY_PARTS.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
        if (skippedRef.current) return;
      }

      await speakAndWait(text, "bg", 20000);

      if (skippedRef.current) return;

      // Small pause between parts
      await new Promise((r) => setTimeout(r, 800));
    }

    if (!skippedRef.current) {
      // Short pause after story ends before navigating
      await new Promise((r) => setTimeout(r, 1500));
      if (!skippedRef.current) {
        router.replace("/map");
      }
    }
  };

  const handleSkip = () => {
    skippedRef.current = true;
    stopSpeech();
    router.replace("/map");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-6">
      <div className="text-7xl mb-6 animate-bounce">🌍</div>
      <h1 className="text-4xl font-bold text-white mb-2">LangWorld</h1>
      <p className="text-slate-400 text-sm mb-10">Learn languages through play</p>

      {!narrating ? (
        <button
          onClick={handleStart}
          className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-semibold px-10 py-4 rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-all ${
            ready ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          Start Playing
        </button>
      ) : (
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Professor Globe narrating */}
          <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 min-h-[100px]">
            <span className="text-4xl shrink-0">🌐</span>
            <p className="text-white text-sm leading-relaxed text-left animate-pulse">
              {storyLine}
            </p>
          </div>

          <button
            onClick={handleSkip}
            className="text-slate-500 text-xs active:text-white transition-colors"
          >
            Skip story →
          </button>
        </div>
      )}
    </div>
  );
}
