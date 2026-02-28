"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language, TopicId, GameResult } from "@/types";

interface ProgressState {
  totalPoints: number;
  unlockedTopics: TopicId[];
  gameResults: GameResult[];
  nativeLanguage: Language;
  targetLanguage: Language;
  addPoints: (points: number) => void;
  unlockTopic: (topicId: TopicId) => void;
  addGameResult: (result: GameResult) => void;
  setLanguages: (native: Language, target: Language) => void;
  isTopicUnlocked: (topicId: TopicId) => boolean;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      totalPoints: 0,
      unlockedTopics: ["animals"],
      gameResults: [],
      nativeLanguage: "bg",
      targetLanguage: "en",

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
    }),
    { name: "langworld-progress" }
  )
);
