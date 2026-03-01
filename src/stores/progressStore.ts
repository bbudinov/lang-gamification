"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language, TopicId, GameResult, WordMastery } from "@/types";

interface ProgressState {
  totalPoints: number;
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

  // Actions
  addPoints: (points: number) => void;
  unlockTopic: (topicId: TopicId) => void;
  addGameResult: (result: GameResult) => void;
  setLanguages: (native: Language, target: Language) => void;
  isTopicUnlocked: (topicId: TopicId) => boolean;
  updateWordMastery: (wordId: string, correct: boolean) => void;
  addEnergy: (amount: number) => void;
  useEnergy: (amount: number) => boolean;
  checkAndUpdateStreak: () => void;
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

      addPoints: (points) =>
        set((s) => ({ totalPoints: s.totalPoints + points })),

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

          return {
            gameResults: [...s.gameResults, result],
            dailyStreak: newStreak,
            lastPlayDate: today,
            todayGamesPlayed: newGamesPlayed,
            energy: newEnergy,
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
    }),
    { name: "langworld-progress" }
  )
);
