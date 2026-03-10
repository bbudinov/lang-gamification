"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface GhostEntry {
  display_name: string;
  avatar_emoji: string;
  score: number;
  max_score: number;
  user_id: string;
}

interface GhostScoresProps {
  topicId: string;
  gameType: string;
  myScore: number;
  maxScore: number;
}

/**
 * Shows top 3 scores from other players for the same topic+game.
 * Displayed on game completion screen as "ghost" comparison.
 */
export function GhostScores({ topicId, gameType, myScore, maxScore }: GhostScoresProps) {
  const { user } = useAuthStore();
  const [ghosts, setGhosts] = useState<GhostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    loadGhosts();
  }, []);

  const loadGhosts = async () => {
    const { data } = await supabase
      .from("game_results")
      .select("score, max_score, user_id, profiles(display_name, avatar_emoji)")
      .eq("topic_id", topicId)
      .eq("game_type", gameType)
      .order("score", { ascending: false })
      .limit(100);

    if (!data || data.length === 0) {
      setLoading(false);
      return;
    }

    // Best score per user
    const bestByUser: Record<string, GhostEntry> = {};
    for (const row of data as any[]) {
      const uid = row.user_id;
      if (!bestByUser[uid] || row.score > bestByUser[uid].score) {
        bestByUser[uid] = {
          display_name: row.profiles?.display_name || "Explorer",
          avatar_emoji: row.profiles?.avatar_emoji || "🦊",
          score: row.score,
          max_score: row.max_score,
          user_id: uid,
        };
      }
    }

    const sorted = Object.values(bestByUser).sort((a, b) => b.score - a.score);

    // Find my rank
    const rank = sorted.findIndex((g) => myScore >= g.score);
    setMyRank(rank === -1 ? sorted.length + 1 : rank + 1);

    // Top 3 (exclude current user)
    const top3 = sorted.filter((g) => g.user_id !== user?.id).slice(0, 3);
    setGhosts(top3);
    setLoading(false);
  };

  if (loading) return null;
  if (ghosts.length === 0) return null;

  const myPct = maxScore > 0 ? Math.round((myScore / maxScore) * 100) : 0;
  const bestPct = ghosts[0] && ghosts[0].max_score > 0
    ? Math.round((ghosts[0].score / ghosts[0].max_score) * 100) : 0;
  const beatBest = myPct >= bestPct;

  return (
    <div className="w-full max-w-xs mx-auto mt-3" style={{ animation: "star-pop 0.4s ease-out 1s both" }}>
      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
        <p className="text-slate-400 text-xs text-center mb-2">
          {beatBest ? "👑 You beat the top score!" : "👻 Ghost Scores"}
        </p>

        <div className="space-y-1.5">
          {/* My score */}
          <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-2.5 py-1.5 border border-amber-500/20">
            <span className="text-xs font-bold text-amber-400 w-5">
              {myRank ? `#${myRank}` : "—"}
            </span>
            <span className="text-sm">🫵</span>
            <span className="text-white text-xs font-semibold flex-1">You</span>
            <ScoreBar pct={myPct} color="amber" />
            <span className="text-amber-400 text-xs font-bold w-10 text-right">{myPct}%</span>
          </div>

          {/* Ghost scores */}
          {ghosts.map((ghost, i) => {
            const ghostPct = ghost.max_score > 0
              ? Math.round((ghost.score / ghost.max_score) * 100) : 0;
            return (
              <div key={ghost.user_id} className="flex items-center gap-2 bg-white/3 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-bold text-slate-500 w-5">#{i + 1}</span>
                <span className="text-sm">{ghost.avatar_emoji}</span>
                <span className="text-slate-300 text-xs flex-1 truncate">{ghost.display_name}</span>
                <ScoreBar pct={ghostPct} color="slate" />
                <span className="text-slate-400 text-xs font-bold w-10 text-right">{ghostPct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ pct, color }: { pct: number; color: "amber" | "slate" }) {
  return (
    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          color === "amber" ? "bg-amber-400" : "bg-slate-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
