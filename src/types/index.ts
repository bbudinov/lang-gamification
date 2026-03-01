export type Language = "en" | "bg" | "es";

export type TopicId = "animals" | "colors" | "food" | "numbers" | "travel" | "work" | "family" | "body" | "weather" | "school" | "sports" | "music";

export interface WordEntry {
  id: string;
  en: string;
  bg: string;
  es: string;
  emoji: string;
}

export interface Topic {
  id: TopicId;
  name: Record<Language, string>;
  emoji: string;
  words: WordEntry[];
  unlockCost: number;
  position: [number, number, number];
  color: string;
}

export interface PhraseEntry {
  id: string;
  topicId: TopicId;
  /** Full sentence with ___ marking the blank */
  sentence: Record<Language, string>;
  /** The correct word to fill the blank */
  answer: Record<Language, string>;
  /** Emoji hint for the answer */
  emoji: string;
  /** Scene context shown at the top */
  context: Record<Language, string>;
  difficulty: 1 | 2 | 3;
}

export type GameType = "memory-match" | "word-quiz" | "true-false" | "word-scramble" | "fill-scene" | "say-it" | "listen-repeat" | "npc-talk";

export type LevelNumber = 1 | 2 | 3;

export interface GameResult {
  topicId: TopicId;
  gameType: GameType;
  score: number;
  maxScore: number;
  mistakes: number;
  completedAt: string;
}

export interface PlayerProgress {
  totalPoints: number;
  unlockedTopics: TopicId[];
  gameResults: GameResult[];
  nativeLanguage: Language;
  targetLanguage: Language;
}

export interface WordMastery {
  correct: number;
  wrong: number;
  lastSeen: string;
  streak: number;
}

export interface MemoryCard {
  id: string;
  text: string;
  emoji: string;
  language: Language;
  pairId: string;
  isFlipped: boolean;
  isMatched: boolean;
}
