"use client";

import { useRouter } from "next/navigation";
import { MemoryMatch } from "@/components/game/MemoryMatch";
import { WordQuiz } from "@/components/game/WordQuiz";
import { TrueFalse } from "@/components/game/TrueFalse";
import { WordScramble } from "@/components/game/WordScramble";
import { FillScene } from "@/components/game/FillScene";
import { SayIt } from "@/components/game/SayIt";
import { ListenRepeat } from "@/components/game/ListenRepeat";
import { DialogueBox } from "@/components/dialogue/DialogueBox";
import { topics } from "@/data/words";

interface GamePageClientProps {
  topicId: string;
  gameType: string;
}

export function GamePageClient({ topicId, gameType }: GamePageClientProps) {
  const router = useRouter();
  const topic = topics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-4">
        <p className="text-white text-lg">Topic not found</p>
        <button
          onClick={() => router.push(`/map?topic=${topicId}`)}
          className="text-blue-400 text-sm"
        >
          Back to Map
        </button>
      </div>
    );
  }

  if (gameType === "memory-match") return <MemoryMatch topic={topic} />;
  if (gameType === "word-quiz") return <WordQuiz topic={topic} />;
  if (gameType === "true-false") return <TrueFalse topic={topic} />;
  if (gameType === "word-scramble") return <WordScramble topic={topic} />;
  if (gameType === "fill-scene") return <FillScene topic={topic} />;
  if (gameType === "say-it") return <SayIt topic={topic} />;
  if (gameType === "listen-repeat") return <ListenRepeat topic={topic} />;
  if (gameType === "npc-talk") return <DialogueBox topic={topic} />;

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-4">
      <p className="text-white text-lg">Coming soon: {gameType}</p>
      <button
        onClick={() => router.push(`/map?topic=${topicId}`)}
        className="text-blue-400 text-sm"
      >
        Back to Map
      </button>
    </div>
  );
}
