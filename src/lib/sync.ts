import { supabase } from "./supabase";
import { useProgressStore } from "@/stores/progressStore";
import type { GameResult, WordMastery } from "@/types";

/**
 * Cloud sync — pushes local Zustand state to Supabase and pulls cloud state.
 * Offline-first: localStorage is always the primary store.
 * Sync runs on login + periodically.
 */

export async function syncToCloud(userId: string): Promise<void> {
  const state = useProgressStore.getState();

  // 1. Upsert progress (core fields only — weekly columns may not exist yet)
  const progressData: Record<string, unknown> = {
    user_id: userId,
    total_points: state.totalPoints,
    coins: state.coins,
    daily_streak: state.dailyStreak,
    last_play_date: state.lastPlayDate,
    today_games_played: state.todayGamesPlayed,
    unlocked_topics: state.unlockedTopics,
    updated_at: new Date().toISOString(),
  };
  const { error: progressError } = await supabase.from("progress").upsert(progressData, { onConflict: "user_id" });
  if (progressError) {
    console.error("Progress sync error:", progressError.message);
  }
  // Try weekly columns separately (may not exist in DB yet)
  try {
    await supabase.from("progress").update({
      weekly_xp: state.weeklyXP,
      weekly_start_date: state.weeklyStartDate,
    }).eq("user_id", userId);
  } catch {} // silently ignore if columns don't exist

  // 2. Sync game results — only push new ones (by completedAt timestamp)
  const { data: existing } = await supabase
    .from("game_results")
    .select("completed_at")
    .eq("user_id", userId);

  const existingTimestamps = new Set((existing ?? []).map((r) => r.completed_at));

  const newResults = state.gameResults.filter(
    (r) => !existingTimestamps.has(r.completedAt)
  );

  if (newResults.length > 0) {
    await supabase.from("game_results").insert(
      newResults.map((r) => ({
        user_id: userId,
        topic_id: r.topicId,
        game_type: r.gameType,
        score: r.score,
        max_score: r.maxScore,
        mistakes: r.mistakes,
        completed_at: r.completedAt,
      }))
    );
  }

  // 3. Sync word mastery — upsert all
  const masteryEntries = Object.entries(state.wordMastery);
  if (masteryEntries.length > 0) {
    await supabase.from("word_mastery").upsert(
      masteryEntries.map(([wordId, m]) => ({
        user_id: userId,
        word_id: wordId,
        correct: m.correct,
        wrong: m.wrong,
        streak: m.streak,
        last_seen: m.lastSeen || null,
      })),
      { onConflict: "user_id,word_id" }
    );
  }
}

export async function syncFromCloud(userId: string): Promise<void> {
  // 1. Pull progress
  const { data: progress } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!progress) return;

  // 2. Pull game results
  const { data: cloudResults } = await supabase
    .from("game_results")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: true });

  // 3. Pull word mastery
  const { data: cloudMastery } = await supabase
    .from("word_mastery")
    .select("*")
    .eq("user_id", userId);

  const state = useProgressStore.getState();

  // Merge: take the higher value for points/coins/streak
  const mergedPoints = Math.max(state.totalPoints, progress.total_points);
  const mergedCoins = Math.max(state.coins, progress.coins);
  const mergedStreak = Math.max(state.dailyStreak, progress.daily_streak);

  // Merge game results by completedAt (union of local + cloud)
  const localTimestamps = new Set(state.gameResults.map((r) => r.completedAt));
  const cloudOnlyResults: GameResult[] = (cloudResults ?? [])
    .filter((r) => !localTimestamps.has(r.completed_at))
    .map((r) => ({
      topicId: r.topic_id,
      gameType: r.game_type,
      score: r.score,
      maxScore: r.max_score,
      mistakes: r.mistakes,
      completedAt: r.completed_at,
    }));
  const mergedResults = [...state.gameResults, ...cloudOnlyResults];

  // Merge word mastery — take higher correct/streak per word
  const mergedMastery: Record<string, WordMastery> = { ...state.wordMastery };
  for (const cm of cloudMastery ?? []) {
    const local = mergedMastery[cm.word_id];
    if (!local || cm.correct > local.correct) {
      mergedMastery[cm.word_id] = {
        correct: cm.correct,
        wrong: cm.wrong,
        streak: cm.streak,
        lastSeen: cm.last_seen ?? "",
      };
    }
  }

  // Apply merged state
  useProgressStore.setState({
    totalPoints: mergedPoints,
    coins: mergedCoins,
    dailyStreak: mergedStreak,
    lastPlayDate: progress.last_play_date || state.lastPlayDate,
    todayGamesPlayed: Math.max(state.todayGamesPlayed, progress.today_games_played),
    unlockedTopics: [...new Set([...state.unlockedTopics, ...(progress.unlocked_topics ?? [])])],
    gameResults: mergedResults,
    wordMastery: mergedMastery,
    weeklyXP: Math.max(state.weeklyXP, progress.weekly_xp ?? 0),
    weeklyStartDate: progress.weekly_start_date || state.weeklyStartDate,
  } as any);
}
