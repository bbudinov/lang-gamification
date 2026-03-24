"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { initSpeech, playPhraseAudioAndWait, stopAudio } from "@/lib/speech";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";

const AvatarCanvas = dynamic(() => import("@/components/avatar/AvatarCanvas"), { ssr: false });

const STORY_PARTS = [
  "A long, long time ago, in the middle of an endless ocean, there was a magical world — LangWorld.",
  "Every island held the secrets of different words and languages. But over time, people forgot these secrets and the islands sank into fog.",
  "Only one brave explorer could wake them up again — and that explorer is YOU!",
  "Professor Globe will be your guide. Discover every island, learn its words, and collect the greatest treasure in the world — KNOWLEDGE!",
  // Pause before the joke
  "Hahaha, just kidding! Of course knowledge is important, but there will be other rewards too — points, stars, and surprises along the way!",
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
    <div className="h-screen w-screen bg-[#0a1628] flex flex-col items-center relative overflow-hidden">
      {/* 3D Avatar — fullscreen background */}
      <div className="absolute inset-0 z-0">
        <AvatarCanvas isSpeaking={isSpeaking} />
      </div>

      {/* Gradient overlay for text readability */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(10,22,40,0.3) 0%, transparent 30%, transparent 50%, rgba(10,22,40,0.7) 65%, rgba(10,22,40,0.95) 80%)",
        }}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Content at bottom */}
      <div className="relative z-10 w-full px-6 pb-12">
        {!narrating ? (
          <div className="flex flex-col items-center">
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
        ) : (
          <div className="w-full max-w-md mx-auto space-y-6 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-h-[80px] w-full">
              <p className="text-white text-sm leading-relaxed text-center">
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
    </div>
  );
}
