"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";
import { useSpeechRecognition, similarityScore } from "@/hooks/useSpeechRecognition";
import { getRoomById } from "@/data/rooms";
import type { ConversationStep } from "@/data/rooms";
import { speakAndWaitGendered, stopAudio } from "@/lib/speech";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const room = getRoomById(params.id as string);
  const { targetLanguage, addPoints, addCoins } = useProgressStore();
  const profile = useAuthStore((s) => s.profile);
  const lang = targetLanguage as "en" | "bg" | "es";
  const avatar = profile?.avatar_emoji || "🧑";

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"npc-talking" | "choosing" | "listening" | "response" | "complete">("npc-talking");
  const [lastCorrect, setLastCorrect] = useState(true);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [npcText, setNpcText] = useState("");
  const [showItems, setShowItems] = useState(false);
  const [speechResult, setSpeechResult] = useState<string>("");
  const [showTapFallback, setShowTapFallback] = useState(false);
  const [started, setStarted] = useState(false);

  const { isListening, transcript, isSupported, start: startListening, stop: stopListening } = useSpeechRecognition(lang);

  const handleStart = () => {
    // This click provides the user gesture needed for audio playback
    setStarted(true);
    setPhase("npc-talking");
  };

  // Typewriter effect for NPC text
  const typeText = useCallback((text: string, onDone: () => void) => {
    let i = 0;
    setNpcText("");
    const interval = setInterval(() => {
      i++;
      setNpcText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        onDone();
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Start NPC talking when step changes — voice + typewriter
  useEffect(() => {
    if (!room || phase !== "npc-talking" || !started) return;
    const currentStep = room.conversation[step];
    if (!currentStep) return;

    setSpeechResult("");
    setShowTapFallback(false);

    // NPC speaks with gendered voice
    const gender = room.npc.gender || "male";
    speakAndWaitGendered(currentStep.npcSays[lang], lang, gender).catch(() => {});

    const cleanup = typeText(currentStep.npcSays[lang], () => {
      setPhase("choosing");
      setShowItems(true);
    });
    return () => {
      cleanup();
      stopAudio();
    };
  }, [step, phase, room, lang, typeText]);

  // Process speech recognition result
  useEffect(() => {
    if (!transcript || !room || phase !== "listening") return;

    const currentStep = room.conversation[step];
    if (!currentStep) return;

    setSpeechResult(transcript);

    // Check against all correct options
    const correctOptions = currentStep.options.filter((o) => o.correct);
    let bestMatch = 0;

    for (const opt of correctOptions) {
      const score = similarityScore(transcript, opt.text[lang]);
      if (score > bestMatch) bestMatch = score;
    }

    // Threshold: 0.4 similarity = good enough (speech recognition is imperfect, especially for kids)
    const isCorrect = bestMatch >= 0.4;

    setTotalAttempts((a) => a + 1);
    setLastCorrect(isCorrect);

    if (isCorrect) {
      setScore((s) => s + 1);
      setNpcText(currentStep.correctResponse[lang]);
      speakAndWaitGendered(currentStep.correctResponse[lang], lang, room.npc.gender || "male").catch(() => {});
    } else {
      setNpcText(currentStep.wrongResponse[lang]);
      speakAndWaitGendered(currentStep.wrongResponse[lang], lang, room.npc.gender || "male").catch(() => {});
    }
    setPhase("response");
  }, [transcript, room, step, lang, phase]);

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <p className="text-white">Room not found</p>
      </div>
    );
  }

  const currentStep: ConversationStep | undefined = room.conversation[step];

  // Start screen — needs user tap to unlock audio
  if (!started) {
    return (
      <div className={`min-h-screen bg-gradient-to-b ${room.bgGradient} bg-[#0a1628] flex flex-col items-center justify-center px-4 gap-6`}>
        <div className="text-7xl">{room.npc.emoji}</div>
        <h2 className="text-white text-2xl font-bold text-center">{room.name[lang]}</h2>
        <p className="text-slate-400 text-center text-sm max-w-xs">{room.description[lang]}</p>
        <button
          onClick={handleStart}
          className="bg-green-600 text-white px-10 py-4 rounded-full font-bold text-lg active:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-600/30"
        >
          {lang === "bg" ? "Започни разговор" : lang === "es" ? "Iniciar conversación" : "Start Conversation"}
        </button>
        <button
          onClick={() => router.push("/rooms")}
          className="text-slate-500 text-sm active:text-slate-300 transition-colors"
        >
          {lang === "bg" ? "← Назад" : lang === "es" ? "← Volver" : "← Back"}
        </button>
      </div>
    );
  }

  const handleMicPress = () => {
    if (isListening) {
      stopListening();
    } else {
      setSpeechResult("");
      setPhase("listening");
      startListening();
      // Show tap fallback after 5 seconds if still listening
      setTimeout(() => setShowTapFallback(true), 5000);
    }
  };

  const handleTapChoice = (correct: boolean) => {
    setTotalAttempts((a) => a + 1);
    setLastCorrect(correct);

    if (correct) {
      setScore((s) => s + 1);
      setNpcText(currentStep.correctResponse[lang]);
      speakAndWaitGendered(currentStep.correctResponse[lang], lang, room.npc.gender || "male").catch(() => {});
    } else {
      setNpcText(currentStep.wrongResponse[lang]);
      speakAndWaitGendered(currentStep.wrongResponse[lang], lang, room.npc.gender || "male").catch(() => {});
    }
    setPhase("response");
  };

  const handleNext = () => {
    if (!lastCorrect) {
      setPhase("npc-talking");
      return;
    }

    const nextStep = step + 1;
    if (nextStep >= room.conversation.length) {
      addPoints(room.rewardXP);
      addCoins(room.rewardCoins);
      setPhase("complete");
    } else {
      setStep(nextStep);
      setPhase("npc-talking");
      setShowItems(false);
    }
  };

  const handleFinish = () => {
    router.push("/rooms");
  };

  // Completion screen
  if (phase === "complete") {
    const pct = totalAttempts > 0 ? Math.round((score / totalAttempts) * 100) : 100;
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl">🎉</div>
          <h2 className="text-white text-2xl font-bold">
            {lang === "bg" ? "Браво!" : lang === "es" ? "¡Bravo!" : "Well done!"}
          </h2>
          <p className="text-slate-400">
            {lang === "bg"
              ? `Завърши разговора в ${room.name[lang]}!`
              : lang === "es"
              ? `¡Completaste la conversación en ${room.name[lang]}!`
              : `You completed the conversation at ${room.name[lang]}!`}
          </p>

          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-amber-400 text-2xl font-bold">+{room.rewardXP}</p>
              <p className="text-slate-500 text-xs">XP</p>
            </div>
            <div className="text-center">
              <p className="text-yellow-400 text-2xl font-bold">+{room.rewardCoins}</p>
              <p className="text-slate-500 text-xs">🪙</p>
            </div>
            <div className="text-center">
              <p className="text-green-400 text-2xl font-bold">{pct}%</p>
              <p className="text-slate-500 text-xs">Score</p>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold active:bg-blue-700 transition-colors"
          >
            {lang === "bg" ? "Продължи" : lang === "es" ? "Continuar" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${room.bgGradient} bg-[#0a1628] flex flex-col`}>
      {/* Header */}
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/rooms")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">&larr;</span>
          </button>
          <h1 className="text-white font-bold text-base">
            {room.emoji} {room.name[lang]}
          </h1>
          <div className="text-slate-400 text-xs">
            {step + 1}/{room.conversation.length}
          </div>
        </div>
      </div>

      {/* Scene — characters + items */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {/* Characters */}
        <div className="flex items-end justify-center gap-8 w-full max-w-sm">
          {/* Player avatar */}
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${
              phase === "listening"
                ? "bg-green-600/30 border-green-400/50 scale-110"
                : "bg-blue-600/20 border-blue-500/30"
            }`}>
              <span className="text-4xl">{avatar}</span>
            </div>
            <p className={`text-xs mt-1 font-medium ${
              phase === "listening" ? "text-green-400" : "text-blue-400"
            }`}>
              {phase === "listening"
                ? (lang === "bg" ? "Говори..." : lang === "es" ? "Habla..." : "Speak...")
                : (lang === "bg" ? "Ти" : lang === "es" ? "Tú" : "You")}
            </p>
          </div>

          {/* NPC */}
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${
              phase === "npc-talking"
                ? "bg-amber-600/30 border-amber-400/50 scale-105"
                : "bg-amber-600/20 border-amber-500/30"
            }`}>
              <span className="text-4xl">{room.npc.emoji}</span>
            </div>
            <p className="text-amber-400 text-xs mt-1 font-medium">{room.npc.name}</p>
          </div>
        </div>

        {/* Items shelf */}
        {showItems && (
          <div className="flex items-center justify-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
            {room.items.map((item, i) => (
              <div key={i} className="text-center">
                <span className="text-2xl">{item.emoji}</span>
                <p className="text-slate-400 text-[10px] mt-0.5">{item.name[lang]}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversation panel */}
      <div className="bg-[#0d1b32]/90 backdrop-blur-sm border-t border-white/10 px-4 py-5 space-y-4 rounded-t-3xl">
        {/* NPC speech bubble */}
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{room.npc.emoji}</span>
          <div className="flex-1 bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className={`text-white text-sm leading-relaxed ${
              phase === "response" && !lastCorrect ? "text-red-300" : ""
            } ${phase === "response" && lastCorrect ? "text-green-300" : ""}`}>
              {npcText}
              {phase === "npc-talking" && <span className="animate-pulse">|</span>}
            </p>
          </div>
        </div>

        {/* Speech result */}
        {speechResult && phase === "response" && (
          <div className="flex items-start gap-3 justify-end">
            <div className={`bg-blue-600/20 rounded-2xl rounded-tr-sm px-4 py-3 ${
              lastCorrect ? "border border-green-500/30" : "border border-red-500/30"
            }`}>
              <p className="text-white text-sm italic">"{speechResult}"</p>
            </div>
            <span className="text-2xl mt-0.5">{avatar}</span>
          </div>
        )}

        {/* Speak or choose */}
        {(phase === "choosing" || phase === "listening") && currentStep && (
          <div className="space-y-3">
            {/* Mic button — primary action */}
            {isSupported && (
              <button
                onClick={handleMicPress}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 ${
                  isListening
                    ? "bg-red-600 text-white animate-pulse active:bg-red-700"
                    : "bg-green-600 text-white active:bg-green-700 active:scale-[0.98]"
                }`}
              >
                <span className="text-2xl">{isListening ? "⏹️" : "🎤"}</span>
                {isListening
                  ? (lang === "bg" ? "Слушам... натисни да спреш" : lang === "es" ? "Escuchando... toca para parar" : "Listening... tap to stop")
                  : (lang === "bg" ? "Натисни и кажи отговора" : lang === "es" ? "Toca y di tu respuesta" : "Tap and say your answer")}
              </button>
            )}

            {/* Hint: show options user can say */}
            <div className="text-center">
              <p className="text-slate-500 text-xs mb-2">
                {lang === "bg" ? "Кажи нещо като:" : lang === "es" ? "Di algo como:" : "Say something like:"}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {currentStep.options.filter((o) => o.correct).map((opt, i) => (
                  <span key={i} className="text-xs bg-white/5 text-slate-400 px-2.5 py-1 rounded-full">
                    "{opt.text[lang]}"
                  </span>
                ))}
              </div>
            </div>

            {/* Tap fallback — always available, but subtle */}
            <div className={`transition-all ${showTapFallback || !isSupported ? "opacity-100" : "opacity-40"}`}>
              <p className="text-slate-600 text-[10px] text-center mb-1.5">
                {lang === "bg" ? "или избери:" : lang === "es" ? "o elige:" : "or choose:"}
              </p>
              <div className="space-y-1.5">
                {currentStep.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleTapChoice(opt.correct)}
                    className="w-full text-left bg-white/5 active:bg-white/10 border border-white/5 rounded-xl px-3 py-2 text-slate-400 text-xs transition-all active:scale-[0.98]"
                  >
                    {opt.text[lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Next button after response */}
        {phase === "response" && (
          <button
            onClick={handleNext}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${
              lastCorrect
                ? "bg-green-600 text-white active:bg-green-700"
                : "bg-amber-600 text-white active:bg-amber-700"
            }`}
          >
            {lastCorrect
              ? (lang === "bg" ? "Продължи →" : lang === "es" ? "Continuar →" : "Continue →")
              : (lang === "bg" ? "Опитай пак" : lang === "es" ? "Intenta de nuevo" : "Try again")}
          </button>
        )}
      </div>
    </div>
  );
}
