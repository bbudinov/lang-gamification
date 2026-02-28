"use client";

import dynamic from "next/dynamic";
import { TopBar } from "@/components/ui/TopBar";

const IslandMap = dynamic(
  () =>
    import("@/components/scene/IslandMap").then((mod) => ({
      default: mod.IslandMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#0a1628]">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🌍</div>
          <p className="text-slate-400 text-sm">Loading world...</p>
        </div>
      </div>
    ),
  }
);

export default function MapPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a1628] relative">
      <TopBar />
      <IslandMap />
    </div>
  );
}
