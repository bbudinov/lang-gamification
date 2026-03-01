"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NPCFact {
  text: string;
  timestamp: string;
}

interface NPCMemoryState {
  /** Facts remembered per NPC: npcId → facts[] */
  memories: Record<string, NPCFact[]>;
  /** Add a fact about the child for a specific NPC */
  addFact: (npcId: string, fact: string) => void;
  /** Get all facts for a specific NPC */
  getFacts: (npcId: string) => NPCFact[];
  /** Get recent facts (last 5) for AI system prompt */
  getRecentFacts: (npcId: string, count?: number) => string[];
}

const MAX_FACTS_PER_NPC = 20;

export const useNPCMemoryStore = create<NPCMemoryState>()(
  persist(
    (set, get) => ({
      memories: {},

      addFact: (npcId, fact) =>
        set((s) => {
          const existing = s.memories[npcId] || [];
          // Don't add duplicate facts
          if (existing.some((f) => f.text === fact)) return s;
          const updated = [
            ...existing,
            { text: fact, timestamp: new Date().toISOString() },
          ].slice(-MAX_FACTS_PER_NPC); // Keep last N facts
          return {
            memories: { ...s.memories, [npcId]: updated },
          };
        }),

      getFacts: (npcId) => get().memories[npcId] || [],

      getRecentFacts: (npcId, count = 5) => {
        const facts = get().memories[npcId] || [];
        return facts.slice(-count).map((f) => f.text);
      },
    }),
    { name: "langworld-npc-memory" }
  )
);
