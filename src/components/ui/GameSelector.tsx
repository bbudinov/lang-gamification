"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { playPhraseAudioAndWait } from "@/lib/speech";
import type { TopicId } from "@/types";

const PHRASE_IDS = [
  "motiv1", "motiv2", "motiv3", "motiv4",
  "motiv5", "motiv6", "motiv7", "motiv8",
];

let phraseIndex = 0;

interface GameSelectorProps {
  topicId: TopicId;
  topicName: string;
  topicEmoji: string;
  onClose: () => void;
}

const GAMES = [
  {
    type: "memory-match",
    name: "Memory Match",
    emoji: "🃏",
    description: "Flip cards and find matching pairs",
  },
  {
    type: "word-quiz",
    name: "Word Quiz",
    emoji: "🎯",
    description: "Listen and pick the right translation",
  },
  {
    type: "true-false",
    name: "True or False",
    emoji: "✅",
    description: "Is this translation correct?",
  },
  {
    type: "word-scramble",
    name: "Word Scramble",
    emoji: "🔤",
    description: "Unscramble letters to spell the word",
  },
];

export function GameSelector({ topicId, topicName, topicEmoji, onClose }: GameSelectorProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const handleGameSelect = async (gameType: string) => {
    if (navigating) return;
    setNavigating(true);

    const phraseId = PHRASE_IDS[phraseIndex % PHRASE_IDS.length];
    phraseIndex++;

    // Wait for phrase to finish, then navigate
    await playPhraseAudioAndWait(phraseId, 3000);
    router.push(`/game/${topicId}/${gameType}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a2744] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <span className="text-3xl">{topicEmoji}</span>
          <h2 className="text-xl font-bold text-white mt-1">{topicName}</h2>
          <p className="text-slate-400 text-sm">Choose a game</p>
        </div>

        <div className="space-y-3">
          {GAMES.map((game) => (
            <button
              key={game.type}
              onClick={() => handleGameSelect(game.type)}
              disabled={navigating}
              className={`w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-xl p-4 transition-colors text-left ${
                navigating ? "opacity-50 cursor-default" : ""
              }`}
            >
              <span className="text-3xl">{game.emoji}</span>
              <div>
                <p className="text-white font-semibold">{game.name}</p>
                <p className="text-slate-400 text-xs">{game.description}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 text-slate-400 text-sm py-2 active:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
