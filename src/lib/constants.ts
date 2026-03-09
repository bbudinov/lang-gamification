// Star rating thresholds (percentage of maxScore)
export const STAR_THRESHOLDS = {
  ONE: 30,    // ≥30% → 1 star
  TWO: 60,    // ≥60% → 2 stars
  THREE: 85,  // ≥85% → 3 stars
};

export function getStarRating(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  const pct = (score / maxScore) * 100;
  if (pct >= STAR_THRESHOLDS.THREE) return 3;
  if (pct >= STAR_THRESHOLDS.TWO) return 2;
  if (pct >= STAR_THRESHOLDS.ONE) return 1;
  return 0;
}

export function renderStars(stars: number): string {
  return "⭐".repeat(stars) + "☆".repeat(Math.max(0, 3 - stars));
}

export const GAME_CONFIG = {
  MEMORY_MATCH: {
    PAIRS_COUNT: 6,
    MATCH_POINTS: 10,
    MISMATCH_PENALTY: 2,
    COMPLETION_BONUS: 50,
    FLIP_DELAY_MS: 1000,
  },
  POINTS: {
    UNLOCK_THRESHOLD: {
      animals: 0,
      colors: 500,
      food: 1000,
      numbers: 1500,
      family: 2000,
      body: 2500,
      weather: 3000,
      travel: 3500,
      school: 4000,
      work: 4500,
      sports: 5000,
      music: 5500,
    } as Record<string, number>,
  },
};
