"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { GameSelector } from "@/components/ui/GameSelector";
import { HelpButton } from "@/components/ui/HelpButton";
import { MissionBoard } from "@/components/missions/MissionBoard";
import { DailyChallengeButton } from "@/components/ui/DailyChallenge";
import { PetWidget } from "@/components/ui/PetWidget";
import dynamic from "next/dynamic";
import { useProgressStore } from "@/stores/progressStore";
import { topics } from "@/data/words";
import type { City } from "@/data/cities";

const WorldMap = dynamic(
  () => import("@/components/map/WorldMap").then((m) => m.WorldMap),
  { ssr: false }
);

export default function MapPage() {
  const router = useRouter();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showMissions, setShowMissions] = useState(false);
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

  const handleSelectCity = (city: City) => {
    setSelectedTopicId(city.topicId);
  };

  const selectedTopic = selectedTopicId
    ? topics.find((t) => t.id === selectedTopicId) ?? null
    : null;

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#a8c0d0] relative"
      style={{ overscrollBehavior: "none" }}
    >
      <TopBar />

      <WorldMap onSelectCity={handleSelectCity} />

      <HelpButton />
      <DailyChallengeButton />
      <PetWidget />

      {/* Rooms button */}
      <button
        onClick={() => router.push("/rooms")}
        className="absolute bottom-28 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-cyan-400/50"
        style={{ zIndex: 9999 }}
      >
        <span className="text-2xl">🚪</span>
      </button>

      {/* Mission button */}
      <button
        onClick={() => setShowMissions(true)}
        className="absolute bottom-44 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-amber-400/50"
        style={{ zIndex: 9999 }}
      >
        <span className="text-2xl">📋</span>
      </button>

      {/* Memory Mix button */}
      {mixUnlocked && (
        <button
          onClick={() => router.push("/game/memory-mix")}
          className="absolute bottom-60 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-purple-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-violet-400/50"
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
          onClose={() => setSelectedTopicId(null)}
        />
      )}
    </div>
  );
}
