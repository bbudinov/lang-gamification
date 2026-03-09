"use client";

import { useState, useCallback } from "react";
import { useProgressStore } from "@/stores/progressStore";
import { rollChestReward, shouldShowChest } from "@/components/game/TreasureChest";
import type { ChestReward } from "@/components/game/TreasureChest";

export function useTreasureChest() {
  const [chestReward, setChestReward] = useState<ChestReward | null>(null);
  const { todayGamesPlayed, addCoins, addPoints } = useProgressStore();

  const checkForChest = useCallback(() => {
    // todayGamesPlayed is already incremented by addGameResult
    if (shouldShowChest(todayGamesPlayed)) {
      const reward = rollChestReward();
      setChestReward(reward);
    }
  }, [todayGamesPlayed]);

  const collectReward = useCallback(
    (reward: ChestReward) => {
      if (reward.type === "coins") {
        addCoins(reward.amount);
      } else if (reward.type === "bonus_xp") {
        addPoints(reward.amount);
      }
      setChestReward(null);
    },
    [addCoins, addPoints]
  );

  return { chestReward, checkForChest, collectReward };
}
