"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { ProfessorGlobe } from "@/components/character/ProfessorGlobe";
import { playPopSound, playDingSound } from "@/lib/speech";
import { askAI } from "@/lib/ai";
import { topics } from "@/data/words";
import type { TopicId } from "@/types";

interface Mission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  topicId: TopicId;
  gameType: string;
  reward: number;
}

// Fallback missions when AI is unavailable
const FALLBACK_MISSIONS: Mission[] = [
  {
    id: "m-fb-1",
    title: "Word Explorer",
    description: "Play Memory Match on any island to find matching pairs!",
    emoji: "🃏",
    topicId: "animals",
    gameType: "memory-match",
    reward: 30,
  },
  {
    id: "m-fb-2",
    title: "Quiz Master",
    description: "Complete a Word Quiz and get at least 3 correct!",
    emoji: "🎯",
    topicId: "colors",
    gameType: "word-quiz",
    reward: 40,
  },
  {
    id: "m-fb-3",
    title: "Scene Builder",
    description: "Fill in all the blanks in a scene!",
    emoji: "🎬",
    topicId: "food",
    gameType: "fill-scene",
    reward: 50,
  },
];

const GAME_TYPES = ["memory-match", "word-quiz", "true-false", "word-scramble", "fill-scene", "say-it", "npc-talk"];
const GAME_EMOJIS: Record<string, string> = {
  "memory-match": "🃏",
  "word-quiz": "🎯",
  "true-false": "✅",
  "word-scramble": "🔤",
  "fill-scene": "🎬",
  "say-it": "🎤",
  "npc-talk": "💬",
};

interface MissionBoardProps {
  onClose: () => void;
}

export function MissionBoard({ onClose }: MissionBoardProps) {
  const router = useRouter();
  const { unlockedTopics, addPoints } = useProgressStore();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateMissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateMissions = async () => {
    setLoading(true);

    // Try AI-generated missions
    const unlockedNames = unlockedTopics
      .map((id) => topics.find((t) => t.id === id)?.name.en)
      .filter(Boolean)
      .join(", ");

    const response = await askAI(
      [
        {
          role: "user",
          content: `Generate 3 fun missions for a kids language learning game. Available topics: ${unlockedNames}. Available game types: ${GAME_TYPES.join(", ")}.

Each mission should be exciting and use a different game type. Format as JSON array:
[{"title":"short title","description":"1 sentence quest description for 6-10 year old","topicId":"topic_id","gameType":"game_type","reward":30-60}]

Only use these topic IDs: ${unlockedTopics.join(", ")}
Only valid JSON, no markdown.`,
        },
      ],
      "You generate fun, exciting game missions for kids aged 6-10. Keep descriptions short (under 15 words), adventurous, and encouraging. Always return valid JSON.",
      200
    );

    try {
      if (response) {
        // Strip markdown if present
        const cleaned = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned) as Array<{
          title: string;
          description: string;
          topicId: string;
          gameType: string;
          reward: number;
        }>;

        const aiMissions: Mission[] = parsed.map((m, i) => ({
          id: `m-ai-${Date.now()}-${i}`,
          title: m.title,
          description: m.description,
          emoji: GAME_EMOJIS[m.gameType] || "🎯",
          topicId: (unlockedTopics.includes(m.topicId as TopicId) ? m.topicId : unlockedTopics[0]) as TopicId,
          gameType: GAME_TYPES.includes(m.gameType) ? m.gameType : "word-quiz",
          reward: Math.min(60, Math.max(20, m.reward)),
        }));

        setMissions(aiMissions);
        setLoading(false);
        return;
      }
    } catch {
      // Fall through to fallback
    }

    // Fallback: use static missions but only for unlocked topics
    const available = FALLBACK_MISSIONS.filter((m) => unlockedTopics.includes(m.topicId));
    setMissions(available.length > 0 ? available : FALLBACK_MISSIONS.slice(0, 2));
    setLoading(false);
  };

  const handleMissionStart = (mission: Mission) => {
    playPopSound();
    // Give mission reward as bonus points
    addPoints(mission.reward);
    router.push(`/game/${mission.topicId}/${mission.gameType}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md px-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#1a2744]/95 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ProfessorGlobe size={48} emotion="happy" />
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="text-xl font-bold text-white">Missions</h2>
          <p className="text-slate-400 text-sm">Complete quests for bonus rewards!</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <ProfessorGlobe size={56} speaking emotion="thinking" />
            <p className="text-slate-400 text-sm animate-pulse">Generating missions...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {missions.map((mission, i) => (
              <button
                key={mission.id}
                onClick={() => handleMissionStart(mission)}
                className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-xl p-4 transition-all text-left border border-white/5"
                style={{ animation: `slide-up 0.3s ease-out ${i * 100}ms both` }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0">{mission.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{mission.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{mission.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-amber-400 text-xs font-semibold">+{mission.reward} ⭐</span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-slate-500 text-xs">
                        {topics.find((t) => t.id === mission.topicId)?.emoji}{" "}
                        {topics.find((t) => t.id === mission.topicId)?.name.en}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-500 text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              playPopSound();
              generateMissions();
            }}
            disabled={loading}
            className="flex-1 bg-white/5 text-slate-300 py-2.5 rounded-xl text-sm font-medium active:bg-white/10 transition-colors disabled:opacity-40"
          >
            🔄 New Missions
          </button>
          <button
            onClick={onClose}
            className="flex-1 text-slate-400 text-sm py-2.5 active:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
