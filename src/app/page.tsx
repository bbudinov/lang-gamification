"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initSpeech } from "@/lib/speech";

export default function Home() {
  const router = useRouter();

  // Preload voices as early as possible
  useEffect(() => {
    initSpeech();
  }, []);

  const handleStart = () => {
    // Unlock speech synthesis via user gesture
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(".");
      utterance.volume = 0.01;
      utterance.rate = 10;
      window.speechSynthesis.speak(utterance);
    }
    router.replace("/map");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628]">
      <div className="text-7xl mb-6 animate-bounce">🌍</div>
      <h1 className="text-4xl font-bold text-white mb-2">LangWorld</h1>
      <p className="text-slate-400 text-sm mb-10">Learn languages through play</p>

      <button
        onClick={handleStart}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-semibold px-10 py-4 rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
      >
        Start Playing
      </button>
    </div>
  );
}
