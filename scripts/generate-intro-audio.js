const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GOOGLE_TTS_API_KEY || "";
if (!API_KEY) {
  console.error("Set GOOGLE_TTS_API_KEY env variable before running this script");
  process.exit(1);
}
const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

// Male and female voices per language (Google Cloud TTS Chirp3-HD)
const MALE_VOICES = {
  en: { name: "en-US-Chirp3-HD-Puck", langCode: "en-US" },
  bg: { name: "bg-BG-Standard-B", langCode: "bg-BG" },
  es: { name: "es-ES-Chirp3-HD-Puck", langCode: "es-ES" },
  it: { name: "it-IT-Chirp3-HD-Puck", langCode: "it-IT" },
  de: { name: "de-DE-Chirp3-HD-Puck", langCode: "de-DE" },
  fr: { name: "fr-FR-Chirp3-HD-Puck", langCode: "fr-FR" },
};

const FEMALE_VOICES = {
  en: { name: "en-US-Chirp3-HD-Aoede", langCode: "en-US" },
  bg: { name: "bg-BG-Standard-A", langCode: "bg-BG" },
  es: { name: "es-ES-Chirp3-HD-Aoede", langCode: "es-ES" },
  it: { name: "it-IT-Chirp3-HD-Aoede", langCode: "it-IT" },
  de: { name: "de-DE-Chirp3-HD-Aoede", langCode: "de-DE" },
  fr: { name: "fr-FR-Chirp3-HD-Aoede", langCode: "fr-FR" },
};

// All intro scene frames — from introScenes.ts
// Format: { id: "intro-{topicId}-{frameIdx}", gender: "male"|"female", text: { lang: text } }
const INTRO_FRAMES = [
  // === ANIMALS ===
  {
    id: "intro-animals-0", gender: "male",
    text: { en: "Welcome to the zoo! Today we'll meet some amazing animals.", bg: "Добре дошъл в зоопарка! Днес ще срещнем невероятни животни.", es: "¡Bienvenido al zoológico! Hoy conoceremos animales increíbles.", it: "Benvenuto allo zoo! Oggi incontreremo animali incredibili.", de: "Willkommen im Zoo! Heute treffen wir einige erstaunliche Tiere.", fr: "Bienvenue au zoo ! Aujourd'hui nous allons rencontrer des animaux incroyables." },
  },
  {
    id: "intro-animals-1", gender: "female",
    text: { en: "Hello there! I'm Zara, the zookeeper. Ready to explore?", bg: "Здравей! Аз съм Зара, пазачката на зоопарка. Готов ли си за разходка?", es: "¡Hola! Soy Zara, la cuidadora del zoo. ¿Listo para explorar?", it: "Ciao! Sono Zara, la guardiana dello zoo. Pronto per esplorare?", de: "Hallo! Ich bin Zara, die Zoowärterin. Bereit zum Erkunden?", fr: "Salut ! Je suis Zara, la gardienne du zoo. Prêt à explorer ?" },
  },
  {
    id: "intro-animals-2", gender: "male",
    text: { en: "Let's learn the names of all the animals! Let's go!", bg: "Хайде да научим имената на всички животни! Да тръгваме!", es: "¡Aprendamos los nombres de todos los animales! ¡Vamos!", it: "Impariamo i nomi di tutti gli animali! Andiamo!", de: "Lernen wir die Namen aller Tiere! Los geht's!", fr: "Apprenons les noms de tous les animaux ! Allons-y !" },
  },
  // === FOOD ===
  {
    id: "intro-food-0", gender: "male",
    text: { en: "Mmm, something smells delicious! Let's visit the restaurant.", bg: "Ммм, нещо ухае вкусно! Хайде да посетим ресторанта.", es: "¡Mmm, algo huele delicioso! Visitemos el restaurante.", it: "Mmm, qualcosa profuma di buono! Visitiamo il ristorante.", de: "Mmm, etwas riecht köstlich! Lass uns das Restaurant besuchen.", fr: "Mmm, quelque chose sent bon ! Visitons le restaurant." },
  },
  {
    id: "intro-food-1", gender: "male",
    text: { en: "Buongiorno! I'm Chef Marco. Welcome to my kitchen!", bg: "Бонджорно! Аз съм Готвач Марко. Добре дошъл в моята кухня!", es: "¡Buongiorno! Soy el Chef Marco. ¡Bienvenido a mi cocina!", it: "Buongiorno! Sono lo Chef Marco. Benvenuto nella mia cucina!", de: "Buongiorno! Ich bin Chefkoch Marco. Willkommen in meiner Küche!", fr: "Buongiorno ! Je suis le Chef Marco. Bienvenue dans ma cuisine !" },
  },
  {
    id: "intro-food-2", gender: "male",
    text: { en: "Let's learn about food and help Marco cook! Ready?", bg: "Хайде да научим за храната и да помогнем на Марко да готви! Готов?", es: "¡Aprendamos sobre comida y ayudemos a Marco a cocinar! ¿Listo?", it: "Impariamo il cibo e aiutiamo Marco a cucinare! Pronti?", de: "Lernen wir etwas über Essen und helfen Marco beim Kochen! Bereit?", fr: "Apprenons la nourriture et aidons Marco à cuisiner ! Prêt ?" },
  },
  // === SCHOOL ===
  {
    id: "intro-school-0", gender: "male",
    text: { en: "Here's the school library! So many books to discover.", bg: "Ето я училищната библиотека! Толкова много книги за откриване.", es: "¡Aquí está la biblioteca escolar! Tantos libros por descubrir.", it: "Ecco la biblioteca della scuola! Tanti libri da scoprire.", de: "Hier ist die Schulbibliothek! So viele Bücher zu entdecken.", fr: "Voici la bibliothèque de l'école ! Tant de livres à découvrir." },
  },
  {
    id: "intro-school-1", gender: "female",
    text: { en: "Shhh... Welcome! I'm Miss Luna. Let's find what you need!", bg: "Шшш... Добре дошъл! Аз съм Мис Луна. Хайде да намерим каквото ти трябва!", es: "Shhh... ¡Bienvenido! Soy la Señorita Luna. ¡Encontremos lo que necesitas!", it: "Shhh... Benvenuto! Sono la Signorina Luna. Troviamo quello che ti serve!", de: "Shhh... Willkommen! Ich bin Fräulein Luna. Finden wir, was du brauchst!", fr: "Chut... Bienvenue ! Je suis Mademoiselle Luna. Trouvons ce qu'il te faut !" },
  },
  {
    id: "intro-school-2", gender: "male",
    text: { en: "Time to learn school words! Let's begin!", bg: "Време е да научим училищни думи! Да започваме!", es: "¡Es hora de aprender palabras escolares! ¡Empecemos!", it: "È ora di imparare le parole della scuola! Cominciamo!", de: "Zeit, Schulwörter zu lernen! Fangen wir an!", fr: "C'est l'heure d'apprendre les mots de l'école ! Commençons !" },
  },
  // === COLORS ===
  {
    id: "intro-colors-0", gender: "male",
    text: { en: "Look at this amazing art studio! So colorful!", bg: "Виж това невероятно арт студио! Толкова цветно!", es: "¡Mira este increíble estudio de arte! ¡Tan colorido!", it: "Guarda questo fantastico studio d'arte! Così colorato!", de: "Schau dir dieses tolle Kunstatelier an! So bunt!", fr: "Regarde ce magnifique atelier d'art ! Si coloré !" },
  },
  {
    id: "intro-colors-1", gender: "male",
    text: { en: "Hello, young artist! I'm Pablo. Let's paint together!", bg: "Здравей, млад художник! Аз съм Пабло. Хайде да рисуваме заедно!", es: "¡Hola, joven artista! Soy Pablo. ¡Pintemos juntos!", it: "Ciao, giovane artista! Sono Pablo. Dipingiamo insieme!", de: "Hallo, junger Künstler! Ich bin Pablo. Lass uns zusammen malen!", fr: "Bonjour, jeune artiste ! Je suis Pablo. Peignons ensemble !" },
  },
  {
    id: "intro-colors-2", gender: "male",
    text: { en: "Let's learn all the colors! Grab your brushes!", bg: "Хайде да научим всички цветове! Хващай четките!", es: "¡Aprendamos todos los colores! ¡Toma tus pinceles!", it: "Impariamo tutti i colori! Prendi i pennelli!", de: "Lernen wir alle Farben! Schnapp dir deine Pinsel!", fr: "Apprenons toutes les couleurs ! Attrape tes pinceaux !" },
  },
  // === NUMBERS ===
  {
    id: "intro-numbers-0", gender: "male",
    text: { en: "Welcome to the bank! Numbers are everywhere here.", bg: "Добре дошъл в банката! Числата са навсякъде тук.", es: "¡Bienvenido al banco! Los números están por todas partes.", it: "Benvenuto in banca! I numeri sono ovunque qui.", de: "Willkommen in der Bank! Zahlen sind hier überall.", fr: "Bienvenue à la banque ! Les chiffres sont partout ici." },
  },
  {
    id: "intro-numbers-1", gender: "male",
    text: { en: "BEEP BOOP! I'm Digit! Let's count everything together!", bg: "БИП БУП! Аз съм Диджит! Хайде да преброим всичко заедно!", es: "¡BIP BUP! ¡Soy Digit! ¡Contemos todo juntos!", it: "BIP BOP! Sono Digit! Contiamo tutto insieme!", de: "PIEP PIEP! Ich bin Digit! Lass uns alles zusammen zählen!", fr: "BIP BOP ! Je suis Digit ! Comptons tout ensemble !" },
  },
  {
    id: "intro-numbers-2", gender: "male",
    text: { en: "Numbers are fun! Let's start counting!", bg: "Числата са забавни! Хайде да започнем да броим!", es: "¡Los números son divertidos! ¡Empecemos a contar!", it: "I numeri sono divertenti! Cominciamo a contare!", de: "Zahlen machen Spaß! Fangen wir an zu zählen!", fr: "Les chiffres c'est amusant ! Commençons à compter !" },
  },
  // === FAMILY ===
  {
    id: "intro-family-0", gender: "male",
    text: { en: "What a cozy house! Someone special lives here.", bg: "Каква уютна къща! Тук живее някой специален.", es: "¡Qué casa tan acogedora! Alguien especial vive aquí.", it: "Che casa accogliente! Qualcuno di speciale vive qui.", de: "Was für ein gemütliches Haus! Hier wohnt jemand Besonderes.", fr: "Quelle maison chaleureuse ! Quelqu'un de spécial habite ici." },
  },
  {
    id: "intro-family-1", gender: "female",
    text: { en: "Oh, hello dear! Come in! I'm Grandma Rose.", bg: "Ох, здравей, мило! Влизай! Аз съм Баба Роза.", es: "¡Oh, hola querido! ¡Entra! Soy la Abuela Rosa.", it: "Oh, ciao caro! Entra! Sono Nonna Rosa.", de: "Oh, hallo Liebes! Komm rein! Ich bin Oma Rosa.", fr: "Oh, bonjour mon petit ! Entre ! Je suis Grand-mère Rose." },
  },
  {
    id: "intro-family-2", gender: "male",
    text: { en: "Let's talk about family! This will be fun!", bg: "Хайде да поговорим за семейството! Ще бъде забавно!", es: "¡Hablemos de la familia! ¡Será divertido!", it: "Parliamo della famiglia! Sarà divertente!", de: "Lass uns über Familie sprechen! Das wird lustig!", fr: "Parlons de la famille ! Ça va être amusant !" },
  },
  // === BODY ===
  {
    id: "intro-body-0", gender: "male",
    text: { en: "Here's the hospital! Don't worry, it's a fun visit!", bg: "Ето я болницата! Не се притеснявай, ще е забавно!", es: "¡Aquí está el hospital! ¡No te preocupes, será divertido!", it: "Ecco l'ospedale! Non preoccuparti, sarà una visita divertente!", de: "Hier ist das Krankenhaus! Keine Sorge, es wird ein lustiger Besuch!", fr: "Voici l'hôpital ! Ne t'inquiète pas, ce sera une visite amusante !" },
  },
  {
    id: "intro-body-1", gender: "male",
    text: { en: "Hello! I'm Dr. Bones! Ready for a fun checkup?", bg: "Здравей! Аз съм Доктор Боунс! Готов ли си за забавен преглед?", es: "¡Hola! ¡Soy el Dr. Bones! ¿Listo para un chequeo divertido?", it: "Ciao! Sono il Dottor Bones! Pronto per un controllo divertente?", de: "Hallo! Ich bin Dr. Bones! Bereit für eine lustige Untersuchung?", fr: "Bonjour ! Je suis le Dr Bones ! Prêt pour un bilan amusant ?" },
  },
  {
    id: "intro-body-2", gender: "male",
    text: { en: "Let's learn about the body! Point to your nose!", bg: "Хайде да научим за тялото! Покажи носа си!", es: "¡Aprendamos sobre el cuerpo! ¡Señala tu nariz!", it: "Impariamo il corpo! Indica il tuo naso!", de: "Lernen wir den Körper kennen! Zeig auf deine Nase!", fr: "Apprenons le corps ! Montre ton nez !" },
  },
  // === WEATHER ===
  {
    id: "intro-weather-0", gender: "male",
    text: { en: "Look up! The weather station is on the mountain top!", bg: "Виж нагоре! Метеостанцията е на върха на планината!", es: "¡Mira arriba! ¡La estación meteorológica está en la cima!", it: "Guarda su! La stazione meteo è in cima alla montagna!", de: "Schau hoch! Die Wetterstation ist auf dem Berggipfel!", fr: "Regarde en haut ! La station météo est au sommet de la montagne !" },
  },
  {
    id: "intro-weather-1", gender: "female",
    text: { en: "GOOD MORNING! I'm Sunny! What's the weather like today?", bg: "ДОБРО УТРО! Аз съм Съни! Какво е времето днес?", es: "¡BUENOS DÍAS! ¡Soy Sunny! ¿Cómo está el clima hoy?", it: "BUONGIORNO! Sono Sunny! Che tempo fa oggi?", de: "GUTEN MORGEN! Ich bin Sunny! Wie ist das Wetter heute?", fr: "BONJOUR ! Je suis Sunny ! Quel temps fait-il aujourd'hui ?" },
  },
  {
    id: "intro-weather-2", gender: "male",
    text: { en: "Let's learn about weather! Sun, rain, snow... let's go!", bg: "Хайде да научим за времето! Слънце, дъжд, сняг... да тръгваме!", es: "¡Aprendamos sobre el clima! Sol, lluvia, nieve... ¡vamos!", it: "Impariamo il meteo! Sole, pioggia, neve... andiamo!", de: "Lernen wir das Wetter! Sonne, Regen, Schnee... los geht's!", fr: "Apprenons la météo ! Soleil, pluie, neige... allons-y !" },
  },
];

const LANGUAGES = ["en", "bg", "es", "it", "de", "fr"];
const OUTPUT_DIR = path.join(__dirname, "..", "public", "audio", "intros");

async function synthesize(text, langCode, voiceName) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: langCode, name: voiceName },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error for ${voiceName} (${langCode}): ${res.status} ${err}`);
  }

  const data = await res.json();
  return Buffer.from(data.audioContent, "base64");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;
  let skipped = 0;

  console.log("=== Generating intro audio files ===\n");
  console.log(`${INTRO_FRAMES.length} frames × ${LANGUAGES.length} languages = ${INTRO_FRAMES.length * LANGUAGES.length} files\n`);

  for (const frame of INTRO_FRAMES) {
    for (const lang of LANGUAGES) {
      const text = frame.text[lang];
      if (!text) {
        console.log(`  MISS ${frame.id}-${lang} (no text)`);
        continue;
      }

      const filename = `${frame.id}-${lang}.mp3`;
      const filePath = path.join(OUTPUT_DIR, filename);

      if (fs.existsSync(filePath)) {
        console.log(`  SKIP ${filename}`);
        skipped++;
        continue;
      }

      const voiceConfig = frame.gender === "female" ? FEMALE_VOICES[lang] : MALE_VOICES[lang];

      try {
        const audio = await synthesize(text, voiceConfig.langCode, voiceConfig.name);
        fs.writeFileSync(filePath, audio);
        console.log(`  OK   ${filename} (${frame.gender}, ${audio.length} bytes)`);
        count++;
      } catch (err) {
        console.error(`  FAIL ${filename}: ${err.message}`);
      }

      await sleep(120);
    }
  }

  console.log(`\n✅ Done! Generated ${count} new files, skipped ${skipped}.`);
}

main().catch(console.error);
