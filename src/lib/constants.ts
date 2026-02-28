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
      colors: 50,
      food: 120,
      numbers: 200,
      travel: 350,
      work: 500,
    } as Record<string, number>,
  },
};
