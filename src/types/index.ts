export type Language = "en" | "bg" | "es" | "it" | "de" | "fr";

export type TopicId = "animals" | "colors" | "food" | "numbers" | "travel" | "work" | "family" | "body" | "weather" | "school" | "library" | "sports" | "music"
  | "ocean-sailing" | "ocean-fishing" | "ocean-lighthouse" | "ocean-sailing-school" | "ocean-cruise" | "ocean-storm" | "ocean-pirates" | "ocean-shipping"
  | "underwater-reef" | "underwater-creatures" | "underwater-exploration" | "underwater-kelp" | "underwater-submarine" | "underwater-abyss" | "underwater-bubbles" | "underwater-treasure" | "underwater-volcano"
  | "air-flying" | "air-birds" | "air-weather-sky" | "air-airport" | "air-storm-clouds" | "air-mountain" | "air-balloon" | "air-wind"
  | "botanical-garden" | "central-park" | "university" | "art-museum" | "history-museum" | "legendary-places"
  | "space-planets" | "space-rockets" | "space-astronaut" | "space-aliens" | "space-station" | "space-moon" | "space-stars" | "space-galaxy"
  | "social-cafe" | "social-office" | "social-party" | "social-hotel" | "social-airport-desk" | "social-restaurant" | "social-shopping" | "social-hospital"
  | "fantasy-forest" | "fantasy-dragon" | "fantasy-wizard" | "fantasy-castle" | "fantasy-village" | "fantasy-quest" | "fantasy-potion" | "fantasy-dungeon"
  | "time-ancient" | "time-medieval" | "time-present" | "time-future" | "time-dinosaur" | "time-industrial" | "time-station" | "time-museum"
  | "culture-italian" | "culture-japanese" | "culture-french" | "culture-mexican" | "culture-indian" | "culture-african" | "culture-british" | "culture-brazilian"
  | "culture-bulgarian" | "culture-american" | "culture-german" | "culture-chinese" | "culture-egyptian" | "culture-spanish" | "culture-australian"
  | "emotions-joy" | "emotions-fear" | "emotions-anger" | "emotions-calm" | "emotions-surprise" | "emotions-love" | "emotions-dream" | "emotions-courage"
  | "science-lab" | "science-robot" | "science-space-station" | "science-energy" | "science-nature" | "science-medicine" | "science-computer" | "science-invention"
  | "meta-ui" | "meta-game" | "meta-code" | "meta-internet" | "meta-social-media" | "meta-ai" | "meta-music-studio" | "meta-movie";

export type WorldId = "land" | "ocean" | "underwater" | "air" | "space" | "social" | "fantasy" | "time" | "culture" | "emotions" | "science" | "meta";

export interface WordEntry {
  id: string;
  en: string;
  bg: string;
  es: string;
  it: string;
  de: string;
  fr: string;
  emoji: string;
  /** Difficulty tier: 1=basic, 2=intermediate, 3=advanced */
  difficulty?: 1 | 2 | 3;
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

export type GameType = "memory-match" | "memory-mix" | "word-quiz" | "true-false" | "word-scramble" | "fill-scene" | "say-it" | "listen-repeat" | "npc-talk";

export type LevelNumber = 1 | 2 | 3;

export interface GameResult {
  topicId: string;
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
