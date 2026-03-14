import type { Language, TopicId } from "@/types";

export interface IntroFrame {
  /** Image path in /public/images/intros/ */
  image: string;
  /** Optional video path — if set, plays video instead of image */
  video?: string;
  /** Who speaks — "professor" or the NPC name */
  speaker: "professor" | string;
  /** Voice gender for TTS — "male" | "female" */
  voiceGender?: "male" | "female";
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
          it: "Benvenuto allo zoo! Oggi incontreremo degli animali fantastici.",
          de: "Willkommen im Zoo! Heute treffen wir tolle Tiere.",
          fr: "Bienvenue au zoo ! Aujourd'hui, nous allons rencontrer des animaux incroyables.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/zoo-2.webp",
        video: "/images/intros/zoo-2.mp4",
        speaker: "Zara",
        voiceGender: "female",
        text: {
          en: "Hello there! I'm Zara, the zookeeper. Ready to explore?",
          bg: "Здравей! Аз съм Зара, пазачката на зоопарка. Готов ли си за разходка?",
          es: "¡Hola! Soy Zara, la cuidadora del zoo. ¿Listo para explorar?",
          it: "Ciao! Sono Zara, la guardiana dello zoo. Pronti a esplorare?",
          de: "Hallo! Ich bin Zara, die Zoowärterin. Bereit zum Entdecken?",
          fr: "Salut ! Je suis Zara, la gardienne du zoo. Prêt à explorer ?",
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
          it: "Impariamo i nomi di tutti gli animali! Andiamo!",
          de: "Lernen wir die Namen aller Tiere! Los geht's!",
          fr: "Apprenons les noms de tous les animaux ! C'est parti !",
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
          it: "Mmm, che buon profumo! Andiamo al ristorante.",
          de: "Mmm, das riecht lecker! Lass uns das Restaurant besuchen.",
          fr: "Mmm, ça sent bon ! Allons visiter le restaurant.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/restaurant-2.webp",
        video: "/images/intros/restaurant-2.mp4",
        speaker: "Marco",
        voiceGender: "male",
        text: {
          en: "Buongiorno! I'm Chef Marco. Welcome to my kitchen!",
          bg: "Бонджорно! Аз съм Готвач Марко. Добре дошъл в моята кухня!",
          es: "¡Buongiorno! Soy el Chef Marco. ¡Bienvenido a mi cocina!",
          it: "Buongiorno! Sono lo Chef Marco. Benvenuto nella mia cucina!",
          de: "Buongiorno! Ich bin Koch Marco. Willkommen in meiner Küche!",
          fr: "Buongiorno ! Je suis le Chef Marco. Bienvenue dans ma cuisine !",
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
          it: "Impariamo il cibo e aiutiamo Marco a cucinare! Pronti?",
          de: "Lernen wir etwas über Essen und helfen Marco beim Kochen! Bereit?",
          fr: "Apprenons la nourriture et aidons Marco à cuisiner ! Prêt ?",
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
          it: "Ecco la biblioteca della scuola! Tanti libri da scoprire.",
          de: "Hier ist die Schulbibliothek! So viele Bücher zu entdecken.",
          fr: "Voici la bibliothèque de l'école ! Tant de livres à découvrir.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/school-2.svg",
        video: "/images/intros/school-2.mp4",
        speaker: "Miss Luna",
        voiceGender: "female",
        text: {
          en: "Shhh... Welcome! I'm Miss Luna. Let's find what you need!",
          bg: "Шшш... Добре дошъл! Аз съм Мис Луна. Хайде да намерим каквото ти трябва!",
          es: "Shhh... ¡Bienvenido! Soy la Señorita Luna. ¡Encontremos lo que necesitas!",
          it: "Shhh... Benvenuto! Sono Miss Luna. Troviamo quello che ti serve!",
          de: "Shhh... Willkommen! Ich bin Miss Luna. Finden wir, was du brauchst!",
          fr: "Shhh... Bienvenue ! Je suis Miss Luna. Trouvons ce qu'il te faut !",
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
          it: "È ora di imparare le parole della scuola! Cominciamo!",
          de: "Zeit, Schulwörter zu lernen! Los geht's!",
          fr: "C'est l'heure d'apprendre les mots de l'école ! Commençons !",
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
          it: "Guarda questo fantastico studio d'arte! Che colori!",
          de: "Schau dir dieses tolle Kunstatelier an! So bunt!",
          fr: "Regarde ce super atelier d'art ! Que de couleurs !",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/studio-2.svg",
        video: "/images/intros/art-studio-2.mp4",
        speaker: "Pablo",
        voiceGender: "male",
        text: {
          en: "Hello, young artist! I'm Pablo. Let's paint together!",
          bg: "Здравей, млад художник! Аз съм Пабло. Хайде да рисуваме заедно!",
          es: "¡Hola, joven artista! Soy Pablo. ¡Pintemos juntos!",
          it: "Ciao, giovane artista! Sono Pablo. Dipingiamo insieme!",
          de: "Hallo, junger Künstler! Ich bin Pablo. Lass uns zusammen malen!",
          fr: "Salut, jeune artiste ! Je suis Pablo. Peignons ensemble !",
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
          it: "Impariamo tutti i colori! Prendi i pennelli!",
          de: "Lernen wir alle Farben! Schnapp dir die Pinsel!",
          fr: "Apprenons toutes les couleurs ! Attrape tes pinceaux !",
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
          it: "Benvenuto in banca! I numeri sono ovunque qui.",
          de: "Willkommen in der Bank! Zahlen sind hier überall.",
          fr: "Bienvenue à la banque ! Les chiffres sont partout ici.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/bank-2.svg",
        video: "/images/intros/bank-2.mp4",
        speaker: "Digit",
        voiceGender: "male",
        text: {
          en: "BEEP BOOP! I'm Digit! Let's count everything together!",
          bg: "БИП БУП! Аз съм Диджит! Хайде да преброим всичко заедно!",
          es: "¡BIP BUP! ¡Soy Digit! ¡Contemos todo juntos!",
          it: "BIP BOP! Sono Digit! Contiamo tutto insieme!",
          de: "PIEP PIEP! Ich bin Digit! Lass uns alles zusammen zählen!",
          fr: "BIP BOP ! Je suis Digit ! Comptons tout ensemble !",
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
          it: "I numeri sono divertenti! Cominciamo a contare!",
          de: "Zahlen machen Spaß! Fangen wir an zu zählen!",
          fr: "Les chiffres, c'est amusant ! Commençons à compter !",
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
          it: "Che casa accogliente! Qui vive qualcuno di speciale.",
          de: "Was für ein gemütliches Haus! Hier wohnt jemand Besonderes.",
          fr: "Quelle maison chaleureuse ! Quelqu'un de spécial habite ici.",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/home-2.svg",
        video: "/images/intros/home-2.mp4",
        speaker: "Grandma Rose",
        voiceGender: "female",
        text: {
          en: "Oh, hello dear! Come in! I'm Grandma Rose.",
          bg: "Ох, здравей, мило! Влизай! Аз съм Баба Роза.",
          es: "¡Oh, hola querido! ¡Entra! Soy la Abuela Rosa.",
          it: "Oh, ciao caro! Entra! Sono Nonna Rosa.",
          de: "Oh, hallo Schatz! Komm rein! Ich bin Oma Rose.",
          fr: "Oh, bonjour mon petit ! Entre ! Je suis Mamie Rose.",
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
          it: "Parliamo della famiglia! Sarà divertente!",
          de: "Sprechen wir über die Familie! Das wird lustig!",
          fr: "Parlons de la famille ! Ça va être amusant !",
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
          it: "Ecco l'ospedale! Non preoccuparti, sarà una visita divertente!",
          de: "Hier ist das Krankenhaus! Keine Sorge, es wird ein lustiger Besuch!",
          fr: "Voici l'hôpital ! Ne t'inquiète pas, ce sera une visite amusante !",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/hospital-2.svg",
        video: "/images/intros/hospital-2.mp4",
        speaker: "Dr. Bones",
        voiceGender: "male",
        text: {
          en: "Hello! I'm Dr. Bones! Ready for a fun checkup?",
          bg: "Здравей! Аз съм Доктор Боунс! Готов ли си за забавен преглед?",
          es: "¡Hola! ¡Soy el Dr. Bones! ¿Listo para un chequeo divertido?",
          it: "Ciao! Sono il Dr. Bones! Pronti per un controllo divertente?",
          de: "Hallo! Ich bin Dr. Bones! Bereit für eine lustige Untersuchung?",
          fr: "Bonjour ! Je suis Dr. Bones ! Prêt pour un examen amusant ?",
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
          it: "Impariamo il corpo! Indica il tuo naso!",
          de: "Lernen wir den Körper kennen! Zeig auf deine Nase!",
          fr: "Apprenons le corps ! Montre ton nez !",
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
          it: "Guarda in alto! La stazione meteo è in cima alla montagna!",
          de: "Schau nach oben! Die Wetterstation ist auf dem Berggipfel!",
          fr: "Regarde en haut ! La station météo est au sommet de la montagne !",
        },
        duration: 5000,
        animation: "zoom-in",
      },
      {
        image: "/images/intros/station-2.svg",
        video: "/images/intros/weather-station-2.mp4",
        speaker: "Sunny",
        voiceGender: "female",
        text: {
          en: "GOOD MORNING! I'm Sunny! What's the weather like today?",
          bg: "ДОБРО УТРО! Аз съм Съни! Какво е времето днес?",
          es: "¡BUENOS DÍAS! ¡Soy Sunny! ¿Cómo está el clima hoy?",
          it: "BUONGIORNO! Sono Sunny! Che tempo fa oggi?",
          de: "GUTEN MORGEN! Ich bin Sunny! Wie ist das Wetter heute?",
          fr: "BONJOUR ! Je suis Sunny ! Quel temps fait-il aujourd'hui ?",
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
          it: "Impariamo il meteo! Sole, pioggia, neve... andiamo!",
          de: "Lernen wir das Wetter kennen! Sonne, Regen, Schnee... los geht's!",
          fr: "Apprenons la météo ! Soleil, pluie, neige... c'est parti !",
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
