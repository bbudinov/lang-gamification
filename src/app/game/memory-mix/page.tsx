"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { topics } from "@/data/words";
import { MemoryMatch } from "@/components/game/MemoryMatch";
import type { Topic } from "@/types";

export default function MemoryMixPage() {
  const router = useRouter();
  const { gameResults } = useProgressStore();

  // Find all topics where the player has completed Memory Match
  const mixTopic = useMemo<Topic | null>(() => {
    const completedTopicIds = Array.from(
      new Set(
        gameResults
          .filter((r) => r.gameType === "memory-match")
          .map((r) => r.topicId)
      )
    );

    if (completedTopicIds.length < 2) return null;

    const completedTopics = topics.filter((t) =>
      completedTopicIds.includes(t.id)
    );

    // Merge all words from completed topics
    const allWords = completedTopics.flatMap((t) => t.words);

    // Create a virtual topic with merged words
    return {
      id: "memory-mix" as Topic["id"],
      name: { en: "Memory Mix", bg: "Мемори Микс", es: "Memory Mix", it: "Memory Mix", de: "Memory Mix", fr: "Memory Mix" },
      emoji: "🌀",
      words: allWords,
      unlockCost: 0,
      position: [0, 0, 0] as [number, number, number],
      color: "#8b5cf6",
    };
  }, [gameResults]);

  if (!mixTopic) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl mb-2">🔒</div>
        <h2 className="text-xl font-bold text-white text-center">
          Memory Mix Locked
        </h2>
        <p className="text-slate-400 text-sm text-center max-w-xs">
          Complete Memory Match on at least 2 different islands to unlock Memory
          Mix!
        </p>
        <button
          onClick={() => router.push("/map")}
          className="mt-4 bg-white/10 text-white px-6 py-2.5 rounded-full font-medium active:bg-white/20 transition-colors"
        >
          Back to Map
        </button>
      </div>
    );
  }

  return <MemoryMatch topic={mixTopic} isMix />;
}
