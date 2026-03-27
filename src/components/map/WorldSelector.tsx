"use client";

import { useState } from "react";
import { WORLDS } from "@/data/worlds";
import { useProgressStore } from "@/stores/progressStore";
import type { WorldId } from "@/types";

interface WorldSelectorProps {
  activeWorld: WorldId;
  onSelectWorld: (worldId: WorldId) => void;
  onExpandChange?: (expanded: boolean) => void;
}

export function WorldSelector({ activeWorld, onSelectWorld, onExpandChange }: WorldSelectorProps) {
  const totalPoints = useProgressStore((s) => s.totalPoints);
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = (val: boolean) => {
    setExpanded(val);
    onExpandChange?.(val);
  };

  const activeWorldData = WORLDS.find((w) => w.id === activeWorld);

  return (
    <>
      {/* Collapsed: show only active world button */}
      {!expanded && (
        <button
          onClick={() => toggleExpanded(true)}
          className="fixed right-3 z-[100] flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-sm px-3 py-2 active:scale-95 transition-all"
          style={{ bottom: "max(14px, env(safe-area-inset-bottom, 14px))" }}
        >
          <span className="text-xl">{activeWorldData?.emoji ?? "🌍"}</span>
          <span className="text-white text-xs font-medium">{activeWorldData?.name.en ?? "Worlds"}</span>
          <span className="text-white/50 text-xs">▲</span>
        </button>
      )}

      {/* Expanded: grid of all worlds */}
      {expanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={() => toggleExpanded(false)}
          />

          {/* World grid */}
          <div
            className="fixed left-3 right-3 bg-black/80 backdrop-blur-md rounded-2xl p-4 max-h-[60vh] overflow-y-auto"
            style={{ zIndex: 101, bottom: "max(14px, env(safe-area-inset-bottom, 14px))" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Worlds</h3>
              <button
                onClick={() => toggleExpanded(false)}
                className="text-white/50 text-xs px-2 py-1 active:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {WORLDS.map((world) => {
                const isActive = world.id === activeWorld;
                const isLocked = false; // TODO: restore: totalPoints < world.requiredXP

                return (
                  <button
                    key={world.id}
                    onClick={() => {
                      if (!isLocked) {
                        onSelectWorld(world.id);
                        toggleExpanded(false);
                      }
                    }}
                    disabled={isLocked}
                    className="flex flex-col items-center gap-1 transition-all duration-200"
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center relative transition-all duration-200 ${
                        isLocked
                          ? "grayscale opacity-40 border-2 border-white/10"
                          : isActive
                            ? "border-[3px] scale-105 shadow-lg"
                            : "border-2 border-white/20 active:scale-95 hover:border-white/50"
                      }`}
                      style={
                        isActive
                          ? {
                              borderColor: world.themeColor,
                              boxShadow: `0 0 16px ${world.themeColor}60`,
                              backgroundColor: `${world.themeColor}25`,
                            }
                          : !isLocked
                            ? { backgroundColor: `${world.themeColor}15` }
                            : undefined
                      }
                    >
                      <span className="text-2xl">{isLocked ? "🔒" : world.emoji}</span>
                    </div>
                    <span
                      className={`text-[10px] font-medium leading-tight text-center ${
                        isLocked
                          ? "text-white/30"
                          : isActive
                            ? "text-white"
                            : "text-white/60"
                      }`}
                    >
                      {isLocked
                        ? `${(world.requiredXP / 1000).toFixed(0)}k`
                        : world.name.en}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
