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

export type GameType = "memory-match" | "word-quiz" | "true-false" | "word-scramble" | "listen-choose";

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

export interface MemoryCard {
  id: string;
  text: string;
  language: Language;
  pairId: string;
  isFlipped: boolean;
  isMatched: boolean;
}
