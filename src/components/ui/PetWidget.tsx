"use client";

import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";

const PET_STAGES = ["🥚", "🐣", "🐲", "🐉"] as const;
const NEXT_STAGE_AT = [1, 10, 30] as const; // games needed for stage 1, 2, 3

export function PetWidget() {
  const router = useRouter();
  const pet = useProgressStore((s) => s.pet);

  if (!pet) return null;

  const nextThreshold = pet.stage < 3 ? NEXT_STAGE_AT[pet.stage as 0 | 1 | 2] : null;
  const progress = nextThreshold ? pet.gamesPlayed / nextThreshold : 1;

  return (
    <div className="absolute bottom-5 left-3" style={{ zIndex: 9999 }}>
      <button
        onClick={() => router.push("/shop")}
        className="relative w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center active:scale-90 transition-transform"
        style={{ animation: "pet-idle 2s ease-in-out infinite" }}
      >
        <span className="text-3xl">{PET_STAGES[pet.stage]}</span>
        {/* Progress ring for next evolution */}
        {nextThreshold && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="29" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="3" />
            <circle
              cx="32" cy="32" r="29" fill="none" stroke="#22c55e" strokeWidth="3"
              strokeDasharray={`${progress * 182} 182`}
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      <style jsx>{`
        @keyframes pet-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
