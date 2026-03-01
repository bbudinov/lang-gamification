"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useNPCMemoryStore } from "@/stores/npcMemoryStore";
import { askAI } from "@/lib/ai";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";
import { playPopSound, playDingSound, speak, speakAndWait, stopAudio } from "@/lib/speech";
import type { Topic, Language } from "@/types";
import { getNPC, type NPCData } from "@/data/npcs";

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
  const memorySection = memories.length > 0
    ? `\n\nYou remember these facts about the child from previous conversations:\n${memories.map((m) => `- ${m}`).join("\n")}\nRefer to these naturally when relevant (e.g., "Last time you said you like dogs!").`
    : "";

  return `You are ${npc.name}, a ${npc.role[lang]}. ${npc.personality}

Your goal in this conversation: ${npc.goal[lang]}

RULES:
- You are talking to a child aged 6-10 who is learning ${lang === "en" ? "English" : lang === "bg" ? "Bulgarian" : "Spanish"}.
- Use ONLY these vocabulary words when possible: ${topicWords.join(", ")}. You may use 20% words outside this list for natural flow.
- Keep responses SHORT: maximum 20 words.
- Be encouraging, fun, and patient. NEVER scold or make the child feel bad.
- If the child makes a language mistake, gently correct it by using the right word naturally in your response (Invisible Teacher technique). For example, if they say "I want el gato", respond "Oh, you want THE CAT? Great choice!"
- Ask follow-up questions to keep the conversation going.
- Use your character's personality and emoji occasionally.
- After 3-4 exchanges, naturally try to wrap up toward your goal.
- At the end of your response, add a line starting with "OPTIONS:" followed by exactly 3 short reply options the child can choose from, separated by " | ". Each option should be 2-6 words. Example:
OPTIONS: I like cats | Tell me more | What about dogs?${memorySection}

ALSO: After processing the child's message, if they shared personal information (like favorite animal, name, hobby, etc.), add a line starting with "MEMORY:" followed by a single short fact to remember. Example:
MEMORY: The child's favorite animal is a dog.
Only add MEMORY if there's something genuinely worth remembering. Don't add it every time.`;
}

function parseAIResponse(text: string): { message: string; options: string[]; memory: string | null } {
  let message = text;
  let options: string[] = [];
  let memory: string | null = null;

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

  // Fallback options
  if (options.length === 0) {
    options = ["Yes!", "Tell me more", "I don't know"];
  }

  return { message, options, memory };
}

export function DialogueBox({ topic }: DialogueBoxProps) {
  const router = useRouter();
  const { targetLanguage, addPoints, addGameResult } = useProgressStore();
  const { getRecentFacts, addFact } = useNPCMemoryStore();

  const npc = getNPC(topic.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [npcSpeaking, setNpcSpeaking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const aiHistoryRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const speakingRef = useRef(false);

  // Speak NPC message with mouth-sync state
  const speakNPC = useCallback(async (text: string) => {
    speakingRef.current = true;
    setNpcSpeaking(true);
    await speakAndWait(text, targetLanguage);
    if (speakingRef.current) {
      setNpcSpeaking(false);
      speakingRef.current = false;
    }
  }, [targetLanguage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speakingRef.current = false;
      stopAudio();
    };
  }, []);

  // Initialize with NPC greeting + voice
  useEffect(() => {
    if (!npc) return;
    const greeting = npc.greeting[targetLanguage];
    setMessages([{ role: "npc", text: greeting }]);

    // Speak greeting then generate options
    speakNPC(greeting);
    generateOptions(greeting);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (loading || !npc) return;

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
        gameType: "listen-choose",
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
  }, [loading, npc, exchanges, score, targetLanguage, topic, addFact, addGameResult, addPoints, getRecentFacts, speakNPC]);

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
        <div className="text-8xl" style={{ filter: "drop-shadow(0 0 20px rgba(59, 130, 246, 0.4))" }}>
          {npc.emoji}
        </div>
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

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Header */}
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">← Back</span>
          </button>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span>{npc.emoji}</span>
            <span className="text-white text-sm font-medium">{npc.name}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-amber-400 text-xs">⭐</span>
            <span className="text-white text-sm font-semibold">{score}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 mb-2">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${(exchanges / MAX_EXCHANGES) * 100}%` }}
          />
        </div>
      </div>

      {/* Large NPC Character */}
      <div className="flex flex-col items-center py-3 px-4">
        <div className="relative">
          <div
            className={`text-7xl transition-all duration-300 ${npcSpeaking ? "scale-110" : "scale-100"}`}
            style={{
              filter: npcSpeaking
                ? "drop-shadow(0 0 24px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 48px rgba(59, 130, 246, 0.3))"
                : "drop-shadow(0 0 8px rgba(59, 130, 246, 0.2))",
              animation: npcSpeaking ? "npc-speak 0.6s ease-in-out infinite" : "npc-idle 3s ease-in-out infinite",
            }}
          >
            {npc.emoji}
          </div>
          {/* Sound wave indicator when speaking */}
          {npcSpeaking && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 items-end">
              <div className="w-1 bg-blue-400 rounded-full animate-sound-1" />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-2" />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-3" />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-2" />
              <div className="w-1 bg-blue-400 rounded-full animate-sound-1" />
            </div>
          )}
        </div>
        <p className="text-white font-semibold text-sm mt-2">{npc.name}</p>
        <p className="text-slate-500 text-[10px]">{npc.role[targetLanguage]}</p>
      </div>

      {/* Chat messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 space-y-2.5 pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "player" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "npc" && (
              <span className="text-lg mr-1.5 shrink-0 self-end">{npc.emoji}</span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === "player"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-white/10 text-white rounded-bl-md"
              }`}
              style={{
                animation: `msg-in 0.3s ease-out both`,
              }}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <span className="text-lg mr-1.5 shrink-0 self-end">{npc.emoji}</span>
            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      {options.length > 0 && !loading && (
        <div className="px-4 pb-6 space-y-2">
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
          0%, 100% { transform: scale(1.1); }
          50% { transform: scale(1.15); }
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
