import { topics } from "@/data/words";
import type { GameResult, WordMastery } from "@/types";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "skill" | "streak" | "collection" | "special";
  rarity: Rarity;
  reward: number; // coins
  maxProgress: number;
  getProgress: (ctx: AchievementContext) => number;
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
    description: "Complete 5 perfect Word Quizzes",
    emoji: "🎯",
    category: "skill",
    rarity: "rare",
    reward: 50,
    maxProgress: 5,
    getProgress: (ctx) =>
      ctx.gameResults.filter((r) => r.gameType === "word-quiz" && r.mistakes === 0 && r.score > 0).length,
    check: (ctx) => ctx.gameResults.filter(
      (r) => r.gameType === "word-quiz" && r.mistakes === 0 && r.score > 0
    ).length >= 5,
  },
  {
    id: "perfect-memory",
    name: "Perfect Memory",
    description: "Complete 5 perfect Memory Matches",
    emoji: "🧠",
    category: "skill",
    rarity: "rare",
    reward: 50,
    maxProgress: 5,
    getProgress: (ctx) =>
      ctx.gameResults.filter((r) => r.gameType === "memory-match" && r.mistakes === 0 && r.score > 0).length,
    check: (ctx) => ctx.gameResults.filter(
      (r) => r.gameType === "memory-match" && r.mistakes === 0 && r.score > 0
    ).length >= 5,
  },
  {
    id: "truth-seeker",
    name: "Truth Seeker",
    description: "Complete 5 perfect True or False games",
    emoji: "🔍",
    category: "skill",
    rarity: "rare",
    reward: 50,
    maxProgress: 5,
    getProgress: (ctx) =>
      ctx.gameResults.filter((r) => r.gameType === "true-false" && r.mistakes === 0 && r.score > 0).length,
    check: (ctx) => ctx.gameResults.filter(
      (r) => r.gameType === "true-false" && r.mistakes === 0 && r.score > 0
    ).length >= 5,
  },
  {
    id: "word-wizard",
    name: "Word Wizard",
    description: "Complete 5 perfect Word Scrambles",
    emoji: "🧙",
    category: "skill",
    rarity: "rare",
    reward: 50,
    maxProgress: 5,
    getProgress: (ctx) =>
      ctx.gameResults.filter((r) => r.gameType === "word-scramble" && r.mistakes === 0 && r.score > 0).length,
    check: (ctx) => ctx.gameResults.filter(
      (r) => r.gameType === "word-scramble" && r.mistakes === 0 && r.score > 0
    ).length >= 5,
  },
  {
    id: "three-stars",
    name: "Star Collector",
    description: "Get 3 stars in any game",
    emoji: "🌟",
    category: "skill",
    rarity: "common",
    reward: 25,
    maxProgress: 1,
    getProgress: (ctx) =>
      ctx.gameResults.some((r) => r.maxScore > 0 && (r.score / r.maxScore) >= 0.85) ? 1 : 0,
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
    rarity: "common",
    reward: 25,
    maxProgress: 3,
    getProgress: (ctx) => Math.min(ctx.dailyStreak, 3),
    check: (ctx) => ctx.dailyStreak >= 3,
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "7-day play streak",
    emoji: "⚡",
    category: "streak",
    rarity: "rare",
    reward: 75,
    maxProgress: 7,
    getProgress: (ctx) => Math.min(ctx.dailyStreak, 7),
    check: (ctx) => ctx.dailyStreak >= 7,
  },
  {
    id: "streak-30",
    name: "Unstoppable",
    description: "30-day play streak",
    emoji: "💎",
    category: "streak",
    rarity: "legendary",
    reward: 300,
    maxProgress: 30,
    getProgress: (ctx) => Math.min(ctx.dailyStreak, 30),
    check: (ctx) => ctx.dailyStreak >= 30,
  },

  // Collection achievements
  {
    id: "first-words",
    name: "First Words",
    description: "Learn 10 words",
    emoji: "📝",
    category: "collection",
    rarity: "common",
    reward: 25,
    maxProgress: 10,
    getProgress: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return Math.min(learned, 10);
    },
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
    rarity: "epic",
    reward: 150,
    maxProgress: 50,
    getProgress: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return Math.min(learned, 50);
    },
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
    rarity: "epic",
    reward: 200,
    maxProgress: 10,
    getProgress: (ctx) => {
      const mastered = Object.values(ctx.wordMastery).filter((m) => {
        const total = m.correct + m.wrong;
        return m.correct >= 5 && total > 0 && (m.correct / total) >= 0.8;
      }).length;
      return Math.min(mastered, 10);
    },
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
    rarity: "common",
    reward: 30,
    maxProgress: 3,
    getProgress: (ctx) => Math.min(ctx.unlockedTopics.length, 3),
    check: (ctx) => ctx.unlockedTopics.length >= 3,
  },
  {
    id: "world-traveler",
    name: "World Traveler",
    description: "Unlock 6 islands",
    emoji: "🌍",
    category: "special",
    rarity: "epic",
    reward: 150,
    maxProgress: 6,
    getProgress: (ctx) => Math.min(ctx.unlockedTopics.length, 6),
    check: (ctx) => ctx.unlockedTopics.length >= 6,
  },
  {
    id: "brave-speaker",
    name: "Brave Speaker",
    description: "Play Say It! 10 times",
    emoji: "🗣️",
    category: "special",
    rarity: "rare",
    reward: 75,
    maxProgress: 10,
    getProgress: (ctx) => Math.min(ctx.gameResults.filter((r) => r.gameType === "say-it").length, 10),
    check: (ctx) => ctx.gameResults.filter((r) => r.gameType === "say-it").length >= 10,
  },
  {
    id: "rich",
    name: "Treasure Hunter",
    description: "Collect 500 coins",
    emoji: "💰",
    category: "special",
    rarity: "legendary",
    reward: 250,
    maxProgress: 500,
    getProgress: (ctx) => Math.min(ctx.coins, 500),
    check: (ctx) => ctx.coins >= 500,
  },

  // === Skill tier 2 ===
  {
    id: "quiz-master",
    name: "Quiz Master",
    description: "Complete 20 perfect Word Quizzes",
    emoji: "🏅",
    category: "skill",
    rarity: "epic",
    reward: 100,
    maxProgress: 20,
    getProgress: (ctx) =>
      ctx.gameResults.filter((r) => r.gameType === "word-quiz" && r.mistakes === 0 && r.score > 0).length,
    check: (ctx) =>
      ctx.gameResults.filter((r) => r.gameType === "word-quiz" && r.mistakes === 0 && r.score > 0).length >= 20,
  },
  {
    id: "memory-legend",
    name: "Memory Legend",
    description: "Complete 20 perfect Memory Matches",
    emoji: "🧩",
    category: "skill",
    rarity: "epic",
    reward: 100,
    maxProgress: 20,
    getProgress: (ctx) =>
      ctx.gameResults.filter((r) => r.gameType === "memory-match" && r.mistakes === 0 && r.score > 0).length,
    check: (ctx) =>
      ctx.gameResults.filter((r) => r.gameType === "memory-match" && r.mistakes === 0 && r.score > 0).length >= 20,
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    description: "Complete 50 games total",
    emoji: "⚡",
    category: "skill",
    rarity: "rare",
    reward: 75,
    maxProgress: 50,
    getProgress: (ctx) => Math.min(ctx.gameResults.length, 50),
    check: (ctx) => ctx.gameResults.length >= 50,
  },
  {
    id: "game-marathon",
    name: "Game Marathon",
    description: "Complete 100 games total",
    emoji: "🏃",
    category: "skill",
    rarity: "epic",
    reward: 150,
    maxProgress: 100,
    getProgress: (ctx) => Math.min(ctx.gameResults.length, 100),
    check: (ctx) => ctx.gameResults.length >= 100,
  },
  {
    id: "game-legend",
    name: "Game Legend",
    description: "Complete 500 games total",
    emoji: "👑",
    category: "skill",
    rarity: "legendary",
    reward: 300,
    maxProgress: 500,
    getProgress: (ctx) => Math.min(ctx.gameResults.length, 500),
    check: (ctx) => ctx.gameResults.length >= 500,
  },

  // === Streak tier 2 ===
  {
    id: "on-fire",
    name: "On Fire!",
    description: "Reach a 3-day streak",
    emoji: "🔥",
    category: "streak",
    rarity: "common",
    reward: 25,
    maxProgress: 3,
    getProgress: (ctx) => Math.min(ctx.dailyStreak, 3),
    check: (ctx) => ctx.dailyStreak >= 3,
  },
  {
    id: "streak-fighter",
    name: "Streak Fighter",
    description: "Reach a 7-day streak",
    emoji: "⚔️",
    category: "streak",
    rarity: "rare",
    reward: 75,
    maxProgress: 7,
    getProgress: (ctx) => Math.min(ctx.dailyStreak, 7),
    check: (ctx) => ctx.dailyStreak >= 7,
  },
  {
    id: "monthly-flame",
    name: "Monthly Flame",
    description: "Reach a 30-day streak",
    emoji: "🌟",
    category: "streak",
    rarity: "legendary",
    reward: 300,
    maxProgress: 30,
    getProgress: (ctx) => Math.min(ctx.dailyStreak, 30),
    check: (ctx) => ctx.dailyStreak >= 30,
  },

  // === Collection / Exploration ===
  {
    id: "vocabulary-master",
    name: "Vocabulary Master",
    description: "Learn 200 words",
    emoji: "📚",
    category: "collection",
    rarity: "rare",
    reward: 100,
    maxProgress: 200,
    getProgress: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return Math.min(learned, 200);
    },
    check: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return learned >= 200;
    },
  },
  {
    id: "dictionary",
    name: "Walking Dictionary",
    description: "Learn 500 words",
    emoji: "📕",
    category: "collection",
    rarity: "epic",
    reward: 200,
    maxProgress: 500,
    getProgress: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return Math.min(learned, 500);
    },
    check: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return learned >= 500;
    },
  },
  {
    id: "polyglot",
    name: "Polyglot",
    description: "Learn 1000 words",
    emoji: "🌍",
    category: "collection",
    rarity: "legendary",
    reward: 500,
    maxProgress: 1000,
    getProgress: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return Math.min(learned, 1000);
    },
    check: (ctx) => {
      const learned = Object.values(ctx.wordMastery).filter((m) => m.correct >= 1).length;
      return learned >= 1000;
    },
  },
  {
    id: "topic-traveler",
    name: "World Traveler",
    description: "Play games in 5 different topics",
    emoji: "✈️",
    category: "collection",
    rarity: "common",
    reward: 30,
    maxProgress: 5,
    getProgress: (ctx) => {
      const uniqueTopics = new Set(ctx.gameResults.map((r) => r.topicId));
      return Math.min(uniqueTopics.size, 5);
    },
    check: (ctx) => {
      const uniqueTopics = new Set(ctx.gameResults.map((r) => r.topicId));
      return uniqueTopics.size >= 5;
    },
  },
  {
    id: "globe-trotter",
    name: "Globe Trotter",
    description: "Play games in 15 different topics",
    emoji: "🌎",
    category: "collection",
    rarity: "rare",
    reward: 100,
    maxProgress: 15,
    getProgress: (ctx) => {
      const uniqueTopics = new Set(ctx.gameResults.map((r) => r.topicId));
      return Math.min(uniqueTopics.size, 15);
    },
    check: (ctx) => {
      const uniqueTopics = new Set(ctx.gameResults.map((r) => r.topicId));
      return uniqueTopics.size >= 15;
    },
  },
  {
    id: "universe-explorer",
    name: "Universe Explorer",
    description: "Play games in 30 different topics",
    emoji: "🚀",
    category: "collection",
    rarity: "epic",
    reward: 200,
    maxProgress: 30,
    getProgress: (ctx) => {
      const uniqueTopics = new Set(ctx.gameResults.map((r) => r.topicId));
      return Math.min(uniqueTopics.size, 30);
    },
    check: (ctx) => {
      const uniqueTopics = new Set(ctx.gameResults.map((r) => r.topicId));
      return uniqueTopics.size >= 30;
    },
  },

  // === Special tier 2 ===
  {
    id: "xp-hunter",
    name: "XP Hunter",
    description: "Earn 5000 total XP",
    emoji: "⭐",
    category: "special",
    rarity: "rare",
    reward: 75,
    maxProgress: 5000,
    getProgress: (ctx) => Math.min(ctx.totalPoints, 5000),
    check: (ctx) => ctx.totalPoints >= 5000,
  },
  {
    id: "xp-champion",
    name: "XP Champion",
    description: "Earn 20000 total XP",
    emoji: "💫",
    category: "special",
    rarity: "epic",
    reward: 200,
    maxProgress: 20000,
    getProgress: (ctx) => Math.min(ctx.totalPoints, 20000),
    check: (ctx) => ctx.totalPoints >= 20000,
  },
  {
    id: "xp-legend",
    name: "XP Legend",
    description: "Earn 50000 total XP",
    emoji: "🏆",
    category: "special",
    rarity: "legendary",
    reward: 500,
    maxProgress: 50000,
    getProgress: (ctx) => Math.min(ctx.totalPoints, 50000),
    check: (ctx) => ctx.totalPoints >= 50000,
  },
  {
    id: "coin-saver",
    name: "Coin Saver",
    description: "Save 500 coins",
    emoji: "💰",
    category: "special",
    rarity: "rare",
    reward: 50,
    maxProgress: 500,
    getProgress: (ctx) => Math.min(ctx.coins, 500),
    check: (ctx) => ctx.coins >= 500,
  },
  {
    id: "getting-rich",
    name: "Getting Rich!",
    description: "Save 2000 coins",
    emoji: "💎",
    category: "special",
    rarity: "epic",
    reward: 150,
    maxProgress: 2000,
    getProgress: (ctx) => Math.min(ctx.coins, 2000),
    check: (ctx) => ctx.coins >= 2000,
  },
];

export function getUnlockedAchievements(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS
    .filter((a) => a.check(ctx))
    .map((a) => a.id);
}
