import type { Language, TopicId } from "@/types";

export interface IntroFrame {
  /** Image path in /public/images/intros/ */
  image: string;
  /** Optional video path — if set, plays video instead of image */
  video?: string;
  /** Who speaks — "professor" or the NPC name */
  speaker: "professor" | string;
  /** Dialogue text per language */
  text: Record<Language, string>;
  /** Duration in ms (default 4500) */
  duration?: number;
  /** Camera animation: "zoom-in" | "pan-left" | "pan-right" | "zoom-out" */
  animation?: "zoom-in" | "pan-left" | "pan-right" | "zoom-out" | "still";
}

export interface IntroScene {
  topicId: TopicId;
  /** NPC name for the location */
  npcName: string;
  npcEmoji: string;
  frames: IntroFrame[];
}

export const introScenes: IntroScene[] = [
  {
    topicId: "animals",
    npcName: "Zara",
    npcEmoji: "🐕",
    frames: [
      {
        image: "/images/intros/zoo-1.webp",
        video: "/images/intros/zoo-1.mp4",
        speaker: "professor",
        text: {
          en: "Welcome to the zoo! Today we'll meet some amazing animals.",
          bg: "Добре дошъл в зоопарка! Днес ще срещнем невероятни животни.",
          es: "¡Bienvenido al zoológico! Hoy conoceremos animales increíbles.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/zoo-2.webp",
        video: "/images/intros/zoo-2.mp4",
        speaker: "Zara",
        text: {
          en: "Hello there! I'm Zara, the zookeeper. Ready to explore?",
          bg: "Здравей! Аз съм Зара, пазачката на зоопарка. Готов ли си за разходка?",
          es: "¡Hola! Soy Zara, la cuidadora del zoo. ¿Listo para explorar?",
        },
        duration: 5000,
        animation: "pan-right",
      },
      {
        image: "/images/intros/zoo-3.webp",
        video: "/images/intros/zoo-3.mp4",
        speaker: "professor",
        text: {
          en: "Let's learn the names of all the animals! Let's go!",
          bg: "Хайде да научим имената на всички животни! Да тръгваме!",
          es: "¡Aprendamos los nombres de todos los animales! ¡Vamos!",
        },
        duration: 4000,
        animation: "zoom-out",
      },
    ],
  },
  {
    topicId: "food",
    npcName: "Marco",
    npcEmoji: "👨‍🍳",
    frames: [
      {
        image: "/images/intros/restaurant-1.webp",
        video: "/images/intros/restaurant-1.mp4",
        speaker: "professor",
        text: {
          en: "Mmm, something smells delicious! Let's visit the restaurant.",
          bg: "Ммм, нещо ухае вкусно! Хайде да посетим ресторанта.",
          es: "¡Mmm, algo huele delicioso! Visitemos el restaurante.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/restaurant-2.webp",
        video: "/images/intros/restaurant-2.mp4",
        speaker: "Marco",
        text: {
          en: "Buongiorno! I'm Chef Marco. Welcome to my kitchen!",
          bg: "Бонджорно! Аз съм Готвач Марко. Добре дошъл в моята кухня!",
          es: "¡Buongiorno! Soy el Chef Marco. ¡Bienvenido a mi cocina!",
        },
        duration: 5000,
        animation: "pan-left",
      },
      {
        image: "/images/intros/restaurant-3.webp",
        video: "/images/intros/restaurant-3.mp4",
        speaker: "professor",
        text: {
          en: "Let's learn about food and help Marco cook! Ready?",
          bg: "Хайде да научим за храната и да помогнем на Марко да готви! Готов?",
          es: "¡Aprendamos sobre comida y ayudemos a Marco a cocinar! ¿Listo?",
        },
        duration: 4000,
        animation: "zoom-out",
      },
    ],
  },
  {
    topicId: "school",
    npcName: "Miss Luna",
    npcEmoji: "📚",
    frames: [
      {
        image: "/images/intros/school-1.svg",
        video: "/images/intros/school-1.mp4",
        speaker: "professor",
        text: {
          en: "Here's the school library! So many books to discover.",
          bg: "Ето я училищната библиотека! Толкова много книги за откриване.",
          es: "¡Aquí está la biblioteca escolar! Tantos libros por descubrir.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/school-2.svg",
        video: "/images/intros/school-2.mp4",
        speaker: "Miss Luna",
        text: {
          en: "Shhh... Welcome! I'm Miss Luna. Let's find what you need!",
          bg: "Шшш... Добре дошъл! Аз съм Мис Луна. Хайде да намерим каквото ти трябва!",
          es: "Shhh... ¡Bienvenido! Soy la Señorita Luna. ¡Encontremos lo que necesitas!",
        },
        duration: 5000,
        animation: "pan-right",
      },
      {
        image: "/images/intros/school-3.svg",
        video: "/images/intros/school-3.mp4",
        speaker: "professor",
        text: {
          en: "Time to learn school words! Let's begin!",
          bg: "Време е да научим училищни думи! Да започваме!",
          es: "¡Es hora de aprender palabras escolares! ¡Empecemos!",
        },
        duration: 4000,
        animation: "zoom-out",
      },
    ],
  },
  {
    topicId: "colors",
    npcName: "Pablo",
    npcEmoji: "🎨",
    frames: [
      {
        image: "/images/intros/studio-1.svg",
        video: "/images/intros/art-studio-1.mp4",
        speaker: "professor",
        text: {
          en: "Look at this amazing art studio! So colorful!",
          bg: "Виж това невероятно арт студио! Толкова цветно!",
          es: "¡Mira este increíble estudio de arte! ¡Tan colorido!",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/studio-2.svg",
        video: "/images/intros/art-studio-2.mp4",
        speaker: "Pablo",
        text: {
          en: "Hello, young artist! I'm Pablo. Let's paint together!",
          bg: "Здравей, млад художник! Аз съм Пабло. Хайде да рисуваме заедно!",
          es: "¡Hola, joven artista! Soy Pablo. ¡Pintemos juntos!",
        },
        duration: 5000,
        animation: "pan-left",
      },
      {
        image: "/images/intros/studio-3.svg",
        video: "/images/intros/art-studio-3.mp4",
        speaker: "professor",
        text: {
          en: "Let's learn all the colors! Grab your brushes!",
          bg: "Хайде да научим всички цветове! Хващай четките!",
          es: "¡Aprendamos todos los colores! ¡Toma tus pinceles!",
        },
        duration: 4000,
        animation: "zoom-out",
      },
    ],
  },
  {
    topicId: "numbers",
    npcName: "Digit",
    npcEmoji: "🤖",
    frames: [
      {
        image: "/images/intros/bank-1.svg",
        video: "/images/intros/bank-1.mp4",
        speaker: "professor",
        text: {
          en: "Welcome to the bank! Numbers are everywhere here.",
          bg: "Добре дошъл в банката! Числата са навсякъде тук.",
          es: "¡Bienvenido al banco! Los números están por todas partes.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/bank-2.svg",
        video: "/images/intros/bank-2.mp4",
        speaker: "Digit",
        text: {
          en: "BEEP BOOP! I'm Digit! Let's count everything together!",
          bg: "БИП БУП! Аз съм Диджит! Хайде да преброим всичко заедно!",
          es: "¡BIP BUP! ¡Soy Digit! ¡Contemos todo juntos!",
        },
        duration: 5000,
        animation: "pan-right",
      },
      {
        image: "/images/intros/bank-3.svg",
        video: "/images/intros/bank-3.mp4",
        speaker: "professor",
        text: {
          en: "Numbers are fun! Let's start counting!",
          bg: "Числата са забавни! Хайде да започнем да броим!",
          es: "¡Los números son divertidos! ¡Empecemos a contar!",
        },
        duration: 4000,
        animation: "zoom-out",
      },
    ],
  },
  {
    topicId: "family",
    npcName: "Grandma Rose",
    npcEmoji: "👵",
    frames: [
      {
        image: "/images/intros/home-1.svg",
        video: "/images/intros/home-1.mp4",
        speaker: "professor",
        text: {
          en: "What a cozy house! Someone special lives here.",
          bg: "Каква уютна къща! Тук живее някой специален.",
          es: "¡Qué casa tan acogedora! Alguien especial vive aquí.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/home-2.svg",
        video: "/images/intros/home-2.mp4",
        speaker: "Grandma Rose",
        text: {
          en: "Oh, hello dear! Come in! I'm Grandma Rose.",
          bg: "Ох, здравей, мило! Влизай! Аз съм Баба Роза.",
          es: "¡Oh, hola querido! ¡Entra! Soy la Abuela Rosa.",
        },
        duration: 5000,
        animation: "pan-left",
      },
      {
        image: "/images/intros/home-3.svg",
        video: "/images/intros/home-3.mp4",
        speaker: "professor",
        text: {
          en: "Let's talk about family! This will be fun!",
          bg: "Хайде да поговорим за семейството! Ще бъде забавно!",
          es: "¡Hablemos de la familia! ¡Será divertido!",
        },
        duration: 4000,
        animation: "zoom-out",
      },
    ],
  },
  {
    topicId: "body",
    npcName: "Dr. Bones",
    npcEmoji: "🩺",
    frames: [
      {
        image: "/images/intros/hospital-1.svg",
        video: "/images/intros/hospital-1.mp4",
        speaker: "professor",
        text: {
          en: "Here's the hospital! Don't worry, it's a fun visit!",
          bg: "Ето я болницата! Не се притеснявай, ще е забавно!",
          es: "¡Aquí está el hospital! ¡No te preocupes, será divertido!",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/hospital-2.svg",
        video: "/images/intros/hospital-2.mp4",
        speaker: "Dr. Bones",
        text: {
          en: "Hello! I'm Dr. Bones! Ready for a fun checkup?",
          bg: "Здравей! Аз съм Доктор Боунс! Готов ли си за забавен преглед?",
          es: "¡Hola! ¡Soy el Dr. Bones! ¿Listo para un chequeo divertido?",
        },
        duration: 5000,
        animation: "pan-right",
      },
      {
        image: "/images/intros/hospital-3.svg",
        video: "/images/intros/hospital-3.mp4",
        speaker: "professor",
        text: {
          en: "Let's learn about the body! Point to your nose!",
          bg: "Хайде да научим за тялото! Покажи носа си!",
          es: "¡Aprendamos sobre el cuerpo! ¡Señala tu nariz!",
        },
        duration: 4000,
        animation: "zoom-out",
      },
    ],
  },
  {
    topicId: "weather",
    npcName: "Sunny",
    npcEmoji: "🌤️",
    frames: [
      {
        image: "/images/intros/station-1.svg",
        video: "/images/intros/weather-station-1.mp4",
        speaker: "professor",
        text: {
          en: "Look up! The weather station is on the mountain top!",
          bg: "Виж нагоре! Метеостанцията е на върха на планината!",
          es: "¡Mira arriba! ¡La estación meteorológica está en la cima!",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/station-2.svg",
        video: "/images/intros/weather-station-2.mp4",
        speaker: "Sunny",
        text: {
          en: "GOOD MORNING! I'm Sunny! What's the weather like today?",
          bg: "ДОБРО УТРО! Аз съм Съни! Какво е времето днес?",
          es: "¡BUENOS DÍAS! ¡Soy Sunny! ¿Cómo está el clima hoy?",
        },
        duration: 5000,
        animation: "pan-left",
      },
      {
        image: "/images/intros/station-3.svg",
        video: "/images/intros/weather-station-3.mp4",
        speaker: "professor",
        text: {
          en: "Let's learn about weather! Sun, rain, snow... let's go!",
          bg: "Хайде да научим за времето! Слънце, дъжд, сняг... да тръгваме!",
          es: "¡Aprendamos sobre el clima! Sol, lluvia, nieve... ¡vamos!",
        },
        duration: 4000,
        animation: "zoom-out",
      },
    ],
  },
];

export function getIntroScene(topicId: TopicId): IntroScene | undefined {
  return introScenes.find((s) => s.topicId === topicId);
}
