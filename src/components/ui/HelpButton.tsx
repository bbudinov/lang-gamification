"use client";

import { useState, useEffect } from "react";
import {
  speak,
  stopSpeech,
  getVoicesForLanguage,
  speakWithVoice,
  setPreferredVoice,
} from "@/lib/speech";

type RulesLang = "en" | "bg";

const TEST_PHRASE: Record<RulesLang, string> = {
  bg: "Здравей! Аз съм Професор Глоуб, твоят езиков помощник.",
  en: "Hello! I am Professor Globe, your language guide.",
};

const RULES = {
  en: {
    greeting: "Hi there! Let me explain how the game works.",
    subtitle: "Your language guide",
    gotIt: "Got it!",
    sections: [
      {
        title: "🗺️ Islands",
        text: "Tap an island to choose a game. Each island is a topic. Earn points to unlock new ones!",
        speech: "Tap an island to choose a game. Each island is a topic. Earn points to unlock new ones!",
      },
      {
        title: "🃏 Memory Match",
        text: "Flip cards to find matching word pairs.",
        details: ["✅ Correct match: +10 pts", "❌ Wrong match: -2 pts", "🏆 Complete all: +50 bonus"],
        speech: "Memory Match. Flip cards to find matching word pairs. You get 10 points for a correct match, lose 2 for a wrong one, and earn 50 bonus points for completing all pairs!",
      },
      {
        title: "🎯 Word Quiz",
        text: "Listen to a word and pick the right translation.",
        details: ["✅ Correct: +15 pts", "❌ Wrong: -5 pts", "🏆 Complete all: +60 bonus"],
        speech: "Word Quiz. Listen to a word and pick the right translation. You earn 15 points for a correct answer, lose 5 for a wrong one, and get 60 bonus points for finishing!",
      },
      {
        title: "✅ True or False",
        text: "See a word and its translation. Decide if it's correct!",
        details: ["✅ Correct: +10 pts", "❌ Wrong: -5 pts", "🏆 Complete all: +40 bonus"],
        speech: "True or False. You see a word and a translation. Decide if the translation is correct or not! You earn 10 points for a right answer and lose 5 for a wrong one.",
      },
      {
        title: "🔤 Word Scramble",
        text: "Tap the scrambled letters in the right order to spell the word.",
        details: ["✅ Correct: +20 pts", "❌ Wrong letter: -3 pts", "🏆 Complete all: +50 bonus"],
        speech: "Word Scramble. The letters of a word are mixed up. Tap them in the right order to spell the translation! You earn 20 points per word and lose 3 for each wrong tap.",
      },
      {
        title: "🔓 Unlocking",
        text: "Earn points to unlock new islands. Each island costs 500 more!",
        speech: "Earn enough points to unlock new islands. Each new island costs 500 more points than the previous one!",
      },
      {
        title: "🌐 Languages",
        text: "Switch between English, Bulgarian, and Spanish using the button in the top right corner.",
        speech: "You can switch between English, Bulgarian, and Spanish using the language button in the top right corner.",
      },
    ],
  },
  bg: {
    greeting: "Здравей! Нека ти обясня как работи играта.",
    subtitle: "Твоят езиков помощник",
    gotIt: "Разбрах!",
    sections: [
      {
        title: "🗺️ Острови",
        text: "Натисни остров, за да избереш игра. Всеки остров е тема. Печели точки, за да отключиш нови!",
        speech: "Натисни остров, за да избереш игра. Всеки остров е тема. Печели точки, за да отключиш нови!",
      },
      {
        title: "🃏 Memory Match",
        text: "Обръщай карти и намери съвпадащи двойки думи.",
        details: ["✅ Вярна двойка: +10 точки", "❌ Грешна двойка: -2 точки", "🏆 Завърши всички: +50 бонус"],
        speech: "Мемори Мач. Обръщай карти и намери съвпадащи двойки думи. Получаваш 10 точки за вярна двойка, губиш 2 за грешна, и печелиш 50 бонус точки ако завършиш всички!",
      },
      {
        title: "🎯 Word Quiz",
        text: "Чуй дума и избери правилния превод.",
        details: ["✅ Вярно: +15 точки", "❌ Грешно: -5 точки", "🏆 Завърши всички: +60 бонус"],
        speech: "Уърд Куиз. Чуй дума и избери правилния превод от четири варианта. Получаваш 15 точки за верен отговор, губиш 5 за грешен, и печелиш 60 бонус точки ако завършиш!",
      },
      {
        title: "✅ Вярно или Грешно",
        text: "Виждаш дума и превод. Реши дали е вярно!",
        details: ["✅ Вярно: +10 точки", "❌ Грешно: -5 точки", "🏆 Завърши всички: +40 бонус"],
        speech: "Вярно или Грешно. Виждаш дума и превод. Реши дали преводът е верен или не! Получаваш 10 точки за правилен отговор и губиш 5 за грешен.",
      },
      {
        title: "🔤 Word Scramble",
        text: "Натискай разбърканите букви в правилния ред, за да изпишеш думата.",
        details: ["✅ Вярно: +20 точки", "❌ Грешна буква: -3 точки", "🏆 Завърши всички: +50 бонус"],
        speech: "Уърд Скрамбъл. Буквите на дума са разбъркани. Натискай ги в правилния ред, за да изпишеш превода! Получаваш 20 точки за всяка дума и губиш 3 за грешно натискане.",
      },
      {
        title: "🔓 Отключване",
        text: "Печели точки за нови острови. Всеки следващ струва 500 повече!",
        speech: "Печели достатъчно точки, за да отключиш нови острови. Всеки следващ остров струва 500 точки повече от предишния!",
      },
      {
        title: "🌐 Езици",
        text: "Превключвай между английски, български и испански с бутона горе вдясно.",
        speech: "Можеш да превключваш между английски, български и испански с бутона за език горе вдясно.",
      },
    ],
  },
};

export function HelpButton() {
  const [showRules, setShowRules] = useState(false);
  const [lang, setLang] = useState<RulesLang>("bg");
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [bgVoices, setBgVoices] = useState<{ name: string; lang: string }[]>([]);
  const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  const r = RULES[lang];

  // Load available BG voices when panel opens
  useEffect(() => {
    if (showRules) {
      getVoicesForLanguage("bg").then((voices) => {
        setBgVoices(voices);
      });
    }
  }, [showRules]);

  const handleOpen = () => {
    setShowRules(true);
    setActiveSection(null);
    setShowVoicePicker(false);
    speak(r.greeting, lang);
  };

  const handleClose = () => {
    stopSpeech();
    setShowRules(false);
    setShowVoicePicker(false);
  };

  const switchLang = (newLang: RulesLang) => {
    setLang(newLang);
    setActiveSection(null);
    speak(RULES[newLang].greeting, newLang);
  };

  const handleSectionTap = (index: number) => {
    setActiveSection(index);
    speak(r.sections[index].speech, lang);
  };

  const handleVoiceSelect = (idx: number) => {
    setSelectedVoiceIdx(idx);
    const voice = bgVoices[idx];
    setPreferredVoice("bg", voice.name);
    speakWithVoice(TEST_PHRASE.bg, "bg", voice.name);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="absolute bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-90 transition-transform border-2 border-amber-300"
        style={{ zIndex: 9999 }}
      >
        <span className="text-2xl">🧑‍🏫</span>
      </button>

      {showRules && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4"
          onClick={handleClose}
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

            {/* Voice picker toggle */}
            {bgVoices.length > 0 && (
              <button
                onClick={() => setShowVoicePicker(!showVoicePicker)}
                className="w-full mb-3 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-xl py-2 px-3 transition-colors"
              >
                <span className="text-sm">🎙️</span>
                <span className="text-slate-400 text-xs">
                  {showVoicePicker
                    ? lang === "en" ? "Hide voices" : "Скрий гласовете"
                    : lang === "en" ? "Change voice" : "Смени гласа"}
                </span>
              </button>
            )}

            {/* Voice picker list */}
            {showVoicePicker && bgVoices.length > 0 && (
              <div className="mb-3 space-y-1.5">
                <p className="text-slate-500 text-xs text-center mb-2">
                  {lang === "en"
                    ? "Tap a voice to hear it, then close to keep it"
                    : "Натисни глас, за да го чуеш"}
                </p>
                {bgVoices.map((voice, idx) => (
                  <button
                    key={voice.name}
                    onClick={() => handleVoiceSelect(idx)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-all ${
                      selectedVoiceIdx === idx
                        ? "bg-blue-600/20 border border-blue-500/40 text-white"
                        : "bg-white/5 border border-transparent text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="font-medium">{voice.name}</span>
                    <span className="text-slate-500 ml-2">({voice.lang})</span>
                  </button>
                ))}
              </div>
            )}

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
