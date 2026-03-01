"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/ui/TopBar";
import { GameSelector } from "@/components/ui/GameSelector";
import { HelpButton } from "@/components/ui/HelpButton";
import { MissionBoard } from "@/components/missions/MissionBoard";
import { useProgressStore } from "@/stores/progressStore";
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

export default function MapPage() {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showMissions, setShowMissions] = useState(false);
  const { targetLanguage } = useProgressStore();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a1628] relative">
      <TopBar />
      <IslandMap
        onSelectTopic={setSelectedTopic}
        focusPosition={selectedTopic?.position ?? null}
      />
      <HelpButton />

      {/* Mission button */}
      <button
        onClick={() => setShowMissions(true)}
        className="absolute bottom-20 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-amber-400/50"
        style={{ zIndex: 9999 }}
      >
        <span className="text-2xl">📋</span>
      </button>

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
