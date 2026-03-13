import type { WordEntry, WordMastery } from "@/types";

/**
 * Adaptive word selection — words the child struggles with appear more often.
 * Words never seen before are always included (at least 2 per round).
 *
 * Score formula: wrongCount*3 - streak*2 + daysSinceLastSeen
 * Higher score = higher priority (more likely to appear).
 */

function daysSince(isoDate: string): number {
  if (!isoDate) return 30; // never seen = treat as 30 days ago
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function priorityScore(mastery: WordMastery | undefined): number {
  if (!mastery) return 100; // never seen — highest priority
  return mastery.wrong * 3 - mastery.streak * 2 + daysSince(mastery.lastSeen);
}

/**
 * Compute the unlocked difficulty tier for a topic based on word mastery.
 * - Start at 1
 * - Unlock 2 when 60%+ of difficulty-1 words have streak >= 3
 * - Unlock 3 when 60%+ of difficulty-1+2 words have streak >= 3
 */
export function getUnlockedDifficulty(
  allWords: WordEntry[],
  mastery: Record<string, WordMastery>,
): 1 | 2 | 3 {
  const d1Words = allWords.filter((w) => (w.difficulty || 1) === 1);
  const d1Mastered = d1Words.filter((w) => mastery[w.id]?.streak >= 3).length;
  if (d1Words.length === 0 || d1Mastered / d1Words.length < 0.6) return 1;

  const d12Words = allWords.filter((w) => (w.difficulty || 1) <= 2);
  const d12Mastered = d12Words.filter((w) => mastery[w.id]?.streak >= 3).length;
  if (d12Words.length === 0 || d12Mastered / d12Words.length < 0.6) return 2;

  return 3;
}

/**
 * Select `count` words from `allWords`, weighted by mastery data.
 * At least `minNew` never-seen words are guaranteed (if available).
 * If `maxDifficulty` is set, only words up to that difficulty are considered.
 */
export function selectAdaptiveWords(
  allWords: WordEntry[],
  mastery: Record<string, WordMastery>,
  count: number,
  minNew: number = 2,
  maxDifficulty?: 1 | 2 | 3,
): WordEntry[] {
  // Filter by difficulty if specified
  const pool = maxDifficulty
    ? allWords.filter((w) => (w.difficulty || 1) <= maxDifficulty)
    : allWords;

  if (pool.length <= count) return shuffle(pool);

  const unseen = pool.filter((w) => !mastery[w.id]);
  const seen = pool.filter((w) => mastery[w.id]);

  const selected: WordEntry[] = [];

  // Guarantee minNew unseen words
  const shuffledUnseen = shuffle(unseen);
  const unseenPick = Math.min(minNew, shuffledUnseen.length, count);
  for (let i = 0; i < unseenPick; i++) {
    selected.push(shuffledUnseen[i]);
  }

  // Fill remaining slots with weighted selection from seen + remaining unseen
  const remaining = [
    ...shuffledUnseen.slice(unseenPick),
    ...seen,
  ].filter((w) => !selected.find((s) => s.id === w.id));

  const scored = remaining.map((w) => ({
    word: w,
    score: priorityScore(mastery[w.id]),
  }));

  // Sort by score descending (highest priority first)
  scored.sort((a, b) => b.score - a.score);

  const slotsLeft = count - selected.length;

  // Pick top half deterministically, bottom half randomly for variety
  const deterministicPick = Math.ceil(slotsLeft * 0.6);
  const randomPick = slotsLeft - deterministicPick;

  for (let i = 0; i < deterministicPick && i < scored.length; i++) {
    selected.push(scored[i].word);
  }

  const leftover = scored.slice(deterministicPick);
  const shuffledLeftover = shuffle(leftover);
  for (let i = 0; i < randomPick && i < shuffledLeftover.length; i++) {
    selected.push(shuffledLeftover[i].word);
  }

  return shuffle(selected);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
