"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { TalkingAvatar } from "@/components/avatar/TalkingAvatar";

// Sample words to test lip sync
const TEST_WORDS = [
  { id: "a1", label: "Cat" },
  { id: "a2", label: "Dog" },
  { id: "a8", label: "Elephant" },
  { id: "a9", label: "Lion" },
  { id: "a14", label: "Giraffe" },
  { id: "a15", label: "Crocodile" },
  { id: "f1", label: "Bread" },
  { id: "f4", label: "Apple" },
  { id: "f10", label: "Cake" },
];

function AvatarScene() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lipsyncData, setLipsyncData] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWord, setCurrentWord] = useState("");

  const playWord = async (wordId: string, label: string) => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setCurrentWord(label);

    // Load lipsync data
    try {
      const res = await fetch(`/lipsync/en/${wordId}.json`);
      if (res.ok) {
        const data = await res.json();
        setLipsyncData(data);
      } else {
        setLipsyncData(null);
      }
    } catch {
      setLipsyncData(null);
    }

    // Create and play audio
    const audio = new Audio(`/audio/en/${wordId}.mp3`);
    audioRef.current = audio;

    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      setCurrentWord("");
    };
    audio.onpause = () => setIsSpeaking(false);

    audio.play().catch(() => {});
  };

  return (
    <div className="h-screen w-screen bg-[#0a1628] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 text-center">
        <h1 className="text-white text-2xl font-bold">3D Avatar Lip Sync Test</h1>
        <p className="text-slate-400 text-sm mt-1">
          {currentWord
            ? `Speaking: "${currentWord}"`
            : "Tap a word to test lip sync"}
        </p>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 0, 2.2], fov: 35 }}
          style={{ background: "linear-gradient(180deg, #1a2744 0%, #0a1628 100%)" }}
        >
          <ambientLight intensity={0.7} color="#e8e0d8" />
          <directionalLight position={[2, 3, 2]} intensity={1.2} color="#fff0e0" />
          <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#6090c0" />

          <Suspense fallback={null}>
            <TalkingAvatar
              audioRef={audioRef}
              lipsyncData={lipsyncData}
              isSpeaking={isSpeaking}
              smoothing={0.5}
              headFollow={true}
              scale={1.5}
              position={[0, -2.2, 0]}
            />
          </Suspense>

          <OrbitControls
            target={[0, -0.3, 0]}
            enableZoom={true}
            enablePan={false}
            minDistance={1}
            maxDistance={5}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-blue-500/20 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="flex gap-0.5 items-end">
              <div className="w-1 bg-blue-400 rounded-full animate-sound-1" style={{ height: 8 }} />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-2" style={{ height: 14 }} />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-3" style={{ height: 8 }} />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-2" style={{ height: 14 }} />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-1" style={{ height: 8 }} />
            </div>
            <span className="text-blue-300 text-sm font-medium ml-1">Speaking...</span>
          </div>
        )}
      </div>

      {/* Word buttons */}
      <div className="px-4 py-4 pb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {TEST_WORDS.map((w) => (
            <button
              key={w.id}
              onClick={() => playWord(w.id, w.label)}
              disabled={isSpeaking}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                currentWord === w.label
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white/10 text-white hover:bg-white/20"
              } ${isSpeaking && currentWord !== w.label ? "opacity-40" : ""}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes sound-wave {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
        .animate-sound-1 { animation: sound-wave 0.4s ease-in-out infinite; }
        .animate-sound-2 { animation: sound-wave 0.4s ease-in-out 0.1s infinite; }
        .animate-sound-3 { animation: sound-wave 0.4s ease-in-out 0.2s infinite; }
      `}</style>
    </div>
  );
}

export default function AvatarTestPage() {
  return <AvatarScene />;
}
