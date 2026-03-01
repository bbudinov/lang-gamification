"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { initSpeech, playPhraseAudioAndWait, stopAudio } from "@/lib/speech";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [globeEmotion, setGlobeEmotion] = useState<"idle" | "happy" | "thinking" | "surprised">("idle");
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
      stopAudio();
    };
  }, []);

  const handleStart = async () => {
    if (narrating) return;
    setNarrating(true);
    skippedRef.current = false;

    for (let i = 0; i < STORY_PARTS.length; i++) {
      if (skippedRef.current) return;

      setStoryLine(STORY_PARTS[i]);
      setGlobeEmotion(i === STORY_PARTS.length - 1 ? "happy" : i === 2 ? "surprised" : "idle");

      // Add a 2-second pause before the joke (last part)
      if (i === STORY_PARTS.length - 1) {
        setIsSpeaking(false);
        setGlobeEmotion("thinking");
        await new Promise((r) => setTimeout(r, 2000));
        if (skippedRef.current) return;
        setGlobeEmotion("happy");
      }

      setIsSpeaking(true);
      await playPhraseAudioAndWait(`story${i + 1}`, 25000);
      setIsSpeaking(false);

      if (skippedRef.current) return;

      // Small pause between parts
      await new Promise((r) => setTimeout(r, 800));
    }

    if (!skippedRef.current) {
      await new Promise((r) => setTimeout(r, 1500));
      if (!skippedRef.current) {
        router.replace("/map");
      }
    }
  };

  const handleSkip = () => {
    skippedRef.current = true;
    stopAudio();
    router.replace("/map");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628] px-6">
      <img src="/icons/icon-192.png" alt="LangWorld" className="w-24 h-24 mb-6 animate-bounce" />
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
          <div className="flex flex-col items-center gap-4">
            <ProfessorGlobe
              size={96}
              speaking={isSpeaking}
              emotion={globeEmotion}
            />
            <div className="bg-white/5 rounded-2xl p-4 min-h-[80px] w-full">
              <p className="text-white text-sm leading-relaxed text-center">
                {storyLine}
              </p>
            </div>
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
