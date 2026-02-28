"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { initSpeech, playPhraseAudioAndWait, stopAudio } from "@/lib/speech";

const STORY_PARTS = [
  "Предѝ мно́го, мно́го годи́ни, насре́д безкра́йния океа́н, съществу́вал маги́чески свя́т — Ла́нгУърлд.",
  "Все́ки о́стров па́зел та́йните на́ разли́чни ду́ми и ези́ци. Но́ с вре́мето хо́рата забра́вили те́зи та́йни и о́стровите потъ́нали в мъгла́.",
  "Са́мо еди́н сме́л изследова́тел мо́жел да ги събу́ди отно́во — и то́зи изследова́тел си ТИ́!",
  "Профе́сор Гло́уб ще ти бъ́де вода́ч. Откри́й все́ки о́стров, научи́ ду́мите му и събери́ на́й-голя́мата награ́да на света́ — ПОЗНА́НИЕТО!",
  // Pause before the joke
  "Ха́ха́ха́, шеги́чка! Есте́ствено, че зна́нието е ва́жно, но ще и́ма и дру́ги награ́ди — то́чки, звезди́ и изнена́ди по пъ́тя!",
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

      // Add a 2-second pause before the joke (last part)
      if (i === STORY_PARTS.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
        if (skippedRef.current) return;
      }

      await playPhraseAudioAndWait(`story${i + 1}`, 25000);

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
