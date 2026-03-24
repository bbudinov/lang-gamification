"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useNPCMemoryStore } from "@/stores/npcMemoryStore";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { askAI } from "@/lib/ai";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";
import { playPopSound, playDingSound, speak, speakAndWait, speakAndWaitGendered, stopAudio } from "@/lib/speech";
import type { Topic, Language } from "@/types";
import { getNPC, type NPCData } from "@/data/npcs";

// Lazy-load 3D avatar to avoid SSR issues
const AvatarCanvas = dynamic(() => import("@/components/avatar/AvatarCanvas"), { ssr: false });

const POINTS_PER_EXCHANGE = 10;
const COMPLETION_BONUS = 50;
const MAX_EXCHANGES = 6;

interface Message {
  role: "npc" | "player";
  text: string;
}

interface DialogueBoxProps {
  topic: Topic;
}

function buildSystemPrompt(npc: NPCData, lang: Language, memories: string[], topicWords: string[]): string {
  const langName = lang === "en" ? "English" : lang === "bg" ? "Bulgarian" : lang === "es" ? "Spanish" : lang === "it" ? "Italian" : lang === "de" ? "German" : "French";
  const memorySection = memories.length > 0
    ? `\n\nYou remember these facts from previous conversations:\n${memories.map((m) => `- ${m}`).join("\n")}\nRefer to these naturally when relevant (e.g., "Last time you said you like dogs!").`
    : "";

  return `You are Professor Globe, a friendly language teacher. You are currently playing the role of a ${npc.role[lang]} to make the lesson fun and immersive. ${npc.personality}

Your goal in this conversation: ${npc.goal[lang]}

CRITICAL LANGUAGE RULE:
- You MUST speak ENTIRELY in ${langName}. Every single word of your response must be in ${langName}.
- NEVER mix languages. Do NOT use English words if the target language is not English.
- The OPTIONS must also be in ${langName}.
- Only the MEMORY and CORRECTION metadata lines can be in English.

RULES:
- You are talking to a learner aged 7-14 who is learning ${langName}.
- Use ONLY these vocabulary words when possible: ${topicWords.join(", ")}. You may use 20% words outside this list for natural flow.
- Keep responses SHORT: maximum 25 words.
- Stay IN CHARACTER at all times. You are a real ${npc.role.en} in your location, not a language teacher.

CONSEQUENCES & CORRECTION (very important):
- If the learner says something that doesn't make sense in context, react naturally IN CHARACTER.
- If the learner makes a grammar/language mistake, correct it naturally by repeating the correct form in ${langName}.
- Add a CORRECTION line when you correct something. Format: CORRECTION: "wrong" → "right"
- Don't be harsh — be helpful and encouraging, but DO react when things don't make sense.

CONVERSATION FLOW:
- Ask follow-up questions to keep the conversation going.
- Use your character's personality and emoji occasionally.
- NEVER use action text like *smiles*, *laughs*, *looks around* etc. Just speak naturally.
- Make the learner DO things: order food, name animals, describe symptoms — not just chat.
- After 4-5 exchanges, naturally wrap up toward your goal.

RESPONSE FORMAT:
- Your spoken message (in ${langName} ONLY)
- At the end, add: OPTIONS: option1 | option2 | option3 (exactly 3 reply options in ${langName}, 2-6 words each)
- If learner shared personal info, add: MEMORY: short fact to remember (English OK here)
- If you corrected a mistake, add: CORRECTION: "wrong form" → "correct form"${memorySection}`;
}

function parseAIResponse(text: string): { message: string; options: string[]; memory: string | null; correction: string | null } {
  let message = text;
  let options: string[] = [];
  let memory: string | null = null;
  let correction: string | null = null;

  // Extract CORRECTION line
  const correctionMatch = message.match(/\n?CORRECTION:\s*(.+)/i);
  if (correctionMatch) {
    correction = correctionMatch[1].trim();
    message = message.replace(correctionMatch[0], "").trim();
  }

  // Extract MEMORY line
  const memoryMatch = message.match(/\n?MEMORY:\s*(.+)/i);
  if (memoryMatch) {
    memory = memoryMatch[1].trim();
    message = message.replace(memoryMatch[0], "").trim();
  }

  // Extract OPTIONS line
  const optionsMatch = message.match(/\n?OPTIONS:\s*(.+)/i);
  if (optionsMatch) {
    options = optionsMatch[1].split("|").map((o) => o.trim()).filter(Boolean);
    message = message.replace(optionsMatch[0], "").trim();
  }

  // Strip action/emotion text like *smiles*, *laughs kindly*, etc.
  message = message.replace(/\*[^*]+\*/g, "").replace(/\s{2,}/g, " ").trim();

  // Fallback options
  if (options.length === 0) {
    options = ["Yes!", "Tell me more", "I don't know"];
  }

  return { message, options, memory, correction };
}

export function DialogueBox({ topic }: DialogueBoxProps) {
  const router = useRouter();
  const { targetLanguage, addPoints, addGameResult } = useProgressStore();
  const { getRecentFacts, addFact } = useNPCMemoryStore();

  const npc = getNPC(topic.id);
  const { isListening, transcript, isSupported: micSupported, start: startMic, stop: stopMic } = useSpeechRecognition(targetLanguage, { continuous: true, silenceMs: 1500 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [npcSpeaking, setNpcSpeaking] = useState(false);
  const [lastCorrection, setLastCorrection] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const aiHistoryRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const speakingRef = useRef(false);

  // Speak NPC message with mouth-sync state (gender-matched voice)
  const speakNPC = useCallback(async (text: string) => {
    speakingRef.current = true;
    setNpcSpeaking(true);
    const gender = npc?.gender || "male";
    window.speechSynthesis?.cancel();
    await speakAndWaitGendered(text, targetLanguage, gender);
    if (speakingRef.current) {
      setNpcSpeaking(false);
      speakingRef.current = false;
    }
  }, [targetLanguage, npc?.gender]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speakingRef.current = false;
      stopAudio();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Start conversation after user tap (required for speech on desktop Chrome)
  const handleStart = useCallback(async () => {
    if (!npc || started) return;
    setStarted(true);

    // Unlock speech synthesis with a silent utterance (user gesture context)
    if ("speechSynthesis" in window) {
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
    }

    // Generate a contextual greeting via AI instead of hardcoded NPC greeting
    const topicWords = topic.words.map((w) => w[targetLanguage]);
    const memories = getRecentFacts(npc.id);
    const systemPrompt = buildSystemPrompt(npc, targetLanguage, memories, topicWords);

    setLoading(true);
    const greetingResponse = await askAI(
      [{ role: "user", content: "[System: Start the conversation. Greet the learner warmly and introduce today's topic. Do NOT mention your name. Just say hello and get started. Include OPTIONS.]" }],
      systemPrompt,
      80
    );
    setLoading(false);

    const parsed = parseAIResponse(greetingResponse || "Hello! 😊 Let's learn together today!");
    const greeting = parsed.message;
    setMessages([{ role: "npc", text: greeting }]);
    if (parsed.options.length > 0) setOptions(parsed.options);

    // Small delay to let speech engine initialize
    await new Promise(r => setTimeout(r, 300));
    await speakNPC(greeting);
    if (parsed.options.length === 0) generateOptions(greeting);
  }, [npc, started, targetLanguage, speakNPC]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const generateOptions = useCallback(async (npcMessage: string) => {
    if (!npc) return;

    // For the greeting, just ask AI for options
    setLoading(true);
    const memories = getRecentFacts(npc.id);
    const topicWords = topic.words.map((w) => w[targetLanguage]);
    const systemPrompt = buildSystemPrompt(npc, targetLanguage, memories, topicWords);

    // Add the NPC message to AI history as assistant
    aiHistoryRef.current.push({ role: "assistant", content: npcMessage });

    // Ask for options only
    const response = await askAI(
      [
        ...aiHistoryRef.current,
        { role: "user", content: "[System: Generate 3 short reply options for the child. Format: OPTIONS: option1 | option2 | option3]" },
      ],
      systemPrompt,
      60
    );

    const parsed = parseAIResponse(response || "OPTIONS: Yes! | Tell me more | I don't know");
    setOptions(parsed.options.length > 0 ? parsed.options : ["Yes!", "Tell me more", "I don't know"]);
    // Remove the system message from history
    aiHistoryRef.current.pop();
    setLoading(false);
  }, [npc, targetLanguage, topic.words, getRecentFacts]);

  const handlePlayerChoice = useCallback(async (choice: string) => {
    if (loading || !npc || npcSpeaking || speakingRef.current) return;

    playPopSound();
    setLoading(true);
    setOptions([]);

    // Add player message
    setMessages((prev) => [...prev, { role: "player", text: choice }]);
    aiHistoryRef.current.push({ role: "user", content: choice });

    // Get AI response
    const memories = getRecentFacts(npc.id);
    const topicWords = topic.words.map((w) => w[targetLanguage]);
    const systemPrompt = buildSystemPrompt(npc, targetLanguage, memories, topicWords);

    const exchangeNum = exchanges + 1;
    const isLast = exchangeNum >= MAX_EXCHANGES;

    let extraInstruction = "";
    if (isLast) {
      extraInstruction = "\n[System: This is the last exchange. Wrap up the conversation warmly and say goodbye. Still include OPTIONS but make them farewell options.]";
    }

    const response = await askAI(
      [
        ...aiHistoryRef.current,
        ...(extraInstruction ? [{ role: "user" as const, content: extraInstruction }] : []),
      ],
      systemPrompt,
      100
    );

    if (!response) {
      // AI failed — provide fallback
      const fallback = "That's great! I had fun talking with you! 😊";
      setMessages((prev) => [...prev, { role: "npc", text: fallback }]);
      speakNPC(fallback);
      setOptions(["Bye!", "Me too!", "See you!"]);
      setLoading(false);
      return;
    }

    const parsed = parseAIResponse(response);

    // Save memory if any
    if (parsed.memory) {
      addFact(npc.id, parsed.memory);
    }

    // Show correction if any
    if (parsed.correction) {
      setLastCorrection(parsed.correction);
      setTimeout(() => setLastCorrection(null), 4000);
    }

    // Add NPC response + speak it
    aiHistoryRef.current.push({ role: "assistant", content: parsed.message });
    setMessages((prev) => [...prev, { role: "npc", text: parsed.message }]);
    speakNPC(parsed.message);
    setScore((s) => s + POINTS_PER_EXCHANGE);
    setExchanges(exchangeNum);

    if (isLast) {
      // Game complete
      playDingSound();
      const finalScore = score + POINTS_PER_EXCHANGE + COMPLETION_BONUS;
      setScore(finalScore);
      addGameResult({
        topicId: topic.id,
        gameType: "npc-talk",
        score: finalScore,
        maxScore: MAX_EXCHANGES * POINTS_PER_EXCHANGE + COMPLETION_BONUS,
        mistakes: 0,
        completedAt: new Date().toISOString(),
      });
      addPoints(finalScore);
      setTimeout(() => setGameCompleted(true), 2000);
      setLoading(false);
    } else {
      setOptions(parsed.options);
      setLoading(false);
    }
  }, [loading, npc, npcSpeaking, exchanges, score, targetLanguage, topic, addFact, addGameResult, addPoints, getRecentFacts, speakNPC]);

  // Process speech recognition result
  const processedTranscriptRef = useRef("");
  useEffect(() => {
    if (!transcript || loading || gameCompleted) return;
    if (transcript === processedTranscriptRef.current) return;
    // Ignore transcripts that are too short (likely noise or echo from speaker)
    if (transcript.trim().length < 2) return;
    // Don't process if NPC is still speaking (mic picked up speaker audio)
    if (speakingRef.current || npcSpeaking) return;
    processedTranscriptRef.current = transcript;
    handlePlayerChoice(transcript);
  }, [transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMicToggle = () => {
    if (isListening) {
      stopMic();
    } else {
      // Don't allow mic while NPC is speaking — it picks up the speaker audio
      if (speakingRef.current || npcSpeaking) {
        stopAudio();
        // Wait a moment for audio to stop before starting mic
        setTimeout(() => {
          processedTranscriptRef.current = "";
          startMic();
        }, 300);
        return;
      }
      processedTranscriptRef.current = "";
      startMic();
    }
  };

  // No NPC for this topic
  if (!npc) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-4 px-6">
        <ProfessorGlobe size={80} emotion="thinking" />
        <p className="text-white text-lg text-center">No character available for this topic yet!</p>
        <button onClick={() => router.push("/map")} className="text-blue-400 text-sm mt-4">
          ← Back to Map
        </button>
      </div>
    );
  }

  // Completed screen
  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-6 px-6">
        {npc.imageFull ? (
          <div style={{ height: 180, filter: "drop-shadow(0 0 16px rgba(34,197,94,0.3))" }}>
            <img src={npc.imageFull} alt={npc.name} className="h-full w-auto object-contain" />
          </div>
        ) : npc.image ? (
          <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            <img src={npc.image} alt={npc.name} className="w-full h-full object-cover object-top" />
          </div>
        ) : (
          <div className="text-8xl" style={{ filter: "drop-shadow(0 0 20px rgba(59, 130, 246, 0.4))" }}>
            {npc.emoji}
          </div>
        )}
        <h2 className="text-3xl font-bold text-white">Great Chat!</h2>
        <p className="text-slate-300 text-center">
          {npc.name} enjoyed talking with you!
        </p>
        <div className="bg-white/5 rounded-2xl p-6 w-full max-w-xs space-y-3">
          <div className="flex justify-between text-slate-300">
            <span>Score</span>
            <span className="text-amber-400 font-bold">⭐ {score}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Exchanges</span>
            <span className="text-white font-bold">{exchanges}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Bonus</span>
            <span className="text-green-400 font-bold">+{COMPLETION_BONUS}</span>
          </div>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setGameCompleted(false);
              setMessages([{ role: "npc", text: npc.greeting[targetLanguage] }]);
              setOptions([]);
              setExchanges(0);
              setScore(0);
              aiHistoryRef.current = [];
              generateOptions(npc.greeting[targetLanguage]);
            }}
            className="flex-1 bg-white/10 text-white py-3 rounded-xl font-medium active:bg-white/20 transition-colors"
          >
            Chat Again
          </button>
          <button
            onClick={() => router.push("/map")}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium active:bg-blue-700 transition-colors"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // "Tap to start" screen — needed for speech synthesis on desktop
  if (!started) {
    return (
      <div className="h-screen w-screen bg-[#0a1628] flex flex-col overflow-hidden">
        <div className="relative flex-1">
          <AvatarCanvas isSpeaking={false} />
          {/* Tap overlay */}
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-20 cursor-pointer"
            onClick={handleStart}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">
              <p className="text-lg font-bold">Tap to start talking</p>
            </div>
            <p className="text-slate-500 text-xs mt-3">{topic.emoji} {topic.name[targetLanguage]}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Top: 3D Avatar area */}
      <div className="relative" style={{ height: "55vh", minHeight: 320 }}>
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 safe-area">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => router.push("/map")}
              className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-black/50 transition-colors"
            >
              <span className="text-white text-sm">← Back</span>
            </button>
            <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="text-amber-400 text-xs">⭐</span>
              <span className="text-white text-sm font-semibold">{score}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="px-4">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${(exchanges / MAX_EXCHANGES) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <AvatarCanvas isSpeaking={npcSpeaking} />

        {/* Speaking indicator at bottom of avatar area */}
        <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center pointer-events-none z-10">
          {npcSpeaking && (
            <div className="flex gap-0.5 items-end mb-1">
              <div className="w-1 bg-blue-400 rounded-full animate-sound-1" />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-2" />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-3" />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-2" />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-1" />
            </div>
          )}
        </div>
      </div>

      {/* Correction toast */}
      {lastCorrection && (
        <div className="mx-4 mb-2 bg-amber-900/40 border border-amber-500/30 rounded-xl px-3 py-2 animate-in slide-in-from-top duration-300 relative z-10">
          <p className="text-amber-300 text-xs font-medium">💡 {lastCorrection}</p>
        </div>
      )}

      {/* Chat messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 space-y-2 pb-3 relative z-10">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "player" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                msg.role === "player"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white/10 backdrop-blur-sm text-white rounded-bl-sm"
              }`}
              style={{ animation: `msg-in 0.3s ease-out both` }}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-sm px-3.5 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options + Mic */}
      {options.length > 0 && !loading && !npcSpeaking && (
        <div className="px-4 pb-6 space-y-2 relative z-10">
          {options.map((option, i) => (
            <button
              key={i}
              onClick={() => handlePlayerChoice(option)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 text-sm font-medium active:bg-white/15 transition-all text-left"
              style={{
                animation: `slide-up 0.3s ease-out ${i * 80}ms both`,
              }}
            >
              {option}
            </button>
          ))}
          {/* Mic button — say your own answer */}
          {micSupported && (
            <div className="flex flex-col items-center pt-2 gap-1">
              <button
                onClick={handleMicToggle}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isListening
                    ? "bg-red-500 shadow-lg shadow-red-500/40 animate-pulse"
                    : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
                }`}
              >
                <span className="text-xl">{isListening ? "⏹️" : "🎤"}</span>
              </button>
              <p className="text-slate-500 text-[10px]">
                {isListening ? "Listening..." : "or say your own!"}
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes npc-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes npc-speak {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes globe-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1.25); }
          50% { opacity: 1; transform: scale(1.35); }
        }
        @keyframes globe-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1.25); }
          50% { opacity: 1; transform: scale(1.45); }
        }
        @keyframes particle-float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 0.4; }
          85% { opacity: 0.4; }
          100% { transform: translateY(-80px) translateX(10px); opacity: 0; }
        }
        .animate-sound-1 {
          animation: sound-wave 0.4s ease-in-out infinite;
          height: 8px;
        }
        .animate-sound-2 {
          animation: sound-wave 0.4s ease-in-out 0.1s infinite;
          height: 14px;
        }
        .animate-sound-3 {
          animation: sound-wave 0.4s ease-in-out 0.2s infinite;
          height: 10px;
        }
        @keyframes sound-wave {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50% { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
