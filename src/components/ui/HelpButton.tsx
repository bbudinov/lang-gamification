"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { playPhraseAudio, playPhraseAudioAndWait, stopAudio } from "@/lib/speech";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";

const AvatarCanvas = dynamic(() => import("@/components/avatar/AvatarCanvas"), { ssr: false });

type RulesLang = "en" | "bg";

// Map section index to phrase audio IDs
const SECTION_AUDIO: Record<RulesLang, string[]> = {
  en: [
    "rules-islands-en",
    "rules-memory-en",
    "rules-memorymix-en",
    "rules-quiz-en",
    "rules-truefalse-en",
    "rules-scramble-en",
    "rules-fillscene-en",
    "rules-sayit-en",
    "rules-listenrepeat-en",
    "rules-npctalk-en",
    "rules-lang-en",
  ],
  bg: [
    "rules-islands-bg",
    "rules-memory-bg",
    "rules-memorymix-bg",
    "rules-quiz-bg",
    "rules-truefalse-bg",
    "rules-scramble-bg",
    "rules-fillscene-bg",
    "rules-sayit-bg",
    "rules-listenrepeat-bg",
    "rules-npctalk-bg",
    "rules-lang-bg",
  ],
};

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
        title: "🃏 Memory Match",
        text: "Flip cards to find matching word pairs.",
        details: ["✅ Correct match: +10 pts", "❌ Wrong match: -2 pts", "🏆 Complete all: +50 bonus"],
      },
      {
        title: "🌀 Memory Mix",
        text: "A special challenge! Words from different islands are mixed together. Unlocks after completing Memory Match on 2 islands.",
        details: ["🔓 Play Memory on 2+ islands to unlock", "📈 More cards as you play more", "🌀 Find the button on the map"],
      },
      {
        title: "🎯 Word Quiz",
        text: "Listen to a word and pick the right translation.",
        details: ["✅ Correct: +15 pts", "❌ Wrong: -5 pts", "🏆 Complete all: +60 bonus"],
      },
      {
        title: "✅ True or False",
        text: "See a word and its translation. Decide if it's correct!",
        details: ["✅ Correct: +10 pts", "❌ Wrong: -5 pts", "🏆 Complete all: +40 bonus"],
      },
      {
        title: "🔤 Word Scramble",
        text: "Tap the scrambled letters in the right order to spell the word.",
        details: ["✅ Correct: +20 pts", "❌ Wrong letter: -3 pts", "🏆 Complete all: +50 bonus"],
      },
      {
        title: "🎬 Fill the Scene",
        text: "Complete sentences in real situations. Pick the right word for each blank!",
        details: ["✅ Correct: +15 pts", "❌ Wrong: -5 pts", "🏆 Complete all: +60 bonus"],
      },
      {
        title: "🎤 Say It!",
        text: "Practice saying words out loud. The game listens and checks your pronunciation!",
        details: ["✅ Good pronunciation: +20 pts", "🔄 Try again if needed"],
      },
      {
        title: "🗣️ Listen & Repeat",
        text: "Listen to Professor Globe say a phrase, then repeat it yourself!",
        details: ["✅ Good repeat: +15 pts", "🔄 Listen again anytime"],
      },
      {
        title: "💬 NPC Talk",
        text: "Chat with a character using AI! Have a real conversation to practice your skills.",
        details: ["✅ Each reply: +10 pts", "🏆 Complete chat: +50 bonus"],
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
        title: "🃏 Memory Match",
        text: "Обръщай карти и намери съвпадащи двойки думи.",
        details: ["✅ Вярна двойка: +10 точки", "❌ Грешна двойка: -2 точки", "🏆 Завърши всички: +50 бонус"],
      },
      {
        title: "🌀 Memory Mix",
        text: "Специално предизвикателство! Думи от различни острови са смесени заедно. Отключва се след Memory Match на 2 острова.",
        details: ["🔓 Играй Memory на 2+ острова", "📈 Повече карти с всяка игра", "🌀 Намери бутона на картата"],
      },
      {
        title: "🎯 Word Quiz",
        text: "Чуй дума и избери правилния превод.",
        details: ["✅ Вярно: +15 точки", "❌ Грешно: -5 точки", "🏆 Завърши всички: +60 бонус"],
      },
      {
        title: "✅ Вярно или Грешно",
        text: "Виждаш дума и превод. Реши дали е вярно!",
        details: ["✅ Вярно: +10 точки", "❌ Грешно: -5 точки", "🏆 Завърши всички: +40 бонус"],
      },
      {
        title: "🔤 Word Scramble",
        text: "Натискай разбърканите букви в правилния ред, за да изпишеш думата.",
        details: ["✅ Вярно: +20 точки", "❌ Грешна буква: -3 точки", "🏆 Завърши всички: +50 бонус"],
      },
      {
        title: "🎬 Попълни сцената",
        text: "Довърши изреченията в реални ситуации. Избери правилната дума за всяко празно място!",
        details: ["✅ Вярно: +15 точки", "❌ Грешно: -5 точки", "🏆 Завърши всички: +60 бонус"],
      },
      {
        title: "🎤 Кажи го!",
        text: "Упражнявай произношението си на глас. Играта слуша и проверява!",
        details: ["✅ Добро произношение: +20 точки", "🔄 Опитай отново ако трябва"],
      },
      {
        title: "🗣️ Слушай и повтори",
        text: "Чуй как Професор Глобус казва фраза, после я повтори!",
        details: ["✅ Добро повторение: +15 точки", "🔄 Чуй отново по всяко време"],
      },
      {
        title: "💬 NPC разговор",
        text: "Разговаряй с герой чрез AI! Води истински разговор, за да упражниш уменията си.",
        details: ["✅ Всеки отговор: +10 точки", "🏆 Завърши чата: +50 бонус"],
      },
      {
        title: "🌐 Езици",
        text: "Превключвай между английски, български и испански с бутона горе вдясно.",
      },
    ],
  },
};

interface HelpButtonProps {
  onOpen?: () => void;
  onClose?: () => void;
}

export function HelpButton({ onOpen, onClose }: HelpButtonProps) {
  const [showRules, setShowRules] = useState(false);
  const [lang, setLang] = useState<RulesLang>("en");
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [globeSpeaking, setGlobeSpeaking] = useState(false);

  const r = RULES[lang];

  const handleOpen = async () => {
    setShowRules(true);
    onOpen?.();
    setActiveSection(null);
    setGlobeSpeaking(true);
    await playPhraseAudioAndWait(`rules-greeting-${lang}`, 15000);
    setGlobeSpeaking(false);
  };

  const handleClose = () => {
    stopAudio();
    setGlobeSpeaking(false);
    setShowRules(false);
    onClose?.();
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
    await playPhraseAudioAndWait(SECTION_AUDIO[lang][index], 30000);
    setGlobeSpeaking(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="absolute bottom-36 right-4 w-14 h-14 rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center active:scale-90 transition-transform border-2 border-blue-500/30"
        style={{ zIndex: 9999, background: "linear-gradient(135deg, #0a1628, #0f2347, #162d50)" }}
      >
        <ProfessorGlobe size={38} />
      </button>

      {showRules && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#0a1628]"
          onClick={handleClose}
        >
          {/* 3D Avatar — top portion */}
          <div className="relative" style={{ height: "40vh", minHeight: 240 }}>
            <AvatarCanvas isSpeaking={globeSpeaking} />
            {globeSpeaking && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none z-10">
                <div className="flex gap-0.5 items-end">
                  <div className="w-1 bg-blue-400 rounded-full animate-sound-1" style={{ height: 8 }} />
                  <div className="w-1 bg-blue-400 rounded-full animate-sound-2" style={{ height: 14 }} />
                  <div className="w-1 bg-blue-400 rounded-full animate-sound-3" style={{ height: 8 }} />
                  <div className="w-1 bg-blue-400 rounded-full animate-sound-2" style={{ height: 14 }} />
                  <div className="w-1 bg-blue-400 rounded-full animate-sound-1" style={{ height: 8 }} />
                </div>
              </div>
            )}
          </div>

          {/* Modal content — bottom portion */}
          <div
            className="flex-1 w-full max-w-sm mx-auto bg-[#1a2744]/95 rounded-t-2xl p-5 border border-white/10 border-b-0 overflow-y-auto"
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

          <style jsx>{`
            @keyframes sound-wave { 0%, 100% { height: 4px; } 50% { height: 14px; } }
            .animate-sound-1 { animation: sound-wave 0.4s ease-in-out infinite; }
            .animate-sound-2 { animation: sound-wave 0.4s ease-in-out 0.1s infinite; }
            .animate-sound-3 { animation: sound-wave 0.4s ease-in-out 0.2s infinite; }
          `}</style>
        </div>
      )}
    </>
  );
}
