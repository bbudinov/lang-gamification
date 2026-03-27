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
  {
    id: "social",
    name: { en: "Social", bg: "Социален", es: "Social", it: "Sociale", de: "Sozial", fr: "Social" },
    emoji: "🏪",
    description: { en: "Navigate real-life situations!", bg: "Справи се в реални ситуации!", es: "¡Maneja situaciones reales!", it: "Affronta situazioni reali!", de: "Meistere Alltagssituationen!", fr: "Gère des situations réelles !" },
    requiredXP: 5500,
    themeColor: "#f97316",
    bgColor: "#1a1a2e",
    topicIds: ["social-cafe", "social-office", "social-party", "social-hotel", "social-airport-desk", "social-restaurant", "social-shopping", "social-hospital", "social-church"],
  },
  {
    id: "emotions",
    name: { en: "Emotions", bg: "Емоции", es: "Emociones", it: "Emozioni", de: "Emotionen", fr: "Émotions" },
    emoji: "🧠",
    description: { en: "Express your feelings!", bg: "Изрази чувствата си!", es: "¡Expresa tus sentimientos!", it: "Esprimi i tuoi sentimenti!", de: "Drücke deine Gefühle aus!", fr: "Exprime tes sentiments !" },
    requiredXP: 6500,
    themeColor: "#14b8a6",
    bgColor: "#0a2e2e",
    topicIds: ["emotions-joy", "emotions-fear", "emotions-anger", "emotions-calm", "emotions-surprise", "emotions-love", "emotions-dream", "emotions-courage"],
  },
  {
    id: "culture",
    name: { en: "Culture", bg: "Култура", es: "Cultura", it: "Cultura", de: "Kultur", fr: "Culture" },
    emoji: "🌍",
    description: { en: "Discover world cultures!", bg: "Открий световните култури!", es: "¡Descubre culturas del mundo!", it: "Scopri le culture del mondo!", de: "Entdecke Weltkulturen!", fr: "Découvre les cultures du monde !" },
    requiredXP: 7500,
    themeColor: "#ec4899",
    bgColor: "#2e1a1a",
    topicIds: ["culture-italian", "culture-japanese", "culture-french", "culture-mexican", "culture-indian", "culture-african", "culture-british", "culture-brazilian", "culture-bulgarian", "culture-american", "culture-german", "culture-chinese", "culture-egyptian", "culture-spanish", "culture-australian", "culture-canadian", "culture-argentinian", "culture-moroccan", "culture-kenyan", "culture-south-african", "culture-korean", "culture-thai", "culture-norwegian", "culture-swedish", "culture-greenlandic", "culture-icelandic", "culture-madagascan", "culture-indonesian", "culture-newzealand", "culture-finnish"],
  },
  {
    id: "fantasy",
    name: { en: "Fantasy", bg: "Фантазия", es: "Fantasía", it: "Fantasia", de: "Fantasie", fr: "Fantaisie" },
    emoji: "🧙",
    description: { en: "Enter a magical realm!", bg: "Влез в магическо царство!", es: "¡Entra en un reino mágico!", it: "Entra in un regno magico!", de: "Betritt ein magisches Reich!", fr: "Entre dans un royaume magique !" },
    requiredXP: 8000,
    themeColor: "#a855f7",
    bgColor: "#1a0a2e",
    topicIds: ["fantasy-forest", "fantasy-dragon", "fantasy-wizard", "fantasy-castle", "fantasy-village", "fantasy-quest", "fantasy-potion", "fantasy-dungeon"],
  },
  {
    id: "science",
    name: { en: "Science", bg: "Наука", es: "Ciencia", it: "Scienza", de: "Wissenschaft", fr: "Science" },
    emoji: "🧪",
    description: { en: "Experiment and discover!", bg: "Експериментирай и откривай!", es: "¡Experimenta y descubre!", it: "Sperimenta e scopri!", de: "Experimentiere und entdecke!", fr: "Expérimente et découvre !" },
    requiredXP: 8500,
    themeColor: "#06b6d4",
    bgColor: "#0a1a2e",
    topicIds: ["science-lab", "science-robot", "science-space-station", "science-energy", "science-nature", "science-medicine", "science-computer", "science-invention"],
  },
  {
    id: "space",
    name: { en: "Cosmos", bg: "Космос", es: "Cosmos", it: "Cosmo", de: "Kosmos", fr: "Cosmos" },
    emoji: "🚀",
    description: { en: "Explore the universe!", bg: "Изследвай вселената!", es: "¡Explora el universo!", it: "Esplora l'universo!", de: "Erkunde das Universum!", fr: "Explore l'univers !" },
    requiredXP: 9000,
    themeColor: "#6366f1",
    bgColor: "#0a0a2e",
    topicIds: ["space-planets", "space-rockets", "space-astronaut", "space-aliens", "space-station", "space-moon", "space-stars", "space-galaxy"],
  },
  {
    id: "time",
    name: { en: "Time", bg: "Време", es: "Tiempo", it: "Tempo", de: "Zeit", fr: "Temps" },
    emoji: "⏳",
    description: { en: "Travel through time!", bg: "Пътувай през времето!", es: "¡Viaja a través del tiempo!", it: "Viaggia nel tempo!", de: "Reise durch die Zeit!", fr: "Voyage dans le temps !" },
    requiredXP: 9500,
    themeColor: "#eab308",
    bgColor: "#1a1608",
    topicIds: ["time-ancient", "time-medieval", "time-present", "time-future", "time-dinosaur", "time-industrial", "time-station", "time-museum"],
  },
  {
    id: "meta",
    name: { en: "Meta", bg: "Мета", es: "Meta", it: "Meta", de: "Meta", fr: "Méta" },
    emoji: "🎭",
    description: { en: "Break the fourth wall!", bg: "Разбий четвъртата стена!", es: "¡Rompe la cuarta pared!", it: "Rompi la quarta parete!", de: "Durchbrich die vierte Wand!", fr: "Brise le quatrième mur !" },
    requiredXP: 10000,
    themeColor: "#f43f5e",
    bgColor: "#2e0a1a",
    topicIds: ["meta-ui", "meta-game", "meta-code", "meta-internet", "meta-social-media", "meta-ai", "meta-music-studio", "meta-movie"],
  },
];

export function getWorldForTopic(topicId: TopicId): WorldId {
  const world = WORLDS.find((w) => w.topicIds.includes(topicId));
  return world?.id ?? "land";
}
