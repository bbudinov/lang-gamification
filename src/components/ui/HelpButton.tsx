"use client";

import { useState } from "react";
import { playPhraseAudio, playPhraseAudioAndWait, stopAudio } from "@/lib/speech";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";

type RulesLang = "en" | "bg";

// Map section index to phrase audio IDs
const SECTION_AUDIO: Record<RulesLang, string[]> = {
  en: [
    "rules-islands-en",
    "rules-stats-en",
    "rules-levels-en",
    "rules-unlock-en",
    "rules-lang-en",
  ],
  bg: [
    "rules-islands-bg",
    "rules-stats-bg",
    "rules-levels-bg",
    "rules-unlock-bg",
    "rules-lang-bg",
  ],
};

// Game-specific audio IDs — preserved for future use
// "rules-memory-en/bg", "rules-quiz-en/bg", "rules-truefalse-en/bg",
// "rules-scramble-en/bg", "rules-fillscene-en/bg", "rules-sayit-en/bg",
// "rules-listenrepeat-en/bg", "rules-npctalk-en/bg"

const RULES = {
  en: {
    subtitle: "Your language guide",
    gotIt: "Got it!",
    sections: [
      {
        title: "🗺️ Islands",
        text: "Tap an island to choose a game. Each island is a topic. Earn points to unlock new ones!",
      },
      {
        title: "📈 Your Stats",
        text: "The top bar shows your progress at a glance!",
        details: [
          "⭐ Points — earn them by playing games",
          "⚡ Energy — refills over time, spend it to play",
          "🔥 Streak — days in a row you played",
          "✅ Daily goals — complete 3 games each day",
          "🌐 Language — switch between BG and EN",
        ],
      },
      {
        title: "📊 Levels",
        text: "Each island has 3 levels: Discover, Use, and Survive. Complete 2 games per level to unlock the next!",
        details: ["🔍 Level 1 — Learn new words", "✍️ Level 2 — Use words in context", "💬 Level 3 — Real communication"],
      },
      {
        title: "🔓 Unlocking",
        text: "Earn points to unlock new islands. Each island costs 500 more!",
      },
      {
        title: "🌐 Languages",
        text: "Switch between English, Bulgarian, and Spanish using the button in the top right corner.",
      },
    ],
  },
  bg: {
    subtitle: "Твоят езиков помощник",
    gotIt: "Разбрах!",
    sections: [
      {
        title: "🗺️ Острови",
        text: "Натисни остров, за да избереш игра. Всеки остров е тема. Печели точки, за да отключиш нови!",
      },
      {
        title: "📈 Твоят прогрес",
        text: "Горната лента показва напредъка ти с един поглед!",
        details: [
          "⭐ Точки — печелиш ги от игрите",
          "⚡ Енергия — зарежда се с времето, харчиш я за игра",
          "🔥 Поредица — колко дни поред си играл",
          "✅ Дневни цели — завърши 3 игри на ден",
          "🌐 Език — превключвай между BG и EN",
        ],
      },
      {
        title: "📊 Нива",
        text: "Всеки остров има 3 нива: Открий, Използвай и Оцелей. Завърши 2 игри на ниво, за да отключиш следващото!",
        details: ["🔍 Ниво 1 — Научи нови думи", "✍️ Ниво 2 — Използвай думите в контекст", "💬 Ниво 3 — Истинска комуникация"],
      },
      {
        title: "🔓 Отключване",
        text: "Печели точки за нови острови. Всеки следващ струва 500 повече!",
      },
      {
        title: "🌐 Езици",
        text: "Превключвай между английски, български и испански с бутона горе вдясно.",
      },
    ],
  },
};

export function HelpButton() {
  const [showRules, setShowRules] = useState(false);
  const [lang, setLang] = useState<RulesLang>("bg");
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [globeSpeaking, setGlobeSpeaking] = useState(false);

  const r = RULES[lang];

  const handleOpen = async () => {
    setShowRules(true);
    setActiveSection(null);
    setGlobeSpeaking(true);
    await playPhraseAudioAndWait(`rules-greeting-${lang}`, 5000);
    setGlobeSpeaking(false);
  };

  const handleClose = () => {
    stopAudio();
    setGlobeSpeaking(false);
    setShowRules(false);
  };

  const switchLang = async (newLang: RulesLang) => {
    setLang(newLang);
    setActiveSection(null);
    setGlobeSpeaking(true);
    await playPhraseAudioAndWait(`rules-greeting-${newLang}`, 5000);
    setGlobeSpeaking(false);
  };

  const handleSectionTap = async (index: number) => {
    setActiveSection(index);
    setGlobeSpeaking(true);
    await playPhraseAudioAndWait(SECTION_AUDIO[lang][index], 10000);
    setGlobeSpeaking(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="absolute bottom-20 right-4 w-14 h-14 rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center active:scale-90 transition-transform border-2 border-blue-500/30"
        style={{ zIndex: 9999, background: "linear-gradient(135deg, #0a1628, #0f2347, #162d50)" }}
      >
        <ProfessorGlobe size={38} />
      </button>

      {showRules && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center bg-black/60 backdrop-blur-sm px-4 pb-4"
          onClick={handleClose}
        >
          {/* Globe floating ABOVE the modal */}
          <div className="relative z-10 mb-[-28px] animate-in zoom-in-75 duration-500">
            <ProfessorGlobe size={180} speaking={globeSpeaking} emotion={globeSpeaking ? "happy" : "idle"} />
          </div>

          <div
            className="bg-[#1a2744]/95 rounded-2xl p-5 pt-12 w-full max-w-sm shadow-2xl border border-white/10 max-h-[65vh] overflow-y-auto backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — name + lang toggle (Globe is above) */}
            <div className="flex flex-col items-center mb-4">
              <p className="text-white font-bold text-lg">Professor Globe</p>
              <p className="text-slate-400 text-xs">{r.subtitle}</p>

              <div className="flex bg-white/10 rounded-full p-0.5 mt-2">
                <button
                  onClick={() => switchLang("en")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    lang === "en" ? "bg-blue-600 text-white" : "text-slate-400"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => switchLang("bg")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    lang === "bg" ? "bg-blue-600 text-white" : "text-slate-400"
                  }`}
                >
                  BG
                </button>
              </div>
            </div>

            <p className="text-slate-500 text-xs mb-3 text-center">
              {lang === "en" ? "Tap any section to hear it" : "Натисни секция, за да я чуеш"}
            </p>

            {/* Rules - clickable sections */}
            <div className="space-y-2.5 text-sm text-slate-300 leading-relaxed">
              {r.sections.map((section, i) => (
                <button
                  key={i}
                  onClick={() => handleSectionTap(i)}
                  className={`w-full text-left rounded-xl p-3 transition-all ${
                    activeSection === i
                      ? "bg-blue-600/20 border border-blue-500/40 ring-1 ring-blue-500/20"
                      : "bg-white/5 border border-transparent hover:bg-white/10 active:bg-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{section.title}</p>
                    <span className="text-blue-400 text-xs">🔊</span>
                  </div>
                  <p className="mt-0.5">{section.text}</p>
                  {section.details && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-slate-400">
                      {section.details.map((d, j) => (
                        <li key={j}>{d}</li>
                      ))}
                    </ul>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleClose}
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
