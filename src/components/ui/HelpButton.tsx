"use client";

import { useState } from "react";
import { speak } from "@/lib/speech";

type RulesLang = "en" | "bg";

const RULES = {
  en: {
    greeting: "Hi there! Let me explain how the game works.",
    subtitle: "Your language guide",
    gotIt: "Got it!",
    islands: {
      title: "🗺️ Islands",
      text: "Tap an island to choose a game. Each island is a topic. Earn points to unlock new ones!",
    },
    memory: {
      title: "🃏 Memory Match",
      text: "Flip cards to find matching word pairs.",
      correct: "Correct match:",
      wrong: "Wrong match:",
      complete: "Complete all:",
    },
    quiz: {
      title: "🎯 Word Quiz",
      text: "Listen to a word and pick the right translation.",
      correct: "Correct:",
      wrong: "Wrong:",
      complete: "Complete all:",
    },
    unlock: {
      title: "🔓 Unlocking",
      text: "More topics coming soon!",
    },
    langs: {
      title: "🌐 Languages",
      text: "Switch between English, Bulgarian, and Spanish using the button in the top right corner.",
    },
  },
  bg: {
    greeting: "Здравей! Нека ти обясня как работи играта.",
    subtitle: "Твоят езиков помощник",
    gotIt: "Разбрах!",
    islands: {
      title: "🗺️ Острови",
      text: "Натисни остров, за да избереш игра. Всеки остров е тема. Печели точки, за да отключиш нови!",
    },
    memory: {
      title: "🃏 Memory Match",
      text: "Обръщай карти и намери съвпадащи двойки думи.",
      correct: "Вярна двойка:",
      wrong: "Грешна двойка:",
      complete: "Завърши всички:",
    },
    quiz: {
      title: "🎯 Word Quiz",
      text: "Чуй дума и избери правилния превод.",
      correct: "Вярно:",
      wrong: "Грешно:",
      complete: "Завърши всички:",
    },
    unlock: {
      title: "🔓 Отключване",
      text: "Скоро идват нови теми!",
    },
    langs: {
      title: "🌐 Езици",
      text: "Превключвай между английски, български и испански с бутона горе вдясно.",
    },
  },
};

export function HelpButton() {
  const [showRules, setShowRules] = useState(false);
  const [lang, setLang] = useState<RulesLang>("en");

  const r = RULES[lang];

  const handleOpen = () => {
    setShowRules(true);
    speak(r.greeting, lang);
  };

  const switchLang = (newLang: RulesLang) => {
    setLang(newLang);
    speak(RULES[newLang].greeting, newLang);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="absolute bottom-6 right-4 z-10 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-amber-300"
      >
        <span className="text-2xl">🧑‍🏫</span>
      </button>

      {showRules && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4"
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-[#1a2744] rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-white/10 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header + language toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-2 border-amber-300 shrink-0">
                  <span className="text-xl">🧑‍🏫</span>
                </div>
                <div>
                  <p className="text-white font-bold">Professor Globe</p>
                  <p className="text-slate-400 text-xs">{r.subtitle}</p>
                </div>
              </div>

              <div className="flex bg-white/10 rounded-full p-0.5">
                <button
                  onClick={() => switchLang("en")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    lang === "en"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => switchLang("bg")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    lang === "bg"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400"
                  }`}
                >
                  BG
                </button>
              </div>
            </div>

            {/* Rules */}
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">{r.islands.title}</p>
                <p>{r.islands.text}</p>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">{r.memory.title}</p>
                <p>{r.memory.text}</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
                  <li>✅ {r.memory.correct} <span className="text-green-400">+10 pts</span></li>
                  <li>❌ {r.memory.wrong} <span className="text-red-400">-2 pts</span></li>
                  <li>🏆 {r.memory.complete} <span className="text-amber-400">+50 bonus</span></li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">{r.quiz.title}</p>
                <p>{r.quiz.text}</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
                  <li>✅ {r.quiz.correct} <span className="text-green-400">+15 pts</span></li>
                  <li>❌ {r.quiz.wrong} <span className="text-red-400">-5 pts</span></li>
                  <li>🏆 {r.quiz.complete} <span className="text-amber-400">+60 bonus</span></li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">{r.unlock.title}</p>
                <p>
                  🎨 Colors: <span className="text-amber-400">50 pts</span><br />
                  {r.unlock.text}
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white font-semibold mb-1">{r.langs.title}</p>
                <p>{r.langs.text}</p>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-xl font-medium active:bg-blue-700 transition-colors"
            >
              {r.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
