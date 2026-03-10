"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDailyChallenge, isChallengeCompleted } from "@/lib/dailyChallenge";
import { useProgressStore } from "@/stores/progressStore";

export function DailyChallengeButton() {
  const router = useRouter();
  const { gameResults } = useProgressStore();
  const [showModal, setShowModal] = useState(false);

  const challenge = getDailyChallenge();
  const completed = isChallengeCompleted(gameResults);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`absolute bottom-12 left-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform border-2 ${
          completed
            ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400/50 shadow-green-500/30"
            : "bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400/50 shadow-cyan-500/30 animate-pulse"
        }`}
        style={{ zIndex: 9999 }}
      >
        <span className="text-2xl">{completed ? "✅" : "⚔️"}</span>
      </button>

      {showModal && (
        <DailyChallengeModal
          challenge={challenge}
          completed={completed}
          onPlay={() => {
            setShowModal(false);
            router.push(`/game/${challenge.topicId}/${challenge.gameType}`);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function DailyChallengeModal({
  challenge,
  completed,
  onPlay,
  onClose,
}: {
  challenge: ReturnType<typeof getDailyChallenge>;
  completed: boolean;
  onPlay: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1d32] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">⚔️</div>
          <h2 className="text-white text-xl font-bold">Daily Challenge</h2>
          <p className="text-slate-400 text-xs mt-1">Same challenge for all players today!</p>
        </div>

        {/* Challenge details */}
        <div className="bg-white/5 rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Topic</span>
            <span className="text-white font-semibold">
              {challenge.topicEmoji} {challenge.topicName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Game</span>
            <span className="text-white font-semibold">
              {challenge.gameEmoji} {challenge.gameName}
            </span>
          </div>
          <div className="border-t border-white/5 pt-3">
            <p className="text-amber-400 text-sm font-semibold text-center">
              Bonus: +{challenge.bonusXP} XP ⭐ +{challenge.bonusCoins} Coins 🪙
            </p>
          </div>
        </div>

        {completed ? (
          <div className="text-center mb-4">
            <div className="text-3xl mb-1">🎉</div>
            <p className="text-green-400 font-semibold text-sm">Challenge completed!</p>
            <p className="text-slate-500 text-xs">Come back tomorrow for a new one</p>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 text-white py-3 rounded-xl text-sm font-semibold active:bg-white/20 transition-colors"
          >
            Close
          </button>
          {!completed && (
            <button
              onClick={onPlay}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-lg shadow-cyan-500/30"
            >
              Play! ⚔️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
