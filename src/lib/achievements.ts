import { topics } from "@/data/words";
import type { GameResult, WordMastery } from "@/types";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "skill" | "streak" | "collection" | "special";
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  gameResults: GameResult[];
  wordMastery: Record<string, WordMastery>;
  totalPoints: number;
  coins: number;
  dailyStreak: number;
  unlockedTopics: string[];
}

export const ACHIEVEMENTS: Achievement[] = [
  // Skill achievements
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    description: "Complete Word Quiz with zero mistakes",
    emoji: "🎯",
    category: "skill",
    check: (ctx) => ctx.gameResults.some(
      (r) => r.gameType === "word-quiz" && r.mistakes === 0 && r.score > 0
    ),
  },
  {
    id: "perfect-memory",
    name: "Perfect Memory",
    description: "Complete Memory Match with zero mistakes",
    emoji: "🧠",
    category: "skill",
    check: (ctx) => ctx.gameResults.some(
      (r) => r.gameType === "memory-match" && r.mistakes === 0 && r.score > 0
    ),
  },
  {
    id: "truth-seeker",
    name: "Truth Seeker",
    description: "Complete True or False with zero mistakes",
    emoji: "🔍",
    category: "skill",
    check: (ctx) => ctx.gameResults.some(
      (r) => r.gameType === "true-false" && r.mistakes === 0 && r.score > 0
    ),
  },
  {
    id: "word-wizard",
    name: "Word Wizard",
    description: "Complete Word Scramble with zero mistakes",
    emoji: "🧙",
    category: "skill",
    check: (ctx) => ctx.gameResults.some(
      (r) => r.gameType === "word-scramble" && r.mistakes === 0 && r.score > 0
    ),
  },
  {
    id: "three-stars",
    name: "Star Collector",
    description: "Get 3 stars in any game",
    emoji: "🌟",
    category: "skill",
    check: (ctx) => ctx.gameResults.some(
      (r) => r.maxScore > 0 && (r.score / r.maxScore) >= 0.85
    ),
  },

  // Streak achievements
  {
    id: "streak-3",
    name: "Getting Started",
    description: "3-day play streak",
    emoji: "🔥",
    category: "streak",
    check: (ctx) => ctx.dailyStreak >= 3,
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "7-day play streak",
    emoji: "⚡",
    category: "streak",
    check: (ctx) => ctx.dailyStreak >= 7,
  },
  {
    id: "streak-30",
    name: "Unstoppable",
    description: "30-day play streak",
    emoji: "💎",
    category: "streak",
    check: (ctx) => ctx.dailyStreak >= 30,
  },

  // Collection achievements
  {
    id: "first-words",
    name: "First Words",
    description: "Learn 10 words",
    emoji: "📝",
    category: "collection",
    check: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return learned >= 10;
    },
  },
  {
    id: "word-collector",
    name: "Word Collector",
    description: "Learn 50 words",
    emoji: "📚",
    category: "collection",
    check: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return learned >= 50;
    },
  },
  {
    id: "master-10",
    name: "Master Mind",
    description: "Master 10 words (5+ correct, 80%+ accuracy)",
    emoji: "👑",
    category: "collection",
    check: (ctx) => {
      const mastered = Object.values(ctx.wordMastery).filter((m) => {
        const total = m.correct + m.wrong;
        return m.correct >= 5 && total > 0 && (m.correct / total) >= 0.8;
      }).length;
      return mastered >= 10;
    },
  },

  // Special achievements
  {
    id: "explorer",
    name: "Explorer",
    description: "Unlock 3 islands",
    emoji: "🗺️",
    category: "special",
    check: (ctx) => ctx.unlockedTopics.length >= 3,
  },
  {
    id: "world-traveler",
    name: "World Traveler",
    description: "Unlock 6 islands",
    emoji: "🌍",
    category: "special",
    check: (ctx) => ctx.unlockedTopics.length >= 6,
  },
  {
    id: "brave-speaker",
    name: "Brave Speaker",
    description: "Play Say It! 10 times",
    emoji: "🗣️",
    category: "special",
    check: (ctx) => ctx.gameResults.filter((r) => r.gameType === "say-it").length >= 10,
  },
  {
    id: "rich",
    name: "Treasure Hunter",
    description: "Collect 500 coins",
    emoji: "💰",
    category: "special",
    check: (ctx) => ctx.coins >= 500,
  },
];

export function getUnlockedAchievements(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS
    .filter((a) => a.check(ctx))
    .map((a) => a.id);
}
