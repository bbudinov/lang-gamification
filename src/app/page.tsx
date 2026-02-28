"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initSpeech, speak } from "@/lib/speech";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Preload voices and try to speak welcome
  useEffect(() => {
    initSpeech();
    const timer = setTimeout(() => {
      setReady(true);
      // Try welcome speech (works if user previously interacted with the site)
      try {
        const welcome = new SpeechSynthesisUtterance("Welcome to the LangWorld game!");
        welcome.lang = "en-US";
        welcome.rate = 0.9;
        welcome.pitch = 1.1;
        window.speechSynthesis?.speak(welcome);
      } catch {
        // Blocked by auto-play policy on first visit — that's OK
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    // Unlock speech via user gesture, then say "Enjoy the game"
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Enjoy the game!");
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
    // Navigate after a short delay so speech starts
    setTimeout(() => router.replace("/map"), 600);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628]">
      <div className="text-7xl mb-6 animate-bounce">🌍</div>
      <h1 className="text-4xl font-bold text-white mb-2">LangWorld</h1>
      <p className="text-slate-400 text-sm mb-10">Learn languages through play</p>

      <button
        onClick={handleStart}
        className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-semibold px-10 py-4 rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-all ${
          ready ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        Start Playing
      </button>
    </div>
  );
}
