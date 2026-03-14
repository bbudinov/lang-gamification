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
    name: { en: "Market", bg: "Магазин", es: "Mercado", it: "Mercato", de: "Markt", fr: "Marché" },
    emoji: "🏪",
    description: {
      en: "Buy food at the market",
      bg: "Купи храна от магазина",
      es: "Compra comida en el mercado",
      it: "Compra cibo al mercato",
      de: "Kaufe Essen auf dem Markt",
      fr: "Achète de la nourriture au marché",
    },
    bgGradient: "from-amber-900/40 to-green-900/30",
    npc: {
      name: "Maria",
      emoji: "👩‍🍳",
      gender: "female",
      role: { en: "Shopkeeper", bg: "Продавачка", es: "Tendera", it: "Negoziante", de: "Verkäuferin", fr: "Commerçante" },
    },
    requiredXP: 0,
    items: [
      { emoji: "🍞", name: { en: "bread", bg: "хляб", es: "pan", it: "pane", de: "Brot", fr: "pain" } },
      { emoji: "🥛", name: { en: "milk", bg: "мляко", es: "leche", it: "latte", de: "Milch", fr: "lait" } },
      { emoji: "🧀", name: { en: "cheese", bg: "сирене", es: "queso", it: "formaggio", de: "Käse", fr: "fromage" } },
      { emoji: "🍎", name: { en: "apple", bg: "ябълка", es: "manzana", it: "mela", de: "Apfel", fr: "pomme" } },
      { emoji: "🐟", name: { en: "fish", bg: "риба", es: "pescado", it: "pesce", de: "Fisch", fr: "poisson" } },
    ],
    rewardXP: 20,
    rewardCoins: 15,
    conversation: [
      {
        npcSays: {
          en: "Welcome to my shop! What would you like to buy?",
          bg: "Добре дошли в магазина! Какво искате да купите?",
          es: "¡Bienvenido a mi tienda! ¿Qué quieres comprar?",
          it: "Benvenuto nel mio negozio! Cosa vorresti comprare?",
          de: "Willkommen in meinem Laden! Was möchtest du kaufen?",
          fr: "Bienvenue dans ma boutique ! Qu'est-ce que tu veux acheter ?",
        },
        options: [
          {
            text: {
              en: "I want bread, please",
              bg: "Искам хляб, моля",
              es: "Quiero pan, por favor",
              it: "Vorrei del pane, per favore",
              de: "Ich möchte Brot, bitte",
              fr: "Je voudrais du pain, s'il vous plaît",
            },
            correct: true,
          },
          {
            text: {
              en: "I want a car",
              bg: "Искам кола",
              es: "Quiero un coche",
              it: "Voglio una macchina",
              de: "Ich möchte ein Auto",
              fr: "Je veux une voiture",
            },
            correct: false,
          },
          {
            text: {
              en: "I want milk, please",
              bg: "Искам мляко, моля",
              es: "Quiero leche, por favor",
              it: "Vorrei del latte, per favore",
              de: "Ich möchte Milch, bitte",
              fr: "Je voudrais du lait, s'il vous plaît",
            },
            correct: true,
          },
        ],
        correctResponse: {
          en: "Great choice! Here you go.",
          bg: "Страхотен избор! Заповядайте.",
          es: "¡Buena elección! Aquí tienes.",
          it: "Ottima scelta! Ecco a te.",
          de: "Gute Wahl! Hier, bitte.",
          fr: "Excellent choix ! Voilà.",
        },
        wrongResponse: {
          en: "Sorry, we don't sell that here. Try something from the shelf!",
          bg: "Съжалявам, това не продаваме. Пробвай нещо от рафта!",
          es: "Lo siento, eso no lo vendemos. ¡Prueba algo del estante!",
          it: "Mi dispiace, quello non lo vendiamo. Prova qualcosa dallo scaffale!",
          de: "Tut mir leid, das verkaufen wir nicht. Probier etwas aus dem Regal!",
          fr: "Désolée, on ne vend pas ça ici. Essaie quelque chose sur l'étagère !",
        },
      },
      {
        npcSays: {
          en: "Would you like anything else?",
          bg: "Искате ли нещо друго?",
          es: "¿Quieres algo más?",
          it: "Vorresti qualcos'altro?",
          de: "Möchtest du noch etwas?",
          fr: "Tu veux autre chose ?",
        },
        options: [
          {
            text: {
              en: "Yes, cheese please",
              bg: "Да, сирене моля",
              es: "Sí, queso por favor",
              it: "Sì, del formaggio per favore",
              de: "Ja, Käse bitte",
              fr: "Oui, du fromage s'il vous plaît",
            },
            correct: true,
          },
          {
            text: {
              en: "A table, please",
              bg: "Маса, моля",
              es: "Una mesa, por favor",
              it: "Un tavolo, per favore",
              de: "Einen Tisch, bitte",
              fr: "Une table, s'il vous plaît",
            },
            correct: false,
          },
          {
            text: {
              en: "An apple, please",
              bg: "Ябълка, моля",
              es: "Una manzana, por favor",
              it: "Una mela, per favore",
              de: "Einen Apfel, bitte",
              fr: "Une pomme, s'il vous plaît",
            },
            correct: true,
          },
        ],
        correctResponse: {
          en: "Here it is! Fresh today.",
          bg: "Ето! Днес е пресен/а.",
          es: "¡Aquí está! Fresco hoy.",
          it: "Eccolo! Fresco di oggi.",
          de: "Hier, bitte! Heute frisch.",
          fr: "Le voilà ! Tout frais du jour.",
        },
        wrongResponse: {
          en: "Hmm, I don't have that. Look at what's on the shelf!",
          bg: "Хмм, нямам такова. Погледни какво има на рафта!",
          es: "Hmm, no tengo eso. ¡Mira lo que hay en el estante!",
          it: "Hmm, quello non ce l'ho. Guarda cosa c'è sullo scaffale!",
          de: "Hmm, das habe ich nicht. Schau mal, was im Regal steht!",
          fr: "Hmm, je n'ai pas ça. Regarde ce qu'il y a sur l'étagère !",
        },
      },
      {
        npcSays: {
          en: "That will be 5 coins. Here is your bag!",
          bg: "Това ще бъде 5 монети. Ето торбата ви!",
          es: "Son 5 monedas. ¡Aquí está tu bolsa!",
          it: "Fanno 5 monete. Ecco la tua borsa!",
          de: "Das macht 5 Münzen. Hier ist deine Tüte!",
          fr: "Ça fait 5 pièces. Voici ton sac !",
        },
        options: [
          {
            text: {
              en: "Thank you! Goodbye!",
              bg: "Благодаря! Довиждане!",
              es: "¡Gracias! ¡Adiós!",
              it: "Grazie! Arrivederci!",
              de: "Danke! Auf Wiedersehen!",
              fr: "Merci ! Au revoir !",
            },
            correct: true,
          },
          {
            text: {
              en: "Goodbye!",
              bg: "Довиждане!",
              es: "¡Adiós!",
              it: "Arrivederci!",
              de: "Auf Wiedersehen!",
              fr: "Au revoir !",
            },
            correct: true,
          },
        ],
        correctResponse: {
          en: "Have a wonderful day! Come back soon!",
          bg: "Хубав ден! Елате пак!",
          es: "¡Que tengas un buen día! ¡Vuelve pronto!",
          it: "Buona giornata! Torna presto!",
          de: "Einen schönen Tag noch! Komm bald wieder!",
          fr: "Bonne journée ! Reviens vite !",
        },
        wrongResponse: {
          en: "Have a wonderful day!",
          bg: "Хубав ден!",
          es: "¡Que tengas un buen día!",
          it: "Buona giornata!",
          de: "Einen schönen Tag noch!",
          fr: "Bonne journée !",
        },
      },
    ],
  },
  {
    id: "zoo",
    name: { en: "Zoo", bg: "Зоопарк", es: "Zoológico", it: "Zoo", de: "Zoo", fr: "Zoo" },
    emoji: "🦁",
    description: {
      en: "Visit animals at the zoo",
      bg: "Посети животните в зоопарка",
      es: "Visita los animales en el zoológico",
      it: "Visita gli animali allo zoo",
      de: "Besuche die Tiere im Zoo",
      fr: "Rends visite aux animaux au zoo",
    },
    bgGradient: "from-green-900/40 to-emerald-900/30",
    npc: {
      name: "Tom",
      emoji: "🧑‍🌾",
      gender: "male",
      role: { en: "Zookeeper", bg: "Зоопазач", es: "Cuidador", it: "Guardiano", de: "Tierpfleger", fr: "Gardien" },
    },
    requiredXP: 200,
    items: [
      { emoji: "🦁", name: { en: "lion", bg: "лъв", es: "león", it: "leone", de: "Löwe", fr: "lion" } },
      { emoji: "🐘", name: { en: "elephant", bg: "слон", es: "elefante", it: "elefante", de: "Elefant", fr: "éléphant" } },
      { emoji: "🐵", name: { en: "monkey", bg: "маймуна", es: "mono", it: "scimmia", de: "Affe", fr: "singe" } },
      { emoji: "🐻", name: { en: "bear", bg: "мечка", es: "oso", it: "orso", de: "Bär", fr: "ours" } },
      { emoji: "🐦", name: { en: "bird", bg: "птица", es: "pájaro", it: "uccello", de: "Vogel", fr: "oiseau" } },
    ],
    rewardXP: 25,
    rewardCoins: 20,
    conversation: [
      {
        npcSays: {
          en: "Welcome to the zoo! Do you see the big animal over there? What is it?",
          bg: "Добре дошли в зоопарка! Виждаш ли голямото животно там? Какво е то?",
          es: "¡Bienvenido al zoológico! ¿Ves el animal grande allí? ¿Qué es?",
          it: "Benvenuto allo zoo! Vedi quel grande animale laggiù? Cos'è?",
          de: "Willkommen im Zoo! Siehst du das große Tier dort drüben? Was ist das?",
          fr: "Bienvenue au zoo ! Tu vois le grand animal là-bas ? Qu'est-ce que c'est ?",
        },
        options: [
          {
            text: {
              en: "It's an elephant!",
              bg: "Това е слон!",
              es: "¡Es un elefante!",
              it: "È un elefante!",
              de: "Das ist ein Elefant!",
              fr: "C'est un éléphant !",
            },
            correct: true,
          },
          {
            text: {
              en: "It's a table!",
              bg: "Това е маса!",
              es: "¡Es una mesa!",
              it: "È un tavolo!",
              de: "Das ist ein Tisch!",
              fr: "C'est une table !",
            },
            correct: false,
          },
          {
            text: {
              en: "It's a lion!",
              bg: "Това е лъв!",
              es: "¡Es un león!",
              it: "È un leone!",
              de: "Das ist ein Löwe!",
              fr: "C'est un lion !",
            },
            correct: true,
          },
        ],
        correctResponse: {
          en: "Yes! Very good! You know your animals!",
          bg: "Да! Много добре! Познаваш животните!",
          es: "¡Sí! ¡Muy bien! ¡Conoces los animales!",
          it: "Sì! Molto bene! Conosci gli animali!",
          de: "Ja! Sehr gut! Du kennst dich mit Tieren aus!",
          fr: "Oui ! Très bien ! Tu connais les animaux !",
        },
        wrongResponse: {
          en: "Hmm, that's not an animal! Look at the cage again.",
          bg: "Хмм, това не е животно! Погледни пак клетката.",
          es: "Hmm, ¡eso no es un animal! Mira la jaula otra vez.",
          it: "Hmm, quello non è un animale! Guarda di nuovo la gabbia.",
          de: "Hmm, das ist kein Tier! Schau nochmal in den Käfig.",
          fr: "Hmm, ce n'est pas un animal ! Regarde encore la cage.",
        },
      },
      {
        npcSays: {
          en: "Look! That animal is climbing the tree. What is it?",
          bg: "Виж! Това животно се катери по дървото. Какво е то?",
          es: "¡Mira! Ese animal está trepando el árbol. ¿Qué es?",
          it: "Guarda! Quell'animale si sta arrampicando sull'albero. Cos'è?",
          de: "Schau! Das Tier klettert auf den Baum. Was ist das?",
          fr: "Regarde ! Cet animal grimpe à l'arbre. Qu'est-ce que c'est ?",
        },
        options: [
          {
            text: {
              en: "It's a monkey!",
              bg: "Това е маймуна!",
              es: "¡Es un mono!",
              it: "È una scimmia!",
              de: "Das ist ein Affe!",
              fr: "C'est un singe !",
            },
            correct: true,
          },
          {
            text: {
              en: "It's a fish!",
              bg: "Това е риба!",
              es: "¡Es un pez!",
              it: "È un pesce!",
              de: "Das ist ein Fisch!",
              fr: "C'est un poisson !",
            },
            correct: false,
          },
          {
            text: {
              en: "It's a bird!",
              bg: "Това е птица!",
              es: "¡Es un pájaro!",
              it: "È un uccello!",
              de: "Das ist ein Vogel!",
              fr: "C'est un oiseau !",
            },
            correct: true,
          },
        ],
        correctResponse: {
          en: "Correct! You're a great animal expert!",
          bg: "Правилно! Ти си страхотен познавач на животни!",
          es: "¡Correcto! ¡Eres un gran experto en animales!",
          it: "Corretto! Sei un grande esperto di animali!",
          de: "Richtig! Du bist ein toller Tierexperte!",
          fr: "Correct ! Tu es un super expert des animaux !",
        },
        wrongResponse: {
          en: "Not quite! Fish can't climb trees! Try again.",
          bg: "Не точно! Рибите не могат да се катерят! Пробвай пак.",
          es: "¡No exactamente! ¡Los peces no trepan árboles! Intenta de nuevo.",
          it: "Non proprio! I pesci non si arrampicano sugli alberi! Riprova.",
          de: "Nicht ganz! Fische können nicht auf Bäume klettern! Versuch es nochmal.",
          fr: "Pas tout à fait ! Les poissons ne grimpent pas aux arbres ! Réessaie.",
        },
      },
      {
        npcSays: {
          en: "You did great! What was your favorite animal today?",
          bg: "Беше страхотно! Кое беше любимото ти животно днес?",
          es: "¡Lo hiciste genial! ¿Cuál fue tu animal favorito hoy?",
          it: "Sei stato bravissimo! Qual è stato il tuo animale preferito oggi?",
          de: "Das hast du toll gemacht! Was war heute dein Lieblingstier?",
          fr: "Tu as été super ! Quel a été ton animal préféré aujourd'hui ?",
        },
        options: [
          {
            text: {
              en: "I like the lion!",
              bg: "Харесвам лъва!",
              es: "¡Me gusta el león!",
              it: "Mi piace il leone!",
              de: "Ich mag den Löwen!",
              fr: "J'aime le lion !",
            },
            correct: true,
          },
          {
            text: {
              en: "I like the monkey!",
              bg: "Харесвам маймуната!",
              es: "¡Me gusta el mono!",
              it: "Mi piace la scimmia!",
              de: "Ich mag den Affen!",
              fr: "J'aime le singe !",
            },
            correct: true,
          },
          {
            text: {
              en: "I like all of them!",
              bg: "Харесвам ги всички!",
              es: "¡Me gustan todos!",
              it: "Mi piacciono tutti!",
              de: "Ich mag sie alle!",
              fr: "Je les aime tous !",
            },
            correct: true,
          },
        ],
        correctResponse: {
          en: "Wonderful! Come visit us again soon!",
          bg: "Чудесно! Ела пак скоро!",
          es: "¡Maravilloso! ¡Ven a visitarnos pronto!",
          it: "Meraviglioso! Torna a trovarci presto!",
          de: "Wunderbar! Komm uns bald wieder besuchen!",
          fr: "Merveilleux ! Reviens nous voir bientôt !",
        },
        wrongResponse: {
          en: "Great! See you soon!",
          bg: "Страхотно! До скоро!",
          es: "¡Genial! ¡Hasta pronto!",
          it: "Fantastico! A presto!",
          de: "Toll! Bis bald!",
          fr: "Super ! À bientôt !",
        },
      },
    ],
  },
];

export function getRoomById(id: string): Room | undefined {
  return ROOMS.find((r) => r.id === id);
}
