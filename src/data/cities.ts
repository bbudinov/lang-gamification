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
    name: { en: "Greenville", bg: "Грийнвил", es: "Verdeville", it: "Verdevilla", de: "Grünstadt", fr: "Vertville" },
    emoji: "🏫",
    building: { en: "School", bg: "Училище", es: "Escuela", it: "Scuola", de: "Schule", fr: "École" },
    topicId: "school",
    requiredXP: 1500,
    pos: { x: 25, y: 75 },
    terrain: "grass",
    connectsTo: ["farmstead"],
  },
  {
    id: "farmstead",
    name: { en: "Farmstead", bg: "Фермата", es: "La Granja", it: "La Fattoria", de: "Der Bauernhof", fr: "La Ferme" },
    emoji: "🍽️",
    building: { en: "Restaurant", bg: "Ресторант", es: "Restaurante", it: "Ristorante", de: "Restaurant", fr: "Restaurant" },
    topicId: "food",
    requiredXP: 0,
    pos: { x: 65, y: 68 },
    terrain: "grass",
    connectsTo: ["colortown"],
    roomId: "market",
  },
  {
    id: "colortown",
    name: { en: "Colortown", bg: "Цветоград", es: "Colorín", it: "Colorinia", de: "Farbstadt", fr: "Couleurville" },
    emoji: "🎨",
    building: { en: "Art Studio", bg: "Арт Студио", es: "Estudio de Arte", it: "Studio d'Arte", de: "Kunstatelier", fr: "Atelier d'Art" },
    topicId: "colors",
    requiredXP: 500,
    pos: { x: 30, y: 55 },
    terrain: "grass",
    connectsTo: ["numberville"],
  },
  {
    id: "numberville",
    name: { en: "Numberville", bg: "Числоград", es: "Numerópolis", it: "Numeropoli", de: "Zahlenstadt", fr: "Chiffreville" },
    emoji: "🔢",
    building: { en: "Bank", bg: "Банка", es: "Banco", it: "Banca", de: "Bank", fr: "Banque" },
    topicId: "numbers",
    requiredXP: 800,
    pos: { x: 70, y: 48 },
    terrain: "grass",
    connectsTo: ["homestead"],
  },
  {
    id: "homestead",
    name: { en: "Homestead", bg: "Домашен кът", es: "El Hogar", it: "Casa Dolce", de: "Heimstätte", fr: "Le Foyer" },
    emoji: "🏠",
    building: { en: "Houses", bg: "Къщи", es: "Casas", it: "Case", de: "Häuser", fr: "Maisons" },
    topicId: "family",
    requiredXP: 1200,
    pos: { x: 40, y: 38 },
    terrain: "grass",
    connectsTo: ["seaside"],
  },
  {
    id: "seaside",
    name: { en: "Seaside", bg: "Крайбрежие", es: "Costa", it: "Riviera", de: "Küstenort", fr: "Bord de Mer" },
    emoji: "🦁",
    building: { en: "Zoo", bg: "Зоопарк", es: "Zoológico", it: "Zoo", de: "Zoo", fr: "Zoo" },
    topicId: "animals",
    requiredXP: 0,
    pos: { x: 75, y: 28 },
    terrain: "coast",
    connectsTo: ["healthville"],
    roomId: "zoo",
  },
  {
    id: "healthville",
    name: { en: "Healthville", bg: "Здравеград", es: "Saludville", it: "Salutopoli", de: "Gesundstadt", fr: "Santéville" },
    emoji: "🏥",
    building: { en: "Hospital", bg: "Болница", es: "Hospital", it: "Ospedale", de: "Krankenhaus", fr: "Hôpital" },
    topicId: "body",
    requiredXP: 2000,
    pos: { x: 25, y: 18 },
    terrain: "urban",
    connectsTo: ["stormridge"],
  },
  {
    id: "stormridge",
    name: { en: "Stormridge", bg: "Бурен хребет", es: "Tormenta", it: "Tempestosa", de: "Sturmgrat", fr: "Crête d'Orage" },
    emoji: "⛈️",
    building: { en: "Weather Station", bg: "Метеостанция", es: "Estación Meteorológica", it: "Stazione Meteo", de: "Wetterstation", fr: "Station Météo" },
    topicId: "weather",
    requiredXP: 2500,
    pos: { x: 60, y: 10 },
    terrain: "mountain",
    connectsTo: ["portside"],
  },
  {
    id: "bookshire",
    name: { en: "Bookshire", bg: "Книжовград", es: "Librópolis", it: "Libropoli", de: "Buchheim", fr: "Livreville" },
    emoji: "📚",
    building: { en: "Library", bg: "Библиотека", es: "Biblioteca", it: "Biblioteca", de: "Bibliothek", fr: "Bibliothèque" },
    topicId: "library",
    requiredXP: 1800,
    pos: { x: 15, y: 68 },
    terrain: "grass",
    connectsTo: ["greenville"],
  },
  {
    id: "portside",
    name: { en: "Portside", bg: "Пристанище", es: "Puerto", it: "Porto", de: "Hafenstadt", fr: "Port" },
    emoji: "🧭",
    building: { en: "Travel Agency", bg: "Туристическа агенция", es: "Agencia de Viajes", it: "Agenzia Viaggi", de: "Reisebüro", fr: "Agence de Voyage" },
    topicId: "travel",
    requiredXP: 3000,
    pos: { x: 85, y: 15 },
    terrain: "coast",
    connectsTo: ["townhall"],
  },
  {
    id: "townhall",
    name: { en: "Town Hall", bg: "Кметство", es: "Ayuntamiento", it: "Municipio", de: "Rathaus", fr: "Mairie" },
    emoji: "🏛️",
    building: { en: "Town Hall", bg: "Кметство", es: "Ayuntamiento", it: "Municipio", de: "Rathaus", fr: "Mairie" },
    topicId: "work",
    requiredXP: 3500,
    pos: { x: 50, y: 85 },
    terrain: "urban",
    connectsTo: ["sportsville"],
  },
  {
    id: "sportsville",
    name: { en: "Sportsville", bg: "Спортен парк", es: "Deportiva", it: "Sportlandia", de: "Sportstadt", fr: "Sportville" },
    emoji: "⚽",
    building: { en: "Stadium", bg: "Стадион", es: "Estadio", it: "Stadio", de: "Stadion", fr: "Stade" },
    topicId: "sports",
    requiredXP: 4000,
    pos: { x: 80, y: 78 },
    terrain: "grass",
    connectsTo: ["melodia"],
  },
  {
    id: "melodia",
    name: { en: "Melodia", bg: "Мелодия", es: "Melodía", it: "Melodia", de: "Melodia", fr: "Mélodie" },
    emoji: "🎵",
    building: { en: "Concert Hall", bg: "Концертна зала", es: "Sala de Conciertos", it: "Sala Concerti", de: "Konzerthalle", fr: "Salle de Concert" },
    topicId: "music",
    requiredXP: 4500,
    pos: { x: 90, y: 55 },
    terrain: "urban",
    connectsTo: [],
  },
];

export function getCityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}
