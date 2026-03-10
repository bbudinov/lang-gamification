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
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("progress")
      .select("user_id, total_points, daily_streak, profiles(display_name, avatar_emoji)")
      .order("total_points", { ascending: false })
      .limit(50);

    if (data) {
      setEntries(
        data.map((row: any) => ({
          user_id: row.user_id,
          display_name: row.profiles?.display_name || "Explorer",
          avatar_emoji: row.profiles?.avatar_emoji || "🦊",
          total_points: row.total_points,
          daily_streak: row.daily_streak,
        }))
      );
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
          <h1 className="text-white font-bold text-lg">Leaderboard</h1>
          <div className="w-16" />
        </div>
      </div>

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
                    <p className="text-slate-500 text-xs">🔥 {entry.daily_streak} day streak</p>
                  )}
                </div>

                <span className={`text-sm font-bold ${rank <= 3 ? "text-amber-400" : "text-slate-400"}`}>
                  {entry.total_points} XP
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
