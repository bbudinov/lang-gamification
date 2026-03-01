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
  addPoints: (points: number) => void;
  unlockTopic: (topicId: TopicId) => void;
  addGameResult: (result: GameResult) => void;
  setLanguages: (native: Language, target: Language) => void;
  isTopicUnlocked: (topicId: TopicId) => boolean;
  updateWordMastery: (wordId: string, correct: boolean) => void;
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

      addPoints: (points) =>
        set((s) => ({ totalPoints: s.totalPoints + points })),

      unlockTopic: (topicId) =>
        set((s) => ({
          unlockedTopics: [...new Set([...s.unlockedTopics, topicId])],
        })),

      addGameResult: (result) =>
        set((s) => ({
          gameResults: [...s.gameResults, result],
        })),

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
    }),
    { name: "langworld-progress" }
  )
);
