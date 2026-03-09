"use client";

import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { ACHIEVEMENTS, getUnlockedAchievements } from "@/lib/achievements";
import type { AchievementContext } from "@/lib/achievements";

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  skill: { label: "Skill", emoji: "🎯" },
  streak: { label: "Streak", emoji: "🔥" },
  collection: { label: "Collection", emoji: "📚" },
  special: { label: "Special", emoji: "✨" },
};

export default function AchievementsPage() {
  const router = useRouter();
  const { gameResults, wordMastery, totalPoints, coins, dailyStreak, unlockedTopics } =
    useProgressStore();

  const ctx: AchievementContext = {
    gameResults,
    wordMastery,
    totalPoints,
    coins,
    dailyStreak,
    unlockedTopics,
  };

  const unlocked = new Set(getUnlockedAchievements(ctx));
  const unlockedCount = unlocked.size;
  const totalCount = ACHIEVEMENTS.length;

  const categories = ["skill", "streak", "collection", "special"];

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">&larr; Map</span>
          </button>
          <h1 className="text-white font-bold text-lg">Achievements</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{unlockedCount}/{totalCount}</p>
          <p className="text-slate-400 text-sm">achievements unlocked</p>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Achievement list by category */}
      <div className="px-4 pb-8 space-y-6">
        {categories.map((cat) => {
          const catAchievements = ACHIEVEMENTS.filter((a) => a.category === cat);
          const catLabel = CATEGORY_LABELS[cat];

          return (
            <div key={cat}>
              <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                <span>{catLabel.emoji}</span>
                <span>{catLabel.label}</span>
                <span className="text-slate-500 text-xs">
                  {catAchievements.filter((a) => unlocked.has(a.id)).length}/{catAchievements.length}
                </span>
              </h3>
              <div className="space-y-2">
                {catAchievements.map((achievement) => {
                  const isUnlocked = unlocked.has(achievement.id);
                  return (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
                        isUnlocked
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-white/3 border-white/5 opacity-50"
                      }`}
                    >
                      <span className={`text-2xl ${isUnlocked ? "" : "grayscale opacity-40"}`}>
                        {achievement.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isUnlocked ? "text-white" : "text-slate-500"}`}>
                          {achievement.name}
                        </p>
                        <p className="text-slate-500 text-xs">{achievement.description}</p>
                      </div>
                      {isUnlocked && (
                        <span className="text-amber-400 text-sm">unlocked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
