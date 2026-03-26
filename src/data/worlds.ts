import type { Language, WorldId, TopicId } from "@/types";

export interface World {
  id: WorldId;
  name: Record<Language, string>;
  emoji: string;
  description: Record<Language, string>;
  requiredXP: number;
  themeColor: string;
  bgColor: string;
  topicIds: TopicId[];
}

export const WORLDS: World[] = [
  {
    id: "land",
    name: { en: "Land", bg: "Земя", es: "Tierra", it: "Terra", de: "Land", fr: "Terre" },
    emoji: "🏙️",
    description: { en: "Explore the city!", bg: "Разгледай града!", es: "¡Explora la ciudad!", it: "Esplora la città!", de: "Erkunde die Stadt!", fr: "Explore la ville !" },
    requiredXP: 0,
    themeColor: "#22c55e",
    bgColor: "#7a9ab0",
    topicIds: ["animals", "colors", "food", "numbers", "travel", "work", "family", "body", "weather", "school", "library", "sports", "music", "botanical-garden", "central-park", "university", "art-museum", "history-museum", "legendary-places"],
  },
  {
    id: "ocean",
    name: { en: "Ocean", bg: "Океан", es: "Océano", it: "Oceano", de: "Ozean", fr: "Océan" },
    emoji: "🌊",
    description: { en: "Sail the seas!", bg: "Плавай по моретата!", es: "¡Navega por los mares!", it: "Naviga i mari!", de: "Segel die Meere!", fr: "Navigue sur les mers !" },
    requiredXP: 5000,
    themeColor: "#0ea5e9",
    bgColor: "#0c4a6e",
    topicIds: ["ocean-sailing", "ocean-fishing", "ocean-lighthouse", "ocean-sailing-school", "ocean-cruise", "ocean-storm", "ocean-pirates", "ocean-shipping"],
  },
  {
    id: "underwater",
    name: { en: "Underwater", bg: "Подводен", es: "Submarino", it: "Sottomarino", de: "Unterwasser", fr: "Sous-marin" },
    emoji: "🐙",
    description: { en: "Dive deep!", bg: "Потопи се!", es: "¡Sumérgete!", it: "Immergiti!", de: "Tauche ab!", fr: "Plonge !" },
    requiredXP: 7000,
    themeColor: "#06b6d4",
    bgColor: "#0a2a4a",
    topicIds: ["underwater-reef", "underwater-creatures", "underwater-exploration", "underwater-kelp", "underwater-submarine", "underwater-abyss", "underwater-bubbles", "underwater-treasure", "underwater-volcano"],
  },
  {
    id: "air",
    name: { en: "Air", bg: "Въздух", es: "Aire", it: "Aria", de: "Luft", fr: "Air" },
    emoji: "✈️",
    description: { en: "Touch the sky!", bg: "Докосни небето!", es: "¡Toca el cielo!", it: "Tocca il cielo!", de: "Berühre den Himmel!", fr: "Touche le ciel !" },
    requiredXP: 6000,
    themeColor: "#818cf8",
    bgColor: "#1e1b4b",
    topicIds: ["air-flying", "air-birds", "air-weather-sky", "air-airport", "air-storm-clouds", "air-mountain", "air-balloon", "air-wind"],
  },
];

export function getWorldForTopic(topicId: TopicId): WorldId {
  const world = WORLDS.find((w) => w.topicIds.includes(topicId));
  return world?.id ?? "land";
}
