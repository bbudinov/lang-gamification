"use client";

import { useState } from "react";
import { speak } from "@/lib/speech";

const RULES_TEXT = `Here's how LangWorld works!

Tap an island to choose a game. Each island is a topic like Animals or Colors.

In Memory Match, flip cards to find matching word pairs. You get 10 points for each correct match, but lose 2 points for mistakes. Complete all pairs for a 50 point bonus!

In Word Quiz, listen to a word and pick the right translation. You earn 15 points for correct answers, lose 5 for wrong ones, and get 60 bonus points for finishing!

Earn enough points to unlock new islands. Colors needs 50 points, and more topics are coming soon.

You can switch languages using the button in the top right corner. Have fun learning!`;

export function HelpButton() {
  const [showRules, setShowRules] = useState(false);

  const handleOpen = () => {
    setShowRules(true);
    speak("Hi there! Let me explain how the game works.", "en");
  };

  return (
    <>
      {/* Helper character button */}
      <button
        onClick={handleOpen}
        className="absolute bottom-6 right-4 z-10 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-amber-300"
      >
        <span className="text-2xl">🧑‍🏫</span>
      </button>

      {/* Rules modal */}
      {showRules && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4"
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-[#1a2744] rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-white/10 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Character header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-2 border-amber-300 shrink-0">
                <span className="text-xl">🧑‍🏫</span>
              </div>
              <div>
                <p className="text-white font-bold">Professor Globe</p>
                <p className="text-slate-400 text-xs">Your language guide</p>
              </div>
            </div>

            {/* Rules content */}
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">🗺️ Islands</p>
                <p>Tap an island to choose a game. Each island is a topic. Earn points to unlock new ones!</p>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">🃏 Memory Match</p>
                <p>Flip cards to find matching word pairs.</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
                  <li>✅ Correct match: <span className="text-green-400">+10 pts</span></li>
                  <li>❌ Wrong match: <span className="text-red-400">-2 pts</span></li>
                  <li>🏆 Complete all: <span className="text-amber-400">+50 bonus</span></li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">🎯 Word Quiz</p>
                <p>Listen to a word and pick the right translation.</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
                  <li>✅ Correct: <span className="text-green-400">+15 pts</span></li>
                  <li>❌ Wrong: <span className="text-red-400">-5 pts</span></li>
                  <li>🏆 Complete all: <span className="text-amber-400">+60 bonus</span></li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">🔓 Unlocking</p>
                <p>
                  🎨 Colors: <span className="text-amber-400">50 pts</span><br />
                  More topics coming soon!
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">🌐 Languages</p>
                <p>Switch between English, Bulgarian, and Spanish using the button in the top right corner.</p>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-xl font-medium active:bg-blue-700 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
