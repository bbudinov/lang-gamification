"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language, TopicId, GameResult, WordMastery, GameType, LevelNumber } from "@/types";
import { LEVEL_GAMES, LEVEL_UNLOCK } from "@/lib/levels";
import { getDailyChallenge } from "@/lib/dailyChallenge";

interface ProgressState {
  totalPoints: number;
  coins: number;
  unlockedTopics: TopicId[];
  gameResults: GameResult[];
  nativeLanguage: Language;
  targetLanguage: Language;
  wordMastery: Record<string, WordMastery>;

  // Streak system
  dailyStreak: number;
  lastPlayDate: string; // YYYY-MM-DD
  todayGamesPlayed: number;

  // Treasure chest
  lastChestGame: string; // ISO timestamp of last chest award

  // Shop
  ownedItems: string[]; // item IDs
  equippedTitle: string; // currently equipped title badge ID

  // Pet — simple stage progression by total completed games
  pet: {
    active: boolean;
    stage: 0 | 1 | 2 | 3; // 0=egg, 1=baby, 2=teen, 3=adult
    gamesPlayed: number; // total games since pet was hatched
  } | null;

  // Intro cutscenes
  visitedIntros: TopicId[];

  // Actions
  addPoints: (points: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  unlockTopic: (topicId: TopicId) => void;
  addGameResult: (result: GameResult) => void;
  setLanguages: (native: Language, target: Language) => void;
  isTopicUnlocked: (topicId: TopicId) => boolean;
  updateWordMastery: (wordId: string, correct: boolean) => void;
  checkAndUpdateStreak: () => void;

  // Shop
  buyItem: (itemId: string, cost: number) => boolean;
  equipTitle: (itemId: string) => void;

  // Pet
  hatchPet: () => void;

  // Intro
  markIntroSeen: (topicId: TopicId) => void;
  hasSeenIntro: (topicId: TopicId) => boolean;

  // Level system (computed from gameResults)
  getTopicLevelProgress: (topicId: TopicId, level: LevelNumber) => {
    gamesCompleted: number;
    avgScorePercent: number;
    unlocked: boolean;
    completed: boolean;
  };
  isLevelUnlocked: (topicId: TopicId, level: LevelNumber) => boolean;
  getTopicCompletedLevels: (topicId: TopicId) => number;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function isYesterday(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toISOString().split("T")[0] === yesterday.toISOString().split("T")[0];
}

/** XP earned from a game based on score percentage */
function calcXpFromGame(score: number, maxScore: number): number {
  if (maxScore <= 0) return 5;
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return 20;
  if (pct >= 70) return 15;
  if (pct >= 50) return 10;
  return 5;
}

/** Pet stage thresholds by total games played */
function calcPetStage(gamesPlayed: number): 0 | 1 | 2 | 3 {
  if (gamesPlayed >= 30) return 3;
  if (gamesPlayed >= 10) return 2;
  if (gamesPlayed >= 1) return 1;
  return 0;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      totalPoints: 0,
      coins: 50,
      unlockedTopics: ["animals"],
      gameResults: [],
      nativeLanguage: "bg",
      targetLanguage: "en",
      wordMastery: {},

      // Streak
      dailyStreak: 0,
      lastPlayDate: "",
      todayGamesPlayed: 0,

      // Treasure chest
      lastChestGame: "",

      // Shop
      ownedItems: [],
      equippedTitle: "",

      // Pet
      pet: null,

      // Intro
      visitedIntros: [],

      addPoints: (points) =>
        set((s) => ({ totalPoints: s.totalPoints + points })),

      addCoins: (amount) =>
        set((s) => ({ coins: s.coins + amount })),

      spendCoins: (amount) => {
        const s = get();
        if (s.coins < amount) return false;
        set({ coins: s.coins - amount });
        return true;
      },

      unlockTopic: (topicId) =>
        set((s) => ({
          unlockedTopics: [...new Set([...s.unlockedTopics, topicId])],
        })),

      addGameResult: (result) =>
        set((s) => {
          const today = getToday();
          const isNewDay = s.lastPlayDate !== today;

          // Update streak
          let newStreak = s.dailyStreak;
          if (isNewDay) {
            if (isYesterday(s.lastPlayDate)) {
              newStreak = s.dailyStreak + 1;
            } else if (s.lastPlayDate === "") {
              newStreak = 1;
            } else {
              newStreak = 1; // streak broken
            }
          }

          const newGamesPlayed = isNewDay ? 1 : s.todayGamesPlayed + 1;

          // XP from game (score-based tiers)
          let xpEarned = calcXpFromGame(result.score, result.maxScore);

          // Coins: base 5-15 based on score percentage + streak bonus
          const scorePct = result.maxScore > 0 ? result.score / result.maxScore : 0;
          const baseCoins = Math.round(5 + scorePct * 10); // 5-15 coins
          const streakBonus = newStreak >= 7 ? 5 : newStreak >= 3 ? 2 : 0;
          let coinsEarned = baseCoins + streakBonus;

          // Daily challenge bonus
          const challenge = getDailyChallenge();
          const alreadyDone = s.gameResults.some(
            (r) => r.topicId === challenge.topicId && r.gameType === challenge.gameType && r.completedAt.startsWith(challenge.date)
          );
          if (!alreadyDone && result.topicId === challenge.topicId && result.gameType === challenge.gameType) {
            coinsEarned += challenge.bonusCoins;
            xpEarned += challenge.bonusXP;
          }

          // Pet: increment games played, update stage
          let updatedPet = s.pet;
          if (s.pet && s.pet.active) {
            const newPetGames = s.pet.gamesPlayed + 1;
            updatedPet = { ...s.pet, gamesPlayed: newPetGames, stage: calcPetStage(newPetGames) };
          }

          return {
            gameResults: [...s.gameResults, result],
            totalPoints: s.totalPoints + xpEarned,
            coins: s.coins + coinsEarned,
            dailyStreak: newStreak,
            lastPlayDate: today,
            todayGamesPlayed: newGamesPlayed,
            pet: updatedPet,
          };
        }),

      setLanguages: (native, target) =>
        set({ nativeLanguage: native, targetLanguage: target }),

      isTopicUnlocked: (topicId) => get().unlockedTopics.includes(topicId),

      updateWordMastery: (wordId, correct) =>
        set((s) => {
          const prev = s.wordMastery[wordId] || { correct: 0, wrong: 0, lastSeen: "", streak: 0 };
          return {
            wordMastery: {
              ...s.wordMastery,
              [wordId]: {
                correct: prev.correct + (correct ? 1 : 0),
                wrong: prev.wrong + (correct ? 0 : 1),
                lastSeen: new Date().toISOString(),
                streak: correct ? prev.streak + 1 : 0,
              },
            },
          };
        }),

      buyItem: (itemId, cost) => {
        const s = get();
        if (s.coins < cost || s.ownedItems.includes(itemId)) return false;
        set({ coins: s.coins - cost, ownedItems: [...s.ownedItems, itemId] });
        return true;
      },

      equipTitle: (itemId) => set({ equippedTitle: itemId }),

      hatchPet: () =>
        set({
          pet: { active: true, stage: 0, gamesPlayed: 0 },
        }),

      markIntroSeen: (topicId) =>
        set((s) => ({
          visitedIntros: [...new Set([...s.visitedIntros, topicId])],
        })),

      hasSeenIntro: (topicId) => get().visitedIntros.includes(topicId),

      checkAndUpdateStreak: () => {
        const s = get();
        const today = getToday();
        if (s.lastPlayDate === today) return;

        if (isYesterday(s.lastPlayDate)) {
          // Streak continues — don't increment yet, wait for game completion
        } else if (s.lastPlayDate && s.lastPlayDate !== today) {
          // Streak broken
          set({ dailyStreak: 0 });
        }
      },

      // Level system — computed from gameResults
      getTopicLevelProgress: (topicId, level) => {
        const s = get();
        const levelGames = LEVEL_GAMES[level];

        const bestResults: Record<string, GameResult> = {};
        for (const result of s.gameResults) {
          if (result.topicId !== topicId) continue;
          if (!levelGames.includes(result.gameType as GameType)) continue;

          const pct = result.maxScore > 0 ? (result.score / result.maxScore) * 100 : 0;
          const existing = bestResults[result.gameType];
          const existingPct = existing && existing.maxScore > 0
            ? (existing.score / existing.maxScore) * 100 : 0;
          if (!existing || pct > existingPct) {
            bestResults[result.gameType] = result;
          }
        }

        const gamesCompleted = Object.keys(bestResults).length;
        const scores = Object.values(bestResults).map(r =>
          r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0
        );
        const avgScorePercent = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        let unlocked = false;
        if (level === 1) {
          unlocked = s.unlockedTopics.includes(topicId);
        } else {
          const prevProgress = get().getTopicLevelProgress(topicId, (level - 1) as LevelNumber);
          unlocked = prevProgress.completed;
        }

        const completed = gamesCompleted >= LEVEL_UNLOCK.requiredGames
          && avgScorePercent >= LEVEL_UNLOCK.requiredAvgPercent;

        return { gamesCompleted, avgScorePercent, unlocked, completed };
      },

      isLevelUnlocked: (topicId, level) => {
        return get().getTopicLevelProgress(topicId, level).unlocked;
      },

      getTopicCompletedLevels: (topicId) => {
        let count = 0;
        for (let l = 1; l <= 3; l++) {
          if (get().getTopicLevelProgress(topicId, l as LevelNumber).completed) {
            count = l;
          } else {
            break;
          }
        }
        return count;
      },
    }),
    { name: "langworld-progress" }
  )
);
