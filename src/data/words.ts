import type { Topic } from "@/types";

export const topics: Topic[] = [
  {
    id: "animals",
    name: { en: "Animals", bg: "Животни", es: "Animales" },
    emoji: "🦁",
    unlockCost: 0,
    position: [-3, 0.5, -2],
    color: "#22c55e",
    words: [
      { id: "a1", en: "cat", bg: "котка", es: "gato", emoji: "🐱" },
      { id: "a2", en: "dog", bg: "куче", es: "perro", emoji: "🐶" },
      { id: "a3", en: "bird", bg: "птица", es: "pájaro", emoji: "🐦" },
      { id: "a4", en: "fish", bg: "риба", es: "pez", emoji: "🐟" },
      { id: "a5", en: "horse", bg: "кон", es: "caballo", emoji: "🐴" },
      { id: "a6", en: "bear", bg: "мечка", es: "oso", emoji: "🐻" },
      { id: "a7", en: "rabbit", bg: "заек", es: "conejo", emoji: "🐰" },
      { id: "a8", en: "elephant", bg: "слон", es: "elefante", emoji: "🐘" },
      { id: "a9", en: "lion", bg: "лъв", es: "león", emoji: "🦁" },
      { id: "a10", en: "monkey", bg: "маймуна", es: "mono", emoji: "🐵" },
    ],
  },
  {
    id: "colors",
    name: { en: "Colors", bg: "Цветове", es: "Colores" },
    emoji: "🎨",
    unlockCost: 50,
    position: [3, 0.5, -1],
    color: "#f59e0b",
    words: [
      { id: "c1", en: "red", bg: "червен", es: "rojo", emoji: "🔴" },
      { id: "c2", en: "blue", bg: "син", es: "azul", emoji: "🔵" },
      { id: "c3", en: "green", bg: "зелен", es: "verde", emoji: "🟢" },
      { id: "c4", en: "yellow", bg: "жълт", es: "amarillo", emoji: "🟡" },
      { id: "c5", en: "white", bg: "бял", es: "blanco", emoji: "⚪" },
      { id: "c6", en: "black", bg: "черен", es: "negro", emoji: "⚫" },
      { id: "c7", en: "orange", bg: "оранжев", es: "naranja", emoji: "🟠" },
      { id: "c8", en: "purple", bg: "лилав", es: "morado", emoji: "🟣" },
    ],
  },
];
