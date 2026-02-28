"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/map"), 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a1628]">
      <div className="text-6xl mb-4 animate-bounce">🌍</div>
      <h1 className="text-3xl font-bold text-white mb-2">LangWorld</h1>
      <p className="text-slate-400 text-sm">Learn languages through play</p>
    </div>
  );
}
