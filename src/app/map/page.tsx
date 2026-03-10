"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { GameSelector } from "@/components/ui/GameSelector";
import { HelpButton } from "@/components/ui/HelpButton";
import { MissionBoard } from "@/components/missions/MissionBoard";
import { DailyChallengeButton } from "@/components/ui/DailyChallenge";
import { useProgressStore } from "@/stores/progressStore";
import { topics } from "@/data/words";
import type { Topic } from "@/types";

const IslandMap = dynamic(
  () =>
    import("@/components/scene/IslandMap").then((mod) => ({
      default: mod.IslandMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#0a1628]">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🌍</div>
          <p className="text-slate-400 text-sm">Loading world...</p>
        </div>
      </div>
    ),
  }
);

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

// 2D fallback map for devices without WebGL
function FallbackMap({ onSelectTopic }: { onSelectTopic: (t: Topic) => void }) {
  const { totalPoints, unlockedTopics } = useProgressStore();

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-16 pb-24">
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {topics.map((topic) => {
          const isUnlocked =
            unlockedTopics.includes(topic.id) || topic.unlockCost === 0;
          const canUnlock = totalPoints >= topic.unlockCost;

          return (
            <button
              key={topic.id}
              onClick={() => isUnlocked && onSelectTopic(topic)}
              disabled={!isUnlocked}
              className={`relative rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                isUnlocked
                  ? "bg-white/10 border border-white/15 shadow-lg"
                  : canUnlock
                  ? "bg-white/5 border border-amber-500/30"
                  : "bg-white/[0.03] border border-white/5 opacity-50"
              }`}
            >
              <span className="text-3xl">{topic.emoji}</span>
              <span
                className={`text-xs font-medium ${
                  isUnlocked ? "text-white" : "text-slate-500"
                }`}
              >
                {topic.name.en}
              </span>
              {!isUnlocked && (
                <span className="text-[10px] text-amber-400/70">
                  🔒 {topic.unlockCost}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MapPage() {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showMissions, setShowMissions] = useState(false);
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const { targetLanguage, gameResults } = useProgressStore();

  // Check if Memory Mix is unlocked (2+ topics with Memory Match played)
  const memoryTopicsPlayed = Array.from(
    new Set(
      gameResults
        .filter((r) => r.gameType === "memory-match")
        .map((r) => r.topicId)
    )
  ).length;
  const mixUnlocked = memoryTopicsPlayed >= 2;

  useEffect(() => {
    setHasWebGL(checkWebGL());
  }, []);

  // Still checking
  if (hasWebGL === null) {
    return (
      <div className="h-screen w-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-4xl animate-bounce">🌍</div>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#0a1628] relative"
      style={{ overscrollBehavior: "none" }}
    >
      <TopBar />

      {hasWebGL ? (
        <IslandMap
          onSelectTopic={setSelectedTopic}
          focusPosition={selectedTopic?.position ?? null}
        />
      ) : (
        <FallbackMap onSelectTopic={setSelectedTopic} />
      )}

      <HelpButton />

      {/* Daily Challenge button */}
      <DailyChallengeButton />

      {/* Mission button */}
      <button
        onClick={() => setShowMissions(true)}
        className="absolute bottom-28 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-amber-400/50"
        style={{ zIndex: 9999 }}
      >
        <span className="text-2xl">📋</span>
      </button>

      {/* Memory Mix button — above missions, visible when 2+ topics completed */}
      {mixUnlocked && (
        <button
          onClick={() => router.push("/game/memory-mix")}
          className="absolute bottom-44 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-purple-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-violet-400/50"
          style={{ zIndex: 9999 }}
        >
          <span className="text-2xl">🌀</span>
        </button>
      )}

      {showMissions && (
        <MissionBoard onClose={() => setShowMissions(false)} />
      )}

      {selectedTopic && (
        <GameSelector
          topicId={selectedTopic.id}
          topicName={selectedTopic.name[targetLanguage]}
          topicEmoji={selectedTopic.emoji}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
}
