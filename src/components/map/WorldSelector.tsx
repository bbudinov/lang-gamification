"use client";

import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { WorldId } from "@/types";

interface WorldSelectorProps {
  activeWorld: WorldId;
  onSelectWorld: (worldId: WorldId) => void;
}

export function WorldSelector({ activeWorld, onSelectWorld }: WorldSelectorProps) {
  const totalPoints = useProgressStore((s) => s.totalPoints);

  return (
    <div
      className="fixed right-3 flex gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3 py-2 z-[100]"
      style={{ bottom: "max(14px, env(safe-area-inset-bottom, 14px))" }}
    >
      {WORLDS.map((world) => {
        const isActive = world.id === activeWorld;
        const isLocked = false; // TODO: restore unlock logic: totalPoints < world.requiredXP

        return (
          <button
            key={world.id}
            onClick={() => !isLocked && onSelectWorld(world.id)}
            className="flex flex-col items-center gap-0.5 transition-all duration-300"
            disabled={isLocked}
          >
            {/* Circle icon */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center relative transition-all duration-300 ${
                isLocked
                  ? "grayscale opacity-50 border-2 border-white/20"
                  : isActive
                    ? "border-[3px] scale-110 shadow-lg"
                    : "border-2 border-white/30 hover:border-white/60"
              }`}
              style={
                isActive
                  ? {
                      borderColor: world.themeColor,
                      boxShadow: `0 0 12px ${world.themeColor}80`,
                      backgroundColor: `${world.themeColor}20`,
                    }
                  : !isLocked
                    ? { backgroundColor: `${world.themeColor}15` }
                    : undefined
              }
            >
              <span className="text-xl">{isLocked ? "🔒" : world.emoji}</span>
            </div>

            {/* Label below */}
            <span
              className={`text-[9px] font-medium leading-tight ${
                isLocked
                  ? "text-white/40"
                  : isActive
                    ? "text-white"
                    : "text-white/60"
              }`}
            >
              {isLocked
                ? `${(world.requiredXP / 1000).toFixed(0)}k XP`
                : world.name.en}
            </span>
          </button>
        );
      })}
    </div>
  );
}
