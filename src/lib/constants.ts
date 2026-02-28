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
