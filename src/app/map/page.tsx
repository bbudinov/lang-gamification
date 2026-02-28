"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/ui/TopBar";
import { GameSelector } from "@/components/ui/GameSelector";
import { HelpButton } from "@/components/ui/HelpButton";
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
  const { targetLanguage } = useProgressStore();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a1628] relative">
      <TopBar />
      <IslandMap onSelectTopic={setSelectedTopic} />
      <HelpButton />

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
