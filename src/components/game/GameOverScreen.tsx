"use client";

import { useRouter } from "next/navigation";
import { npcs } from "@/data/npcs";

// NPC reactions when player loses all lives
const NPC_GAMEOVER_REACTIONS: Record<string, string> = {
  animals: "Oh no! The animals got away! 🐇💨 Want to try again?",
  colors: "The painting got smudged! 🎨 Let's try one more time!",
  food: "Oops, the kitchen is messy! 🍳 Let's cook again!",
  numbers: "Error! Error! 🤖 Recalculating... Try again?",
  family: "Oh dear! Don't worry, everyone makes mistakes! 👵💕",
  body: "The patient needs you! 🩺 One more try?",
  weather: "Stormy day! ⛈️ The sun will come back — try again!",
  travel: "We got lost! 🧭 Let's find the way again!",
  school: "Let's review that chapter! 📖 You'll get it next time!",
  work: "The city needs you! 🏛️ Give it another shot!",
  sports: "Halftime! 🏅 Come back stronger!",
  music: "Wrong note! 🎵 But great musicians always retry!",
};

// NPC encouragement at 1 life (rescue mode)
export const NPC_RESCUE_REACTIONS: Record<string, string> = {
  animals: "Careful! The last animal is hiding! 🐾",
  colors: "One more chance to finish the painting! 🎨",
  food: "Last ingredient! Don't burn it! 🍳",
  numbers: "Critical calculation! Focus! 🤖",
  family: "You can do it, dear! I believe in you! 👵",
  body: "Last chance, doctor! The patient needs you! 🩺",
  weather: "The storm is almost over! Hold on! ⛈️",
  travel: "Almost there! One more step! 🧭",
  school: "Final question! You've got this! 📚",
  work: "The city is counting on you! 🏛️",
  sports: "Final play! Give it everything! 🏅",
  music: "Grand finale! Hit the right note! 🎵",
};

interface GameOverScreenProps {
  topicId: string;
  score: number;
  onRetry: () => void;
}

export function GameOverScreen({ topicId, score, onRetry }: GameOverScreenProps) {
  const router = useRouter();
  const npc = npcs.find((n) => n.topicId === topicId);
  const reaction = NPC_GAMEOVER_REACTIONS[topicId] || "Don't give up! Try again! 💪";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="text-center space-y-5 px-6 max-w-sm">
        {/* Broken hearts animation */}
        <div className="text-5xl mb-2" style={{ animation: "gameover-drop 0.5s ease-out" }}>
          💔
        </div>

        <h2 className="text-2xl font-bold text-red-400">Game Over!</h2>

        {/* NPC reaction */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{npc?.emoji || "🎮"}</span>
            <span className="text-white font-medium">{npc?.name || "Professor Globe"}</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{reaction}</p>
        </div>

        {/* Score earned */}
        {score > 0 && (
          <p className="text-amber-400 text-sm">
            You still earned ⭐ {score} points!
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={onRetry}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-medium active:scale-95 transition-all"
          >
            Try Again 💪
          </button>
          <button
            onClick={() => router.push("/map")}
            className="bg-white/10 text-white px-6 py-2.5 rounded-full font-medium active:bg-white/20 transition-colors"
          >
            Back to Map
          </button>
        </div>
      </div>
    </div>
  );
}
