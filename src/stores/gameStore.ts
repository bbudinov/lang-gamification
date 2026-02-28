"use client";

import { create } from "zustand";
import type { MemoryCard } from "@/types";

interface GameState {
  cards: MemoryCard[];
  flippedCards: string[];
  matchedPairs: number;
  totalPairs: number;
  moves: number;
  score: number;
  isLocked: boolean;
  gameCompleted: boolean;

  initMemoryGame: (cards: MemoryCard[], totalPairs: number) => void;
  flipCard: (cardId: string) => void;
  checkMatch: () => { isMatch: boolean; pairId: string } | null;
  markMatched: (pairId: string) => void;
  resetFlipped: () => void;
  setLocked: (locked: boolean) => void;
  addScore: (points: number) => void;
  completeGame: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  totalPairs: 0,
  moves: 0,
  score: 0,
  isLocked: false,
  gameCompleted: false,

  initMemoryGame: (cards, totalPairs) =>
    set({
      cards,
      totalPairs,
      flippedCards: [],
      matchedPairs: 0,
      moves: 0,
      score: 0,
      isLocked: false,
      gameCompleted: false,
    }),

  flipCard: (cardId) => {
    const { flippedCards, isLocked, cards } = get();
    if (isLocked || flippedCards.length >= 2) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    set({
      cards: cards.map((c) =>
        c.id === cardId ? { ...c, isFlipped: true } : c
      ),
      flippedCards: [...flippedCards, cardId],
    });
  },

  checkMatch: () => {
    const { flippedCards, cards } = get();
    if (flippedCards.length !== 2) return null;

    const [card1, card2] = flippedCards.map((id) =>
      cards.find((c) => c.id === id)
    );
    if (!card1 || !card2) return null;

    const isMatch = card1.pairId === card2.pairId;
    set((s) => ({ moves: s.moves + 1 }));

    return { isMatch, pairId: card1.pairId };
  },

  markMatched: (pairId) =>
    set((s) => ({
      cards: s.cards.map((c) =>
        c.pairId === pairId ? { ...c, isMatched: true, isFlipped: true } : c
      ),
      matchedPairs: s.matchedPairs + 1,
      flippedCards: [],
    })),

  resetFlipped: () =>
    set((s) => ({
      cards: s.cards.map((c) =>
        s.flippedCards.includes(c.id) ? { ...c, isFlipped: false } : c
      ),
      flippedCards: [],
    })),

  setLocked: (locked) => set({ isLocked: locked }),

  addScore: (points) =>
    set((s) => ({ score: Math.max(0, s.score + points) })),

  completeGame: () => set({ gameCompleted: true }),

  resetGame: () =>
    set({
      cards: [],
      flippedCards: [],
      matchedPairs: 0,
      totalPairs: 0,
      moves: 0,
      score: 0,
      isLocked: false,
      gameCompleted: false,
    }),
}));
