"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";

const PET_STAGES = ["🥚", "🐣", "🐲", "🐉"] as const;

const SPEECH_HAPPY = ["Let's play!", "I love you!", "Yay!"];
const SPEECH_OKAY = ["Play with me?", "I'm okay!", "Hi there!"];
const SPEECH_SLEEPY = ["*yawn*", "So tired...", "Zzz..."];
const SPEECH_SAD = ["I'm hungry!", "Feed me!", "Play a game?"];

function getMood(lastFedAt: string): { label: string; emoji: string; speeches: string[] } {
  if (!lastFedAt) return { label: "Hungry", emoji: "😢", speeches: SPEECH_SAD };
  const hours = (Date.now() - new Date(lastFedAt).getTime()) / (1000 * 60 * 60);
  if (hours < 24) return { label: "Happy", emoji: "😊", speeches: SPEECH_HAPPY };
  if (hours < 48) return { label: "Okay", emoji: "😐", speeches: SPEECH_OKAY };
  if (hours < 72) return { label: "Sleepy", emoji: "😴", speeches: SPEECH_SLEEPY };
  return { label: "Sad", emoji: "😢", speeches: SPEECH_SAD };
}

export function PetWidget() {
  const router = useRouter();
  const pet = useProgressStore((s) => s.pet);
  const [showBubble, setShowBubble] = useState(false);
  const [speech, setSpeech] = useState("");

  if (!pet) return null;

  const mood = getMood(pet.lastFedAt);
  const gamesLeft = 3 - pet.gamesSinceLastFeed;

  const handleTap = () => {
    if (showBubble) {
      setShowBubble(false);
      return;
    }
    const pick = mood.speeches[Math.floor(Math.random() * mood.speeches.length)];
    setSpeech(pick);
    setShowBubble(true);
    setTimeout(() => setShowBubble(false), 2500);
  };

  return (
    <div className="absolute bottom-5 right-4" style={{ zIndex: 9999 }}>
      {/* Speech bubble */}
      {showBubble && (
        <div className="absolute -top-12 right-0 bg-white rounded-xl px-3 py-1.5 shadow-lg animate-in fade-in zoom-in duration-200">
          <p className="text-xs font-medium text-slate-800 whitespace-nowrap">{speech}</p>
          <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white rotate-45" />
        </div>
      )}

      {/* Pet button */}
      <button
        onClick={handleTap}
        onDoubleClick={() => router.push("/shop")}
        className="relative w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center active:scale-90 transition-transform"
        style={{ animation: "pet-idle 2s ease-in-out infinite" }}
      >
        <span className="text-3xl">{PET_STAGES[pet.stage]}</span>
        {/* Mood indicator */}
        <span className="absolute -top-1 -right-1 text-sm">{mood.emoji}</span>
        {/* Feed progress dots */}
        <div className="absolute -bottom-1 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < 3 - gamesLeft ? "bg-green-400" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </button>

      <style jsx>{`
        @keyframes pet-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
