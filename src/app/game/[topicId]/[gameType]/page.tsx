import { GamePageClient } from "./GamePageClient";
import { topics } from "@/data/words";

const GAME_TYPES = [
  "memory-match", "word-quiz", "true-false", "word-scramble",
  "fill-scene", "say-it", "listen-repeat", "npc-talk",
];

export function generateStaticParams() {
  return topics.flatMap((t) =>
    GAME_TYPES.map((g) => ({ topicId: t.id, gameType: g }))
  );
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ topicId: string; gameType: string }>;
}) {
  const { topicId, gameType } = await params;
  return <GamePageClient topicId={topicId} gameType={gameType} />;
}
