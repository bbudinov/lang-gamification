"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { WorldId } from "@/types";
import { WorldSelector } from "@/components/map/WorldSelector";
import { WORLDS } from "@/data/worlds";

const WorldMap = dynamic(
  () => import("@/components/map/WorldMap").then((m) => m.WorldMap),
  { ssr: false }
);
const OceanMap = dynamic(
  () => import("@/components/map/OceanMap").then((m) => m.OceanMap),
  { ssr: false }
);
const AirMap = dynamic(
  () => import("@/components/map/AirMap").then((m) => m.AirMap),
  { ssr: false }
);
const UnderwaterMap = dynamic(
  () => import("@/components/map/UnderwaterMap").then((m) => m.UnderwaterMap),
  { ssr: false }
);
const SpaceMap = dynamic(
  () => import("@/components/map/SpaceMap").then((m) => m.SpaceMap),
  { ssr: false }
);
const SocialMap = dynamic(
  () => import("@/components/map/SocialMap").then((m) => m.SocialMap),
  { ssr: false }
);
const FantasyMap = dynamic(
  () => import("@/components/map/FantasyMap").then((m) => m.FantasyMap),
  { ssr: false }
);
const TimeMap = dynamic(
  () => import("@/components/map/TimeMap").then((m) => m.TimeMap),
  { ssr: false }
);
const CultureMap = dynamic(
  () => import("@/components/map/CultureMap").then((m) => m.CultureMap),
  { ssr: false }
);
const EmotionsMap = dynamic(
  () => import("@/components/map/EmotionsMap").then((m) => m.EmotionsMap),
  { ssr: false }
);
const ScienceMap = dynamic(
  () => import("@/components/map/ScienceMap").then((m) => m.ScienceMap),
  { ssr: false }
);
const MetaMap = dynamic(
  () => import("@/components/map/MetaMap").then((m) => m.MetaMap),
  { ssr: false }
);

// Extract search params reader into its own component for Suspense boundary
function SearchParamReader({ onTopic, onWorld }: { onTopic: (id: string) => void; onWorld: (id: WorldId) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get("topic");
    if (topic) onTopic(topic);
    const world = searchParams.get("world") as WorldId | null;
    if (world && ["land", "ocean", "underwater", "air", "space", "social", "fantasy", "time", "culture", "emotions", "science", "meta"].includes(world)) onWorld(world);
  }, [searchParams, onTopic, onWorld]);
  return null;
}

export default function MapPage() {
  const router = useRouter();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showMissions, setShowMissions] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeWorld, setActiveWorld] = useState<WorldId>("land");
  const [worldSelectorOpen, setWorldSelectorOpen] = useState(false);
  const { targetLanguage, gameResults } = useProgressStore();

  // Update URL when world changes (without navigation)
  const handleWorldChange = useCallback((worldId: WorldId) => {
    setActiveWorld(worldId);
    const url = worldId === "land" ? "/map" : `/map?world=${worldId}`;
    window.history.replaceState(null, "", url);
  }, []);
  const activeWorldData = WORLDS.find((w) => w.id === activeWorld);
  const bgColor = activeWorldData?.bgColor ?? "#7a9ab0";

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
      className="h-screen-safe w-screen overflow-hidden relative transition-colors duration-700"
      style={{ overscrollBehavior: "none", backgroundColor: bgColor }}
    >
      {/* Read ?topic= param to open game selector */}
      <Suspense fallback={null}>
        <SearchParamReader onTopic={setSelectedTopicId} onWorld={setActiveWorld} />
      </Suspense>

      <TopBar />

      {!helpOpen && !worldSelectorOpen && activeWorld === "land" && <WorldMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "ocean" && <OceanMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "air" && <AirMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "underwater" && <UnderwaterMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "space" && <SpaceMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "social" && <SocialMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "fantasy" && <FantasyMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "time" && <TimeMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "culture" && <CultureMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "emotions" && <EmotionsMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "science" && <ScienceMap onSelectCity={handleSelectCity} />}
      {!helpOpen && !worldSelectorOpen && activeWorld === "meta" && <MetaMap onSelectCity={handleSelectCity} />}

      <HelpButton onOpen={() => setHelpOpen(true)} onClose={() => setHelpOpen(false)} />
      <PetWidget />

      {/* Quick action buttons — top-left, only on land world */}
      {activeWorld === "land" && (
        <div
          className="absolute left-3 flex gap-2 safe-area"
          style={{ zIndex: 9999, top: "max(52px, calc(env(safe-area-inset-top, 12px) + 48px))" }}
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
      )}

      {showMissions && (
        <MissionBoard onClose={() => setShowMissions(false)} />
      )}

      <WorldSelector activeWorld={activeWorld} onSelectWorld={handleWorldChange} onExpandChange={setWorldSelectorOpen} />

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
