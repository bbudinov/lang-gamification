import type { Language } from "@/types";

// ─── Room system — conversation scenes ───────────────────────────

export interface RoomItem {
  emoji: string;
  name: Record<Language, string>;
}

export interface ConversationOption {
  text: Record<Language, string>;
  correct: boolean;
}

export interface ConversationStep {
  npcSays: Record<Language, string>;
  options: ConversationOption[];
  /** NPC response after correct choice */
  correctResponse: Record<Language, string>;
  /** NPC response after wrong choice */
  wrongResponse: Record<Language, string>;
}

export interface RoomNPC {
  name: string;
  emoji: string;
  gender: "male" | "female";
  role: Record<Language, string>;
}

export interface Room {
  id: string;
  name: Record<Language, string>;
  emoji: string;
  description: Record<Language, string>;
  bgGradient: string; // tailwind gradient classes
  npc: RoomNPC;
  requiredXP: number;
  items: RoomItem[];
  conversation: ConversationStep[];
  /** XP reward on completion */
  rewardXP: number;
  /** Coin reward on completion */
  rewardCoins: number;
}

// ─── Room definitions ────────────────────────────────────────────

export const ROOMS: Room[] = [
  {
    id: "market",
    name: { en: "Market", bg: "Магазин", es: "Mercado" },
    emoji: "🏪",
    description: {
      en: "Buy food at the market",
      bg: "Купи храна от магазина",
      es: "Compra comida en el mercado",
    },
    bgGradient: "from-amber-900/40 to-green-900/30",
    npc: {
      name: "Maria",
      emoji: "👩‍🍳",
      gender: "female",
      role: { en: "Shopkeeper", bg: "Продавачка", es: "Tendera" },
    },
    requiredXP: 0,
    items: [
      { emoji: "🍞", name: { en: "bread", bg: "хляб", es: "pan" } },
      { emoji: "🥛", name: { en: "milk", bg: "мляко", es: "leche" } },
      { emoji: "🧀", name: { en: "cheese", bg: "сирене", es: "queso" } },
      { emoji: "🍎", name: { en: "apple", bg: "ябълка", es: "manzana" } },
      { emoji: "🐟", name: { en: "fish", bg: "риба", es: "pescado" } },
    ],
    rewardXP: 20,
    rewardCoins: 15,
    conversation: [
      {
        npcSays: {
          en: "Welcome to my shop! What would you like to buy?",
          bg: "Добре дошли в магазина! Какво искате да купите?",
          es: "¡Bienvenido a mi tienda! ¿Qué quieres comprar?",
        },
        options: [
          { text: { en: "I want bread, please", bg: "Искам хляб, моля", es: "Quiero pan, por favor" }, correct: true },
          { text: { en: "I want a car", bg: "Искам кола", es: "Quiero un coche" }, correct: false },
          { text: { en: "I want milk, please", bg: "Искам мляко, моля", es: "Quiero leche, por favor" }, correct: true },
        ],
        correctResponse: {
          en: "Great choice! Here you go.",
          bg: "Страхотен избор! Заповядайте.",
          es: "¡Buena elección! Aquí tienes.",
        },
        wrongResponse: {
          en: "Sorry, we don't sell that here. Try something from the shelf!",
          bg: "Съжалявам, това не продаваме. Пробвай нещо от рафта!",
          es: "Lo siento, eso no lo vendemos. ¡Prueba algo del estante!",
        },
      },
      {
        npcSays: {
          en: "Would you like anything else?",
          bg: "Искате ли нещо друго?",
          es: "¿Quieres algo más?",
        },
        options: [
          { text: { en: "Yes, cheese please", bg: "Да, сирене моля", es: "Sí, queso por favor" }, correct: true },
          { text: { en: "A table, please", bg: "Маса, моля", es: "Una mesa, por favor" }, correct: false },
          { text: { en: "An apple, please", bg: "Ябълка, моля", es: "Una manzana, por favor" }, correct: true },
        ],
        correctResponse: {
          en: "Here it is! Fresh today.",
          bg: "Ето! Днес е пресен/а.",
          es: "¡Aquí está! Fresco hoy.",
        },
        wrongResponse: {
          en: "Hmm, I don't have that. Look at what's on the shelf!",
          bg: "Хмм, нямам такова. Погледни какво има на рафта!",
          es: "Hmm, no tengo eso. ¡Mira lo que hay en el estante!",
        },
      },
      {
        npcSays: {
          en: "That will be 5 coins. Here is your bag!",
          bg: "Това ще бъде 5 монети. Ето торбата ви!",
          es: "Son 5 monedas. ¡Aquí está tu bolsa!",
        },
        options: [
          { text: { en: "Thank you! Goodbye!", bg: "Благодаря! Довиждане!", es: "¡Gracias! ¡Adiós!" }, correct: true },
          { text: { en: "Goodbye!", bg: "Довиждане!", es: "¡Adiós!" }, correct: true },
        ],
        correctResponse: {
          en: "Have a wonderful day! Come back soon!",
          bg: "Хубав ден! Елате пак!",
          es: "¡Que tengas un buen día! ¡Vuelve pronto!",
        },
        wrongResponse: {
          en: "Have a wonderful day!",
          bg: "Хубав ден!",
          es: "¡Que tengas un buen día!",
        },
      },
    ],
  },
  {
    id: "zoo",
    name: { en: "Zoo", bg: "Зоопарк", es: "Zoológico" },
    emoji: "🦁",
    description: {
      en: "Visit animals at the zoo",
      bg: "Посети животните в зоопарка",
      es: "Visita los animales en el zoológico",
    },
    bgGradient: "from-green-900/40 to-emerald-900/30",
    npc: {
      name: "Tom",
      emoji: "🧑‍🌾",
      gender: "male",
      role: { en: "Zookeeper", bg: "Зоопазач", es: "Cuidador" },
    },
    requiredXP: 200,
    items: [
      { emoji: "🦁", name: { en: "lion", bg: "лъв", es: "león" } },
      { emoji: "🐘", name: { en: "elephant", bg: "слон", es: "elefante" } },
      { emoji: "🐵", name: { en: "monkey", bg: "маймуна", es: "mono" } },
      { emoji: "🐻", name: { en: "bear", bg: "мечка", es: "oso" } },
      { emoji: "🐦", name: { en: "bird", bg: "птица", es: "pájaro" } },
    ],
    rewardXP: 25,
    rewardCoins: 20,
    conversation: [
      {
        npcSays: {
          en: "Welcome to the zoo! Do you see the big animal over there? What is it?",
          bg: "Добре дошли в зоопарка! Виждаш ли голямото животно там? Какво е то?",
          es: "¡Bienvenido al zoológico! ¿Ves el animal grande allí? ¿Qué es?",
        },
        options: [
          { text: { en: "It's an elephant!", bg: "Това е слон!", es: "¡Es un elefante!" }, correct: true },
          { text: { en: "It's a table!", bg: "Това е маса!", es: "¡Es una mesa!" }, correct: false },
          { text: { en: "It's a lion!", bg: "Това е лъв!", es: "¡Es un león!" }, correct: true },
        ],
        correctResponse: {
          en: "Yes! Very good! You know your animals!",
          bg: "Да! Много добре! Познаваш животните!",
          es: "¡Sí! ¡Muy bien! ¡Conoces los animales!",
        },
        wrongResponse: {
          en: "Hmm, that's not an animal! Look at the cage again.",
          bg: "Хмм, това не е животно! Погледни пак клетката.",
          es: "Hmm, ¡eso no es un animal! Mira la jaula otra vez.",
        },
      },
      {
        npcSays: {
          en: "Look! That animal is climbing the tree. What is it?",
          bg: "Виж! Това животно се катери по дървото. Какво е то?",
          es: "¡Mira! Ese animal está trepando el árbol. ¿Qué es?",
        },
        options: [
          { text: { en: "It's a monkey!", bg: "Това е маймуна!", es: "¡Es un mono!" }, correct: true },
          { text: { en: "It's a fish!", bg: "Това е риба!", es: "¡Es un pez!" }, correct: false },
          { text: { en: "It's a bird!", bg: "Това е птица!", es: "¡Es un pájaro!" }, correct: true },
        ],
        correctResponse: {
          en: "Correct! You're a great animal expert!",
          bg: "Правилно! Ти си страхотен познавач на животни!",
          es: "¡Correcto! ¡Eres un gran experto en animales!",
        },
        wrongResponse: {
          en: "Not quite! Fish can't climb trees! Try again.",
          bg: "Не точно! Рибите не могат да се катерят! Пробвай пак.",
          es: "¡No exactamente! ¡Los peces no trepan árboles! Intenta de nuevo.",
        },
      },
      {
        npcSays: {
          en: "You did great! What was your favorite animal today?",
          bg: "Беше страхотно! Кое беше любимото ти животно днес?",
          es: "¡Lo hiciste genial! ¿Cuál fue tu animal favorito hoy?",
        },
        options: [
          { text: { en: "I like the lion!", bg: "Харесвам лъва!", es: "¡Me gusta el león!" }, correct: true },
          { text: { en: "I like the monkey!", bg: "Харесвам маймуната!", es: "¡Me gusta el mono!" }, correct: true },
          { text: { en: "I like all of them!", bg: "Харесвам ги всички!", es: "¡Me gustan todos!" }, correct: true },
        ],
        correctResponse: {
          en: "Wonderful! Come visit us again soon!",
          bg: "Чудесно! Ела пак скоро!",
          es: "¡Maravilloso! ¡Ven a visitarnos pronto!",
        },
        wrongResponse: {
          en: "Great! See you soon!",
          bg: "Страхотно! До скоро!",
          es: "¡Genial! ¡Hasta pronto!",
        },
      },
    ],
  },
];

export function getRoomById(id: string): Room | undefined {
  return ROOMS.find((r) => r.id === id);
}
