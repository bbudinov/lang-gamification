"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useProgressStore } from "@/stores/progressStore";

interface TournamentEntry {
  user_id: string;
  display_name: string;
  avatar_emoji: string;
  weekly_xp: number;
  daily_streak: number;
}

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

const REWARD_TIERS = [
  { label: "1st place", xp: 100, coins: 50 },
  { label: "2nd place", xp: 50, coins: 25 },
  { label: "3rd place", xp: 25, coins: 15 },
];

const CLAIM_TIERS = [
  { minXP: 500, label: "🥇 Gold", xp: 100, coins: 50 },
  { minXP: 200, label: "🥈 Silver", xp: 50, coins: 25 },
  { minXP: 100, label: "🥉 Bronze", xp: 25, coins: 15 },
  { minXP: 50, label: "⭐ Top 10", xp: 10, coins: 5 },
  { minXP: 1, label: "🎮 Participant", xp: 5, coins: 0 },
];

function getClaimTier(xp: number) {
  return CLAIM_TIERS.find((t) => xp >= t.minXP) ?? null;
}

function getPreviousWeekStart(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setDate(monday.getDate() - 7);
  return monday.toISOString().split("T")[0];
}

function getWeekStart(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toISOString().split("T")[0];
}

function getDaysRemaining(): { days: number; hours: number } {
  const now = new Date();
  // Next Monday 00:00
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  nextMonday.setHours(0, 0, 0, 0);
  const diff = nextMonday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { days, hours };
}

export default function TournamentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { weeklyXP, weeklyStartDate, addPoints, addCoins } = useProgressStore();
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasServerData, setHasServerData] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{ label: string; xp: number; coins: number } | null>(null);

  const timeLeft = useMemo(() => getDaysRemaining(), []);

  // Make sure local weeklyStartDate is current
  const currentWeekStart = getWeekStart();
  const localWeeklyXP = weeklyStartDate === currentWeekStart ? weeklyXP : 0;

  // --- Claim Weekly Reward logic ---
  const lastClaimedWeek = typeof window !== "undefined" ? localStorage.getItem("tournament_lastClaimedWeek") : null;
  const previousWeekStart = getPreviousWeekStart();

  // Previous week XP: if weeklyStartDate matches previous week, that XP is from last week
  const previousWeekXP = weeklyStartDate === previousWeekStart ? weeklyXP : 0;

  const canClaim = previousWeekXP > 0 && lastClaimedWeek !== currentWeekStart;
  const claimTier = canClaim ? getClaimTier(previousWeekXP) : null;

  const handleClaim = () => {
    if (!claimTier) return;
    addPoints(claimTier.xp);
    if (claimTier.coins > 0) addCoins(claimTier.coins);
    localStorage.setItem("tournament_lastClaimedWeek", currentWeekStart);
    setClaimedReward({ label: claimTier.label, xp: claimTier.xp, coins: claimTier.coins });
  };

  useEffect(() => {
    loadTournament();
  }, []);

  const loadTournament = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("progress")
      .select("user_id, weekly_xp, daily_streak, profiles(display_name, avatar_emoji)")
      .order("weekly_xp", { ascending: false })
      .limit(50);

    if (data && data.length > 0 && data.some((r: any) => r.weekly_xp != null)) {
      setHasServerData(true);
      setEntries(
        data
          .filter((row: any) => (row.weekly_xp ?? 0) > 0)
          .map((row: any) => ({
            user_id: row.user_id,
            display_name: row.profiles?.display_name || "Explorer",
            avatar_emoji: row.profiles?.avatar_emoji || "\u{1F98A}",
            weekly_xp: row.weekly_xp ?? 0,
            daily_streak: row.daily_streak ?? 0,
          }))
      );
    } else {
      setHasServerData(false);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">&larr; Map</span>
          </button>
          <h1 className="text-white font-bold text-lg">{"\u{1F3C6}"} Weekly Tournament</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Timer + My XP */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex gap-3">
          {/* Countdown */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-slate-400 text-xs mb-1">Ends in</p>
            <p className="text-white font-bold text-lg">
              {timeLeft.days}d {timeLeft.hours}h
            </p>
          </div>

          {/* My Weekly XP */}
          <div className="flex-1 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-3 text-center">
            <p className="text-amber-400/70 text-xs mb-1">Your Weekly XP</p>
            <p className="text-amber-400 font-bold text-lg">{localWeeklyXP}</p>
          </div>
        </div>

        {/* Claim Weekly Reward */}
        {claimedReward ? (
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-white font-bold text-sm">Congratulations!</p>
            <p className="text-green-400 text-sm mt-1">
              {claimedReward.label}: +{claimedReward.xp} XP{claimedReward.coins > 0 && ` · +${claimedReward.coins} coins`}
            </p>
          </div>
        ) : canClaim && claimTier ? (
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
            <p className="text-white font-bold text-sm mb-1">📦 Last Week Results</p>
            <p className="text-slate-400 text-xs mb-2">
              You earned <span className="text-amber-400 font-bold">{previousWeekXP} XP</span> last week — {claimTier.label}!
            </p>
            <button
              onClick={handleClaim}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-xl font-bold text-sm active:opacity-80 transition-opacity"
            >
              🎁 Claim Your Reward! (+{claimTier.xp} XP{claimTier.coins > 0 ? ` · +${claimTier.coins} coins` : ""})
            </button>
          </div>
        ) : null}

        {/* Rewards */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-slate-400 text-xs mb-2 font-semibold uppercase tracking-wider">Rewards</p>
          <div className="space-y-1.5">
            {REWARD_TIERS.map((tier, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="mr-1.5">{MEDALS[i]}</span>
                  <span className="text-white">{tier.label}</span>
                </span>
                <span className="text-xs text-slate-400">
                  +{tier.xp} XP &middot; +{tier.coins} coins
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-sm">
                <span className="mr-1.5">{"\u2B50"}</span>
                <span className="text-white">Top 10</span>
              </span>
              <span className="text-xs text-slate-400">+10 XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-4 pb-8 space-y-2">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">This Week&apos;s Ranking</p>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-3xl animate-bounce mb-2">{"\u{1F3C6}"}</div>
            <p className="text-slate-500 text-sm">Loading...</p>
          </div>
        ) : !hasServerData ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">{"\u{1F3C6}"}</div>
            <p className="text-white font-semibold mb-1">Coming soon!</p>
            <p className="text-slate-500 text-sm max-w-[260px] mx-auto">
              Play games to earn weekly XP. Rankings will appear once server sync is enabled.
            </p>
            {localWeeklyXP > 0 && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 inline-block">
                <p className="text-amber-400 text-sm">
                  You&apos;ve earned <span className="font-bold">{localWeeklyXP} XP</span> this week!
                </p>
              </div>
            )}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">{"\u{1F3DC}\u{FE0F}"}</div>
            <p className="text-slate-500 text-sm">No one has played this week yet!</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const isMe = user?.id === entry.user_id;
            const rank = i + 1;

            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
                  isMe
                    ? "bg-amber-500/15 border-amber-500/30"
                    : rank <= 3
                    ? "bg-white/5 border-white/10"
                    : "bg-white/3 border-white/5"
                }`}
              >
                <div className="w-8 text-center">
                  {rank <= 3 ? (
                    <span className="text-xl">{MEDALS[rank - 1]}</span>
                  ) : (
                    <span className="text-slate-500 text-sm font-bold">{rank}</span>
                  )}
                </div>

                <span className="text-2xl">{entry.avatar_emoji}</span>

                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isMe ? "text-amber-400" : "text-white"}`}>
                    {entry.display_name || "Explorer"}
                    {isMe && <span className="text-xs text-amber-400/60 ml-1">(you)</span>}
                  </p>
                  {entry.daily_streak > 0 && (
                    <p className="text-slate-500 text-xs">{"\u{1F525}"} {entry.daily_streak} day streak</p>
                  )}
                </div>

                <span className={`text-sm font-bold ${rank <= 3 ? "text-amber-400" : "text-slate-400"}`}>
                  {entry.weekly_xp} XP
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
