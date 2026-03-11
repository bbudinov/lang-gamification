"use client";

import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";
import { ROOMS } from "@/data/rooms";

export default function RoomsPage() {
  const router = useRouter();
  const { totalPoints, targetLanguage } = useProgressStore();
  const profile = useAuthStore((s) => s.profile);
  const lang = targetLanguage as "en" | "bg" | "es";
  const avatar = profile?.avatar_emoji || "🧑";

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">&larr; Map</span>
          </button>
          <h1 className="text-white font-bold text-lg">Rooms</h1>
          <div className="text-2xl">{avatar}</div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="text-slate-400 text-sm text-center mb-6">
          {lang === "bg"
            ? "Влез в стая и говори с хората вътре!"
            : lang === "es"
            ? "¡Entra en una habitación y habla con la gente!"
            : "Enter a room and talk to people inside!"}
        </p>
      </div>

      <div className="px-4 pb-8 space-y-3">
        {ROOMS.map((room) => {
          const unlocked = totalPoints >= room.requiredXP;

          return (
            <button
              key={room.id}
              onClick={() => unlocked && router.push(`/room/${room.id}`)}
              disabled={!unlocked}
              className={`w-full rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] ${
                unlocked
                  ? `bg-gradient-to-r ${room.bgGradient} border border-white/10`
                  : "bg-white/[0.03] border border-white/5 opacity-50"
              }`}
            >
              <div className="text-4xl w-14 h-14 flex items-center justify-center bg-white/10 rounded-xl">
                {room.emoji}
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-bold text-base">
                  {room.name[lang]}
                </p>
                <p className="text-slate-400 text-sm">
                  {room.description[lang]}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">
                    {room.npc.emoji} {room.npc.name} — {room.npc.role[lang]}
                  </span>
                </div>
              </div>
              <div className="text-right">
                {unlocked ? (
                  <span className="text-green-400 text-xl">→</span>
                ) : (
                  <div className="text-center">
                    <span className="text-amber-400 text-xs">🔒</span>
                    <p className="text-amber-400/70 text-[10px]">
                      {room.requiredXP} XP
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
