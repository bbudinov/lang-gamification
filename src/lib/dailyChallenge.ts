import { topics } from "@/data/words";
import type { GameType, TopicId } from "@/types";

const CHALLENGE_GAMES: GameType[] = ["word-quiz", "true-false", "memory-match", "word-scramble"];

export interface DailyChallenge {
  topicId: TopicId;
  topicEmoji: string;
  topicName: string;
  gameType: GameType;
  gameName: string;
  gameEmoji: string;
  date: string; // YYYY-MM-DD
  bonusCoins: number;
  bonusXP: number;
}

const GAME_INFO: Record<string, { name: string; emoji: string }> = {
  "word-quiz": { name: "Word Quiz", emoji: "🎯" },
  "true-false": { name: "True or False", emoji: "✅" },
  "memory-match": { name: "Memory Match", emoji: "🃏" },
  "word-scramble": { name: "Word Scramble", emoji: "🔤" },
};

/**
 * Deterministic daily challenge — same for all players on the same day.
 * Uses date as seed to pick topic + game type.
 */
export function getDailyChallenge(): DailyChallenge {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Simple hash from date string
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = ((seed << 5) - seed + dateStr.charCodeAt(i)) | 0;
  }
  seed = Math.abs(seed);

  const topicIndex = seed % topics.length;
  const gameIndex = (seed >> 4) % CHALLENGE_GAMES.length;

  const topic = topics[topicIndex];
  const gameType = CHALLENGE_GAMES[gameIndex];
  const info = GAME_INFO[gameType];

  return {
    topicId: topic.id,
    topicEmoji: topic.emoji,
    topicName: topic.name.en,
    gameType,
    gameName: info.name,
    gameEmoji: info.emoji,
    date: dateStr,
    bonusCoins: 25,
    bonusXP: 50,
  };
}

/**
 * Check if player completed today's challenge.
 */
export function isChallengeCompleted(
  gameResults: { topicId: string; gameType: string; completedAt: string }[]
): boolean {
  const challenge = getDailyChallenge();

  return gameResults.some(
    (r) =>
      r.topicId === challenge.topicId &&
      r.gameType === challenge.gameType &&
      r.completedAt.startsWith(challenge.date)
  );
}
