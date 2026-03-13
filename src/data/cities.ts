import type { Language, TopicId } from "@/types";

export interface City {
  id: string;
  name: Record<Language, string>;
  emoji: string;
  building: Record<Language, string>;
  /** The topic this city teaches */
  topicId: TopicId;
  /** XP needed to unlock */
  requiredXP: number;
  /** Position on map (percentage-based: x%, y%) */
  pos: { x: number; y: number };
  /** Visual style */
  terrain: "grass" | "sand" | "coast" | "mountain" | "urban";
  /** Connected to (city ids) for road drawing */
  connectsTo: string[];
  /** Room id for Level 3 conversation (if available) */
  roomId?: string;
}

export const CITIES: City[] = [
  {
    id: "greenville",
    name: { en: "Greenville", bg: "Грийнвил", es: "Verdeville" },
    emoji: "🏫",
    building: { en: "School", bg: "Училище", es: "Escuela" },
    topicId: "school",
    requiredXP: 1500,
    pos: { x: 25, y: 75 },
    terrain: "grass",
    connectsTo: ["farmstead"],
  },
  {
    id: "farmstead",
    name: { en: "Farmstead", bg: "Фермата", es: "La Granja" },
    emoji: "🍽️",
    building: { en: "Restaurant", bg: "Ресторант", es: "Restaurante" },
    topicId: "food",
    requiredXP: 0,
    pos: { x: 65, y: 68 },
    terrain: "grass",
    connectsTo: ["colortown"],
    roomId: "market",
  },
  {
    id: "colortown",
    name: { en: "Colortown", bg: "Цветоград", es: "Colorín" },
    emoji: "🎨",
    building: { en: "Art Studio", bg: "Арт Студио", es: "Estudio de Arte" },
    topicId: "colors",
    requiredXP: 500,
    pos: { x: 30, y: 55 },
    terrain: "grass",
    connectsTo: ["numberville"],
  },
  {
    id: "numberville",
    name: { en: "Numberville", bg: "Числоград", es: "Numerópolis" },
    emoji: "🔢",
    building: { en: "Bank", bg: "Банка", es: "Banco" },
    topicId: "numbers",
    requiredXP: 800,
    pos: { x: 70, y: 48 },
    terrain: "grass",
    connectsTo: ["homestead"],
  },
  {
    id: "homestead",
    name: { en: "Homestead", bg: "Домашен кът", es: "El Hogar" },
    emoji: "🏠",
    building: { en: "Houses", bg: "Къщи", es: "Casas" },
    topicId: "family",
    requiredXP: 1200,
    pos: { x: 40, y: 38 },
    terrain: "grass",
    connectsTo: ["seaside"],
  },
  {
    id: "seaside",
    name: { en: "Seaside", bg: "Крайбрежие", es: "Costa" },
    emoji: "🦁",
    building: { en: "Zoo", bg: "Зоопарк", es: "Zoológico" },
    topicId: "animals",
    requiredXP: 0,
    pos: { x: 75, y: 28 },
    terrain: "coast",
    connectsTo: ["healthville"],
    roomId: "zoo",
  },
  {
    id: "healthville",
    name: { en: "Healthville", bg: "Здравеград", es: "Saludville" },
    emoji: "🏥",
    building: { en: "Hospital", bg: "Болница", es: "Hospital" },
    topicId: "body",
    requiredXP: 2000,
    pos: { x: 25, y: 18 },
    terrain: "urban",
    connectsTo: ["stormridge"],
  },
  {
    id: "stormridge",
    name: { en: "Stormridge", bg: "Бурен хребет", es: "Tormenta" },
    emoji: "⛈️",
    building: { en: "Weather Station", bg: "Метеостанция", es: "Estación Meteorológica" },
    topicId: "weather",
    requiredXP: 2500,
    pos: { x: 60, y: 10 },
    terrain: "mountain",
    connectsTo: [],
  },
];

export function getCityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}
