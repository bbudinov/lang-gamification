import type { GameType, LevelNumber } from "@/types";

export interface LevelDef {
  number: LevelNumber;
  name: string;
  emoji: string;
  description: string;
  color: string;
  games: GameType[];
}

export const LEVELS: LevelDef[] = [
  {
    number: 1,
    name: "Discover",
    emoji: "🔍",
    description: "Learn new words",
    color: "#22c55e",
    games: ["memory-match", "word-quiz", "true-false"],
  },
  {
    number: 2,
    name: "Use",
    emoji: "✍️",
    description: "Use words in context",
    color: "#3b82f6",
    games: ["word-scramble", "fill-scene", "say-it"],
  },
  {
    number: 3,
    name: "Survive",
    emoji: "💬",
    description: "Real communication",
    color: "#a855f7",
    games: ["listen-repeat", "npc-talk"],
  },
];

// Quick lookup: level number → game types
export const LEVEL_GAMES: Record<LevelNumber, GameType[]> = {
  1: LEVELS[0].games,
  2: LEVELS[1].games,
  3: LEVELS[2].games,
};

// Reverse lookup: game type → which level
export const GAME_TO_LEVEL: Record<GameType, LevelNumber> = {} as Record<GameType, LevelNumber>;
for (const level of LEVELS) {
  for (const game of level.games) {
    GAME_TO_LEVEL[game] = level.number;
  }
}

// Unlock criteria
export const LEVEL_UNLOCK = {
  requiredGames: 2,
  requiredAvgPercent: 50,
};
