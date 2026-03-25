"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useNPCMemoryStore } from "@/stores/npcMemoryStore";
import { useSpeechRecognition, similarityScore } from "@/hooks/useSpeechRecognition";
import { askAI } from "@/lib/ai";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";
import { StarDisplay, GameRewardSummary } from "@/components/game/StarDisplay";
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
  pronScore?: number; // Pronunciation confidence 0-100 (player only)
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
- Core vocabulary for this topic: ${topicWords.join(", ")}. Try to weave these words into the conversation naturally.
- IMPORTANT: If the learner asks about ANYTHING — even if it's not in the vocabulary list — ALWAYS engage with it! Share a fun fact or short bio about it. You are an encyclopedia of knowledge. NEVER say "we don't have that" or "let's talk about something else". Every question deserves an answer.
- After answering their question, you can gently guide back to the topic vocabulary.
- Keep responses SHORT: maximum 30 words.
- Stay IN CHARACTER at all times. You are a real ${npc.role.en} in your location, not a language teacher.
- NEVER restrict what the learner can ask about. Be curious and enthusiastic about EVERYTHING they want to know.
- NEVER repeat your greeting or welcome message. Each response must be fresh and different.

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

  // Extract CORRECTION line (with or without content after it)
  const correctionMatch = message.match(/\n?CORRECTION:\s*(.*)/i);
  if (correctionMatch) {
    const val = correctionMatch[1].trim();
    if (val) correction = val;
    message = message.replace(correctionMatch[0], "").trim();
  }

  // Extract MEMORY line (with or without content after it)
  const memoryMatch = message.match(/\n?MEMORY:\s*(.*)/i);
  if (memoryMatch) {
    const val = memoryMatch[1].trim();
    if (val) memory = val;
    message = message.replace(memoryMatch[0], "").trim();
  }

  // Extract OPTIONS line (with or without content after it)
  const optionsMatch = message.match(/\n?OPTIONS:\s*(.*)/i);
  if (optionsMatch) {
    const optText = optionsMatch[1].trim();
    if (optText) {
      options = optText.split("|").map((o) => o.trim()).filter(Boolean);
    }
    message = message.replace(optionsMatch[0], "").trim();
  }

  // Strip action/emotion text like *smiles*, *laughs kindly*, etc.
  // Also strip any remaining metadata tags the AI might have added
  message = message.replace(/\*[^*]+\*/g, "").replace(/\s{2,}/g, " ").trim();
  // Safety: strip any leftover "TAG:" patterns at end of message
  message = message.replace(/\s*(MEMORY|OPTIONS|CORRECTION):\s*$/i, "").trim();

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
  const { isListening, transcript, confidence, isSupported: micSupported, start: startMic, stop: stopMic } = useSpeechRecognition(targetLanguage);
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

  // Speak NPC message using Google Cloud TTS (same voice on all devices)
  const npcAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const speakNPC = useCallback(async (text: string) => {
    speakingRef.current = true;
    setAudioLoading(true);

    // Strip emoji before sending to TTS
    const clean = text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu, "").replace(/\s{2,}/g, " ").trim();

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, language: targetLanguage }),
      });
      if (res.ok) {
        const { audioContent } = await res.json();
        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        npcAudioRef.current = audio;
        setAudioLoading(false);
        // NOW start lip sync — audio is ready
        setNpcSpeaking(true);
        await new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => { if (!resolved) { resolved = true; resolve(); } };
          // Safety timeout in case onended never fires (Android Chrome issue)
          const timeout = setTimeout(done, 12000);
          audio.onended = () => { clearTimeout(timeout); done(); };
          audio.onerror = () => { clearTimeout(timeout); done(); };
          // Also use timeupdate to detect when audio finishes
          audio.ontimeupdate = () => {
            if (audio.currentTime >= audio.duration - 0.1) {
              clearTimeout(timeout);
              done();
            }
          };
          audio.play().catch(() => { clearTimeout(timeout); done(); });
        });
      } else {
        setAudioLoading(false);
      }
    } catch {
      setAudioLoading(false);
      // Fallback to Web Speech API if Google TTS fails
      setNpcSpeaking(true);
      window.speechSynthesis?.cancel();
      await speakAndWaitGendered(clean, targetLanguage, "male");
    }

    if (speakingRef.current) {
      setNpcSpeaking(false);
      speakingRef.current = false;
    }
  }, [targetLanguage]);

  // Pause audio when screen goes off (phone locked/minimized)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && npcAudioRef.current) {
        npcAudioRef.current.pause();
        speakingRef.current = false;
        setNpcSpeaking(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speakingRef.current = false;
      stopAudio();
      window.speechSynthesis?.cancel();
      if (npcAudioRef.current) {
        npcAudioRef.current.pause();
        npcAudioRef.current = null;
      }
    };
  }, []);

  // Start conversation after user tap (required for speech on desktop Chrome)
  const handleStart = useCallback(async () => {
    if (!npc || started) return;
    setStarted(true);

    // Generate a contextual greeting via AI
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

    const parsed = parseAIResponse(greetingResponse || "Hello! Let's learn together today!");
    const greeting = parsed.message;

    // Add to AI history so it doesn't repeat itself
    aiHistoryRef.current.push({ role: "assistant", content: greeting });

    // Show text immediately, options after voice ends
    setMessages([{ role: "npc", text: greeting }]);
    await speakNPC(greeting);
    if (parsed.options.length > 0) {
      setOptions(parsed.options);
    } else {
      generateOptions(greeting);
    }
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

  const handlePlayerChoice = useCallback(async (choice: string, pronScore?: number) => {
    if (loading || !npc || npcSpeaking || speakingRef.current) return;

    playPopSound();
    setLoading(true);
    setOptions([]);

    // Add player message (with pronunciation score if from mic)
    setMessages((prev) => [...prev, { role: "player", text: choice, pronScore }]);
    aiHistoryRef.current.push({ role: "user", content: choice });

    // Get AI response
    const memories = getRecentFacts(npc.id);
    const topicWords = topic.words.map((w) => w[targetLanguage]);
    const systemPrompt = buildSystemPrompt(npc, targetLanguage, memories, topicWords);

    const exchangeNum = exchanges + 1;
    // End game if max exchanges reached OR player says goodbye
    const farewellPattern = /\b(bye|goodbye|see you|gotta go|go home|have to go|leaving|farewell|ciao|adios|чао|довиждане)\b/i;
    const isLast = exchangeNum >= MAX_EXCHANGES || (exchangeNum >= 3 && farewellPattern.test(choice));

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

    // Add NPC response — show text immediately, options after voice
    aiHistoryRef.current.push({ role: "assistant", content: parsed.message });
    setMessages((prev) => [...prev, { role: "npc", text: parsed.message }]);
    await speakNPC(parsed.message);
    setScore((s) => s + POINTS_PER_EXCHANGE);
    setExchanges(exchangeNum);

    if (isLast) {
      // Game complete
      playDingSound();
      const finalScore = exchangeNum * POINTS_PER_EXCHANGE + COMPLETION_BONUS;
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

  // Fuzzy-fix misheard words using topic vocabulary
  const topicWordsRef = useRef<string[]>([]);
  useEffect(() => {
    if (topic?.words) {
      topicWordsRef.current = topic.words.map((w) => w[targetLanguage].toLowerCase());
    }
  }, [topic?.words, targetLanguage]);

  const fuzzyFixTranscript = useCallback((text: string): string => {
    const words = text.split(/\s+/);
    const fixed = words.map((word) => {
      const lower = word.toLowerCase().replace(/[.,!?]/g, "");
      if (lower.length < 3) return word; // skip short words (a, I, to, etc.)

      // Check if this word is close to any topic word
      let bestMatch = "";
      let bestScore = 0;
      for (const topicWord of topicWordsRef.current) {
        // Only compare words of similar length
        if (Math.abs(lower.length - topicWord.length) > 2) continue;
        const score = similarityScore(lower, topicWord);
        if (score > bestScore && score >= 0.7) {
          bestScore = score;
          bestMatch = topicWord;
        }
      }

      if (bestMatch && bestScore < 1) {
        // Preserve original casing style
        return bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1);
      }
      return word;
    });
    return fixed.join(" ");
  }, []);

  // Track mic session
  const [micActive, setMicActive] = useState(false);
  const [displayTranscript, setDisplayTranscript] = useState(""); // What user sees
  const lastTranscriptRef = useRef("");
  const lastConfidenceRef = useRef(0);
  const accumulatedUserRef = useRef(""); // Accumulate across recognition restarts
  const pronScoresRef = useRef<number[]>([]); // All pronunciation scores for final recap

  // Track latest transcript (accumulated + current session)
  useEffect(() => {
    if (transcript) {
      const full = (accumulatedUserRef.current + " " + transcript).trim();
      lastTranscriptRef.current = full;
      setDisplayTranscript(full);
    }
  }, [transcript]);

  // Track confidence
  useEffect(() => {
    if (confidence > 0) lastConfidenceRef.current = confidence;
  }, [confidence]);

  // Auto-restart recognition when it stops but user hasn't pressed Done
  // Limit restarts to avoid iOS permission prompt loops
  const micRestartsRef = useRef(0);
  useEffect(() => {
    if (micActive && !isListening) {
      // Recognition ended naturally (Android pause) — save current and restart
      if (transcript) {
        accumulatedUserRef.current = (accumulatedUserRef.current + " " + transcript).trim();
      }
      // Max 5 auto-restarts per session (iOS may re-prompt permissions)
      if (micRestartsRef.current < 5) {
        const timer = setTimeout(() => {
          if (micActive) {
            micRestartsRef.current++;
            startMic();
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isListening, micActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMicStart = () => {
    if (speakingRef.current || npcSpeaking) {
      // Stop NPC audio first
      if (npcAudioRef.current) { npcAudioRef.current.pause(); }
      window.speechSynthesis?.cancel();
      speakingRef.current = false;
      setNpcSpeaking(false);
    }
    lastTranscriptRef.current = "";
    accumulatedUserRef.current = "";
    lastConfidenceRef.current = 0;
    micRestartsRef.current = 0;
    setDisplayTranscript("");
    setMicActive(true);
    startMic();
  };

  const handleMicDone = () => {
    setMicActive(false); // Stop auto-restart first
    stopMic();
    const text = lastTranscriptRef.current.trim();
    if (text.length >= 2 && !loading && !gameCompleted) {
      const corrected = fuzzyFixTranscript(text);
      const pronScore = Math.round(lastConfidenceRef.current * 100);
      if (pronScore > 0) pronScoresRef.current.push(pronScore);
      handlePlayerChoice(corrected, pronScore > 0 ? pronScore : undefined);
    }
    accumulatedUserRef.current = "";
    lastConfidenceRef.current = 0;
  };

  const handleMicCancel = () => {
    setMicActive(false); // Stop auto-restart first
    stopMic();
    lastTranscriptRef.current = "";
    accumulatedUserRef.current = "";
    setDisplayTranscript("");
  };

  // No NPC for this topic
  if (!npc) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-4 px-6">
        <ProfessorGlobe size={80} emotion="thinking" />
        <p className="text-white text-lg text-center">No character available for this topic yet!</p>
        <button onClick={() => router.back()} className="text-blue-400 text-sm mt-4">
          ← Back to Map
        </button>
      </div>
    );
  }

  // Completed screen
  if (gameCompleted) {
    const maxScore = MAX_EXCHANGES * POINTS_PER_EXCHANGE + COMPLETION_BONUS;
    const pct = Math.round((score / maxScore) * 100);
    const pronAvg = pronScoresRef.current.length > 0
      ? Math.round(pronScoresRef.current.reduce((a, b) => a + b, 0) / pronScoresRef.current.length)
      : null;
    const pronGrade = pronAvg !== null
      ? (pronAvg >= 90 ? "A+" : pronAvg >= 80 ? "A" : pronAvg >= 70 ? "B" : pronAvg >= 60 ? "C" : "D")
      : null;
    const pronColor = pronAvg !== null
      ? (pronAvg >= 80 ? "text-green-400" : pronAvg >= 60 ? "text-amber-400" : "text-red-400")
      : "";

    return (
      <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center gap-5 px-6">
        <StarDisplay score={score} maxScore={maxScore} size="lg" />
        <h2 className="text-3xl font-bold text-white">
          {pct >= 90 ? "Amazing Chat!" : pct >= 70 ? "Great Chat!" : "Good Try!"}
        </h2>
        <p className="text-slate-400 text-sm text-center">
          You completed {exchanges} exchanges with {npc.name}!
        </p>
        <GameRewardSummary score={score} maxScore={maxScore} />

        {/* Stats card */}
        <div className="bg-white/5 rounded-2xl p-5 w-full max-w-xs space-y-2.5">
          <div className="flex justify-between text-slate-300 text-sm">
            <span>Conversation</span>
            <span className="text-white font-semibold">{exchanges}/{MAX_EXCHANGES} exchanges</span>
          </div>
          <div className="flex justify-between text-slate-300 text-sm">
            <span>Completion</span>
            <span className="text-green-400 font-semibold">{pct}%</span>
          </div>
          {pronAvg !== null && (
            <div className="border-t border-white/10 pt-2.5 mt-1">
              <div className="flex justify-between text-slate-300 text-sm">
                <span>Speaking Grade</span>
                <span className={`font-bold text-base ${pronColor}`}>{pronGrade}</span>
              </div>
              <div className="mt-1.5 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    pronAvg >= 80 ? "bg-green-500" : pronAvg >= 60 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${pronAvg}%` }}
                />
              </div>
              <p className="text-slate-500 text-[10px] mt-1 text-right">
                {pronScoresRef.current.length} spoken {pronScoresRef.current.length === 1 ? "response" : "responses"}
              </p>
            </div>
          )}
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
              pronScoresRef.current = [];
              generateOptions(npc.greeting[targetLanguage]);
            }}
            className="flex-1 bg-white/10 text-white py-3 rounded-xl font-medium active:bg-white/20 transition-colors"
          >
            Chat Again
          </button>
          <button
            onClick={() => router.back()}
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
      <div className="h-screen-safe w-screen bg-[#0a1628] flex flex-col overflow-hidden">
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
    <div className="h-screen-safe w-screen bg-[#0a1628] flex flex-col overflow-hidden">
      {/* Top: 3D Avatar area */}
      <div className="relative" style={{ height: "55vh", minHeight: 320 }}>
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 safe-area">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => {
                // Stop any playing audio before navigating back
                if (npcAudioRef.current) { npcAudioRef.current.pause(); npcAudioRef.current = null; }
                window.speechSynthesis?.cancel();
                speakingRef.current = false;
                stopMic();
                router.back();
              }}
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
              {/* Pronunciation score on player mic messages */}
              {msg.role === "player" && msg.pronScore != null && (
                <p className={`text-[10px] mt-0.5 font-medium text-right ${
                  msg.pronScore >= 80 ? "text-green-300/70" : msg.pronScore >= 50 ? "text-amber-300/70" : "text-red-300/70"
                }`}>
                  🎤 {msg.pronScore}%
                </p>
              )}
              {/* Audio loading indicator on last NPC message */}
              {msg.role === "npc" && i === messages.length - 1 && audioLoading && (
                <span className="inline-block ml-1 text-blue-400 text-xs animate-pulse">🔊</span>
              )}
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

      {/* Mic active — show live transcript + Done button */}
      {micActive && (
        <div className="px-4 pb-10 space-y-3 relative z-10">
          {displayTranscript ? (
            <div className="bg-white/5 border border-blue-500/30 rounded-xl px-4 py-3">
              <p className="text-white text-sm">{displayTranscript}</p>
            </div>
          ) : (
            <p className="text-blue-400 text-sm text-center animate-pulse">Listening... speak now!</p>
          )}
          <button
            onClick={handleMicDone}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3.5 rounded-xl font-bold text-base active:scale-95 transition-transform shadow-lg shadow-green-500/30"
          >
            Done ✓
          </button>
          <button
            onClick={handleMicCancel}
            className="text-slate-500 text-xs text-center w-full"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Options + Mic (when not in mic mode) */}
      {!micActive && options.length > 0 && !loading && !npcSpeaking && (
        <div className="px-4 pb-10 space-y-2 relative z-10">
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
                onClick={handleMicStart}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
              >
                <span className="text-xl">🎤</span>
              </button>
              <p className="text-slate-500 text-[10px]">or say your own!</p>
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
