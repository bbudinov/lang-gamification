"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_emoji: string;
  total_points: number;
  daily_streak: number;
  games_played: number;
}

type Tab = "xp" | "streak" | "games";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("xp");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [tab]);

  const loadLeaderboard = async () => {
    setLoading(true);

    // Join profiles + progress
    const { data } = await supabase
      .from("progress")
      .select("user_id, total_points, daily_streak, today_games_played, profiles(display_name, avatar_emoji)")
      .order(
        tab === "xp" ? "total_points" : tab === "streak" ? "daily_streak" : "total_points",
        { ascending: false }
      )
      .limit(50);

    if (data) {
      const mapped: LeaderboardEntry[] = data.map((row: any) => ({
        user_id: row.user_id,
        display_name: row.profiles?.display_name || "Explorer",
        avatar_emoji: row.profiles?.avatar_emoji || "🦊",
        total_points: row.total_points,
        daily_streak: row.daily_streak,
        games_played: row.today_games_played,
      }));

      // Sort by selected tab
      if (tab === "streak") {
        mapped.sort((a, b) => b.daily_streak - a.daily_streak);
      } else if (tab === "games") {
        mapped.sort((a, b) => b.total_points - a.total_points);
      }

      setEntries(mapped);
    }

    setLoading(false);
  };

  const getValue = (entry: LeaderboardEntry) => {
    if (tab === "xp") return `${entry.total_points} XP`;
    if (tab === "streak") return `${entry.daily_streak} days`;
    return `${entry.total_points} XP`;
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">&larr; Map</span>
          </button>
          <h1 className="text-white font-bold text-lg">Leaderboard</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pb-4">
        {([
          { id: "xp", label: "⭐ Top XP", },
          { id: "streak", label: "🔥 Streaks" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-slate-400 border border-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 pb-8 space-y-2">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-3xl animate-bounce mb-2">🏆</div>
            <p className="text-slate-500 text-sm">Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🏜️</div>
            <p className="text-slate-500 text-sm">No players yet — be the first!</p>
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
                {/* Rank */}
                <div className="w-8 text-center">
                  {rank <= 3 ? (
                    <span className="text-xl">{MEDALS[rank - 1]}</span>
                  ) : (
                    <span className="text-slate-500 text-sm font-bold">{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <span className="text-2xl">{entry.avatar_emoji}</span>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isMe ? "text-amber-400" : "text-white"}`}>
                    {entry.display_name || "Explorer"}
                    {isMe && <span className="text-xs text-amber-400/60 ml-1">(you)</span>}
                  </p>
                </div>

                {/* Value */}
                <span className={`text-sm font-bold ${rank <= 3 ? "text-amber-400" : "text-slate-400"}`}>
                  {getValue(entry)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
