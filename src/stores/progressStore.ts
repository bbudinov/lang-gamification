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

  // Energy system
  energy: number;
  maxEnergy: number;

  // Streak system
  dailyStreak: number;
  lastPlayDate: string; // YYYY-MM-DD
  todayGamesPlayed: number;
  dailyGoalTarget: number; // games per day

  // Treasure chest
  lastChestGame: string; // ISO timestamp of last chest award

  // Shop
  ownedItems: string[]; // item IDs
  equippedTitle: string; // currently equipped title badge ID

  // Pet
  pet: {
    active: boolean;
    stage: 0 | 1 | 2 | 3; // 0=egg, 1=baby, 2=teen, 3=adult
    feedCount: number;
    gamesSinceLastFeed: number;
    lastFedAt: string; // ISO
  } | null;

  // Actions
  addPoints: (points: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  unlockTopic: (topicId: TopicId) => void;
  addGameResult: (result: GameResult) => void;
  setLanguages: (native: Language, target: Language) => void;
  isTopicUnlocked: (topicId: TopicId) => boolean;
  updateWordMastery: (wordId: string, correct: boolean) => void;
  addEnergy: (amount: number) => void;
  useEnergy: (amount: number) => boolean;
  checkAndUpdateStreak: () => void;

  // Shop
  buyItem: (itemId: string, cost: number) => boolean;
  equipTitle: (itemId: string) => void;

  // Pet
  hatchPet: () => void;
  feedPet: () => void;

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

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      totalPoints: 0,
      coins: 0,
      unlockedTopics: ["animals"],
      gameResults: [],
      nativeLanguage: "bg",
      targetLanguage: "en",
      wordMastery: {},

      // Energy: starts full, max 100
      energy: 100,
      maxEnergy: 100,

      // Streak
      dailyStreak: 0,
      lastPlayDate: "",
      todayGamesPlayed: 0,
      dailyGoalTarget: 3,

      // Treasure chest
      lastChestGame: "",

      // Shop
      ownedItems: [],
      equippedTitle: "",

      // Pet
      pet: null,

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

          // Energy bonus for completing games
          const energyGain = Math.min(15, Math.max(5, Math.round(result.score / 10)));
          const newEnergy = Math.min(s.maxEnergy, s.energy + energyGain);

          // Coins: base 5-15 based on score percentage + streak bonus
          const scorePct = result.maxScore > 0 ? result.score / result.maxScore : 0;
          const baseCoins = Math.round(5 + scorePct * 10); // 5-15 coins
          const streakBonus = newStreak >= 7 ? 5 : newStreak >= 3 ? 2 : 0;
          let coinsEarned = baseCoins + streakBonus;
          let pointsBonus = 0;

          // Daily challenge bonus — check if this game matches today's challenge
          const challenge = getDailyChallenge();
          const alreadyDone = s.gameResults.some(
            (r) => r.topicId === challenge.topicId && r.gameType === challenge.gameType && r.completedAt.startsWith(challenge.date)
          );
          if (!alreadyDone && result.topicId === challenge.topicId && result.gameType === challenge.gameType) {
            coinsEarned += challenge.bonusCoins;
            pointsBonus = challenge.bonusXP;
          }

          // Pet auto-feed: every 3 games
          let updatedPet = s.pet;
          if (s.pet && s.pet.active) {
            const newGames = s.pet.gamesSinceLastFeed + 1;
            if (newGames >= 3) {
              const newFeedCount = s.pet.feedCount + 1;
              let newStage = s.pet.stage;
              if (newFeedCount >= 15) newStage = 3;
              else if (newFeedCount >= 5) newStage = 2;
              else if (newFeedCount >= 1) newStage = 1;
              updatedPet = { ...s.pet, feedCount: newFeedCount, gamesSinceLastFeed: 0, lastFedAt: new Date().toISOString(), stage: newStage as 0 | 1 | 2 | 3 };
            } else {
              updatedPet = { ...s.pet, gamesSinceLastFeed: newGames };
            }
          }

          return {
            gameResults: [...s.gameResults, result],
            totalPoints: s.totalPoints + pointsBonus,
            coins: s.coins + coinsEarned,
            dailyStreak: newStreak,
            lastPlayDate: today,
            todayGamesPlayed: newGamesPlayed,
            energy: newEnergy,
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

      addEnergy: (amount) =>
        set((s) => ({ energy: Math.min(s.maxEnergy, s.energy + amount) })),

      useEnergy: (amount) => {
        const s = get();
        if (s.energy < amount) return false;
        set({ energy: s.energy - amount });
        return true;
      },

      buyItem: (itemId, cost) => {
        const s = get();
        if (s.coins < cost || s.ownedItems.includes(itemId)) return false;
        set({ coins: s.coins - cost, ownedItems: [...s.ownedItems, itemId] });
        return true;
      },

      equipTitle: (itemId) => set({ equippedTitle: itemId }),

      hatchPet: () =>
        set({
          pet: { active: true, stage: 0, feedCount: 0, gamesSinceLastFeed: 0, lastFedAt: "" },
        }),

      feedPet: () =>
        set((s) => {
          if (!s.pet) return {};
          const newFeedCount = s.pet.feedCount + 1;
          let newStage = s.pet.stage;
          if (newFeedCount >= 15) newStage = 3;
          else if (newFeedCount >= 5) newStage = 2;
          else if (newFeedCount >= 1) newStage = 1;
          return {
            pet: {
              ...s.pet,
              feedCount: newFeedCount,
              gamesSinceLastFeed: 0,
              lastFedAt: new Date().toISOString(),
              stage: newStage as 0 | 1 | 2 | 3,
            },
          };
        }),

      checkAndUpdateStreak: () => {
        const s = get();
        const today = getToday();
        if (s.lastPlayDate === today) return; // Already played today

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

        // Best result per game type for this topic
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

        // Level 1 unlocked when island is unlocked, others when prev level completed
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
