"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useProgressStore } from "@/stores/progressStore";
import { syncToCloud } from "@/lib/sync";
import { supabase } from "@/lib/supabase";

const AVATARS = ["🦊", "🐱", "🐶", "🦁", "🐼", "🐸", "🦄", "🐙", "🐬", "🦋", "🐧", "🐨"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut, updateProfile } = useAuthStore();
  const { totalPoints, coins, dailyStreak, gameResults, wordMastery } = useProgressStore();

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Not logged in</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-500 text-white px-6 py-2 rounded-xl"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  const totalGames = gameResults.length;
  const wordsLearned = Object.values(wordMastery).filter((m) => m.correct >= 1).length;

  const [shareCopied, setShareCopied] = useState(false);
  const [feedbackEmoji, setFeedbackEmoji] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSignOut = async () => {
    try {
      // Sync before logout
      if (user?.id) await syncToCloud(user.id).catch(() => {});
    } catch {} // never block sign out
    await signOut();
    router.replace("/login");
  };

  const handleAvatarChange = (emoji: string) => {
    updateProfile({ avatar_emoji: emoji });
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
          <h1 className="text-white font-bold text-lg">Profile</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="px-4 pb-8 space-y-6">
        {/* Avatar + Name */}
        <div className="text-center">
          <div className="text-6xl mb-2">{profile.avatar_emoji}</div>
          <h2 className="text-white text-xl font-bold">{profile.display_name || "Explorer"}</h2>
          <p className="text-slate-500 text-xs mt-1">
            {profile.role === "teacher" ? "Teacher" : profile.role === "parent" ? "Parent" : "Player"}
          </p>
        </div>

        {/* Change avatar */}
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-slate-400 text-xs mb-2">Change avatar</p>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => handleAvatarChange(a)}
                className={`text-2xl p-1.5 rounded-xl transition-all ${
                  profile.avatar_emoji === a ? "bg-white/20 scale-110" : "bg-white/5 active:bg-white/10"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard emoji="⭐" label="Total XP" value={totalPoints} />
          <StatCard emoji="🪙" label="Coins" value={coins} />
          <StatCard emoji="🔥" label="Day Streak" value={dailyStreak} />
          <StatCard emoji="🎮" label="Games Played" value={totalGames} />
          <StatCard emoji="📚" label="Words Learned" value={wordsLearned} />
          <StatCard emoji="🏆" label="Achievements" value="→" link onClick={() => router.push("/achievements")} />
        </div>

        {/* Share with friends */}
        <button
          onClick={async () => {
            const shareData = {
              title: "LangWorld — Learn Languages!",
              text: `Join me on LangWorld! I've learned ${wordsLearned} words and earned ${totalPoints} XP! 🌍✨`,
              url: "https://langworld.vercel.app",
            };
            try {
              if (navigator.share) {
                await navigator.share(shareData);
              } else {
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }
            } catch {}
          }}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>📤</span>
          {shareCopied ? "Link copied!" : "Share with Friends"}
        </button>

        {/* Feedback */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-white text-sm font-semibold mb-2">How do you like LangWorld?</p>
          <div className="flex justify-center gap-4 mb-2">
            {["😡", "😐", "😊", "😍"].map((emoji, i) => (
              <button
                key={emoji}
                onClick={() => {
                  setFeedbackEmoji(i);
                  setFeedbackSent(false);
                }}
                className={`text-3xl transition-all ${feedbackEmoji === i ? "scale-125 drop-shadow-lg" : "opacity-50 hover:opacity-80"}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          {feedbackEmoji !== null && !feedbackSent && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us more (optional)..."
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm placeholder:text-slate-500 resize-none h-16"
              />
              <button
                onClick={async () => {
                  // Save feedback to Supabase
                  try {
                    await supabase.from("feedback").insert({
                      user_id: user.id,
                      rating: feedbackEmoji,
                      message: feedbackText.trim() || null,
                    });
                  } catch {}
                  setFeedbackSent(true);
                  setFeedbackText("");
                }}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold active:bg-green-700 transition-colors"
              >
                Send Feedback
              </button>
            </div>
          )}
          {feedbackSent && (
            <p className="text-green-400 text-sm text-center animate-in fade-in">Thank you! 💚</p>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/10 text-red-400 py-3 rounded-xl text-sm font-semibold active:bg-red-500/20 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function StatCard({
  emoji,
  label,
  value,
  link,
  onClick,
}: {
  emoji: string;
  label: string;
  value: number | string;
  link?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`bg-white/5 rounded-xl p-3 text-center ${onClick ? "active:bg-white/10 transition-colors" : ""}`}
    >
      <span className="text-xl">{emoji}</span>
      <p className="text-white font-bold text-lg mt-1">{value}</p>
      <p className="text-slate-500 text-xs">{label}</p>
    </Tag>
  );
}
