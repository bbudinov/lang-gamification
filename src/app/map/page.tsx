"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { GameSelector } from "@/components/ui/GameSelector";
import { HelpButton } from "@/components/ui/HelpButton";
import { MissionBoard } from "@/components/missions/MissionBoard";
import { DailyChallengeButton } from "@/components/ui/DailyChallenge";
import { PetWidget } from "@/components/ui/PetWidget";
import { IntroScene } from "@/components/intro/IntroScene";
import { getIntroScene } from "@/data/introScenes";
import dynamic from "next/dynamic";
import { useProgressStore } from "@/stores/progressStore";
import { topics } from "@/data/words";
import type { City } from "@/data/cities";
import type { TopicId } from "@/types";

const WorldMap = dynamic(
  () => import("@/components/map/WorldMap").then((m) => m.WorldMap),
  { ssr: false }
);

export default function MapPage() {
  const router = useRouter();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [introTopicId, setIntroTopicId] = useState<TopicId | null>(null);
  const [showMissions, setShowMissions] = useState(false);
  const { targetLanguage, gameResults, hasSeenIntro } = useProgressStore();

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
    const tid = city.topicId as TopicId;
    // Show intro cutscene if scene exists (always — skip button available)
    if (getIntroScene(tid)) {
      setIntroTopicId(tid);
      return;
    }
    setSelectedTopicId(city.topicId);
  };

  const selectedTopic = selectedTopicId
    ? topics.find((t) => t.id === selectedTopicId) ?? null
    : null;

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#7a9ab0] relative"
      style={{ overscrollBehavior: "none" }}
    >
      <TopBar />

      <WorldMap onSelectCity={handleSelectCity} />

      <HelpButton />
      <PetWidget />

      {/* Left sidebar buttons */}
      <div
        className="absolute left-3 flex flex-col-reverse gap-2"
        style={{ zIndex: 9999, bottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      >
        {/* Daily Challenge (bottom) */}
        <DailyChallengeButton />

        {/* Rooms */}
        <button
          onClick={() => router.push("/rooms")}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-cyan-400/50"
        >
          <span className="text-xl">🚪</span>
        </button>

        {/* Missions */}
        <button
          onClick={() => setShowMissions(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-amber-400/50"
        >
          <span className="text-xl">📋</span>
        </button>

        {/* Memory Mix */}
        {mixUnlocked && (
          <button
            onClick={() => router.push("/game/memory-mix")}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-purple-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-violet-400/50"
          >
            <span className="text-xl">🌀</span>
          </button>
        )}
      </div>

      {showMissions && (
        <MissionBoard onClose={() => setShowMissions(false)} />
      )}

      {/* Intro cutscene (first visit) */}
      {introTopicId && (
        <IntroScene
          topicId={introTopicId}
          onComplete={() => {
            const tid = introTopicId;
            setIntroTopicId(null);
            // After intro, open GameSelector
            setSelectedTopicId(tid);
          }}
        />
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
