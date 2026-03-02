const fs = require("fs");
const path = require("path");

// Set your Google Cloud TTS API key here before running
const API_KEY = process.env.GOOGLE_TTS_API_KEY || "";
if (!API_KEY) {
  console.error("Set GOOGLE_TTS_API_KEY env variable before running this script");
  process.exit(1);
}
const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

const VOICES = {
  bg: "bg-BG-Standard-B",
  en: "en-US-Chirp3-HD-Puck",
  es: "es-ES-Chirp3-HD-Puck",
};

const LANG_CODES = {
  bg: "bg-BG",
  en: "en-US",
  es: "es-ES",
};

// All words from words.ts
const WORDS = [
  // Animals
  { id: "a1", en: "cat", bg: "котка", es: "gato" },
  { id: "a2", en: "dog", bg: "куче", es: "perro" },
  { id: "a3", en: "bird", bg: "птица", es: "pájaro" },
  { id: "a4", en: "fish", bg: "риба", es: "pez" },
  { id: "a5", en: "horse", bg: "кон", es: "caballo" },
  { id: "a6", en: "bear", bg: "мечка", es: "oso" },
  { id: "a7", en: "rabbit", bg: "заек", es: "conejo" },
  { id: "a8", en: "elephant", bg: "слон", es: "elefante" },
  { id: "a9", en: "lion", bg: "лъв", es: "león" },
  { id: "a10", en: "monkey", bg: "маймуна", es: "mono" },
  // Colors
  { id: "c1", en: "red", bg: "червен", es: "rojo" },
  { id: "c2", en: "blue", bg: "син", es: "azul" },
  { id: "c3", en: "green", bg: "зелен", es: "verde" },
  { id: "c4", en: "yellow", bg: "жълт", es: "amarillo" },
  { id: "c5", en: "white", bg: "бял", es: "blanco" },
  { id: "c6", en: "black", bg: "черен", es: "negro" },
  { id: "c7", en: "orange", bg: "оранжев", es: "naranja" },
  { id: "c8", en: "purple", bg: "лилав", es: "morado" },
  // Food
  { id: "f1", en: "bread", bg: "хляб", es: "pan" },
  { id: "f2", en: "water", bg: "вода", es: "agua" },
  { id: "f3", en: "milk", bg: "мляко", es: "leche" },
  { id: "f4", en: "apple", bg: "ябълка", es: "manzana" },
  { id: "f5", en: "cheese", bg: "сирене", es: "queso" },
  { id: "f6", en: "egg", bg: "яйце", es: "huevo" },
  { id: "f7", en: "rice", bg: "ориз", es: "arroz" },
  { id: "f8", en: "meat", bg: "месо", es: "carne" },
  { id: "f9", en: "banana", bg: "банан", es: "plátano" },
  { id: "f10", en: "cake", bg: "торта", es: "pastel" },
  // Numbers
  { id: "n1", en: "one", bg: "едно", es: "uno" },
  { id: "n2", en: "two", bg: "две", es: "dos" },
  { id: "n3", en: "three", bg: "три", es: "tres" },
  { id: "n4", en: "four", bg: "четири", es: "cuatro" },
  { id: "n5", en: "five", bg: "пет", es: "cinco" },
  { id: "n6", en: "six", bg: "шест", es: "seis" },
  { id: "n7", en: "seven", bg: "седем", es: "siete" },
  { id: "n8", en: "eight", bg: "осем", es: "ocho" },
  { id: "n9", en: "nine", bg: "девет", es: "nueve" },
  { id: "n10", en: "ten", bg: "десет", es: "diez" },
  // Family
  { id: "fm1", en: "mother", bg: "майка", es: "madre" },
  { id: "fm2", en: "father", bg: "баща", es: "padre" },
  { id: "fm3", en: "sister", bg: "сестра", es: "hermana" },
  { id: "fm4", en: "brother", bg: "брат", es: "hermano" },
  { id: "fm5", en: "baby", bg: "бебе", es: "bebé" },
  { id: "fm6", en: "grandmother", bg: "баба", es: "abuela" },
  { id: "fm7", en: "grandfather", bg: "дядо", es: "abuelo" },
  { id: "fm8", en: "son", bg: "син", es: "hijo" },
  { id: "fm9", en: "daughter", bg: "дъщеря", es: "hija" },
  { id: "fm10", en: "friend", bg: "приятел", es: "amigo" },
  // Body
  { id: "b1", en: "head", bg: "глава", es: "cabeza" },
  { id: "b2", en: "hand", bg: "ръка", es: "mano" },
  { id: "b3", en: "foot", bg: "крак", es: "pie" },
  { id: "b4", en: "eye", bg: "око", es: "ojo" },
  { id: "b5", en: "ear", bg: "ухо", es: "oreja" },
  { id: "b6", en: "nose", bg: "нос", es: "nariz" },
  { id: "b7", en: "mouth", bg: "уста", es: "boca" },
  { id: "b8", en: "heart", bg: "сърце", es: "corazón" },
  { id: "b9", en: "finger", bg: "пръст", es: "dedo" },
  { id: "b10", en: "leg", bg: "крак", es: "pierna" },
  // Weather
  { id: "w1", en: "sun", bg: "слънце", es: "sol" },
  { id: "w2", en: "rain", bg: "дъжд", es: "lluvia" },
  { id: "w3", en: "snow", bg: "сняг", es: "nieve" },
  { id: "w4", en: "wind", bg: "вятър", es: "viento" },
  { id: "w5", en: "cloud", bg: "облак", es: "nube" },
  { id: "w6", en: "storm", bg: "буря", es: "tormenta" },
  { id: "w7", en: "hot", bg: "горещо", es: "caliente" },
  { id: "w8", en: "cold", bg: "студено", es: "frío" },
  { id: "w9", en: "rainbow", bg: "дъга", es: "arcoíris" },
  { id: "w10", en: "moon", bg: "луна", es: "luna" },
  // Travel
  { id: "tr1", en: "airport", bg: "летище", es: "aeropuerto" },
  { id: "tr2", en: "suitcase", bg: "куфар", es: "maleta" },
  { id: "tr3", en: "hotel", bg: "хотел", es: "hotel" },
  { id: "tr4", en: "passport", bg: "паспорт", es: "pasaporte" },
  { id: "tr5", en: "ticket", bg: "билет", es: "billete" },
  { id: "tr6", en: "bus", bg: "автобус", es: "autobús" },
  { id: "tr7", en: "train", bg: "влак", es: "tren" },
  { id: "tr8", en: "ship", bg: "кораб", es: "barco" },
  { id: "tr9", en: "map", bg: "карта", es: "mapa" },
  { id: "tr10", en: "beach", bg: "плаж", es: "playa" },
  // School
  { id: "sc1", en: "pencil", bg: "молив", es: "lápiz" },
  { id: "sc2", en: "book", bg: "книга", es: "libro" },
  { id: "sc3", en: "teacher", bg: "учител", es: "profesor" },
  { id: "sc4", en: "desk", bg: "чин", es: "escritorio" },
  { id: "sc5", en: "backpack", bg: "раница", es: "mochila" },
  { id: "sc6", en: "classroom", bg: "класна стая", es: "aula" },
  { id: "sc7", en: "eraser", bg: "гума", es: "borrador" },
  { id: "sc8", en: "ruler", bg: "линия", es: "regla" },
  { id: "sc9", en: "homework", bg: "домашно", es: "tarea" },
  { id: "sc10", en: "recess", bg: "междучасие", es: "recreo" },
  // Work
  { id: "wk1", en: "doctor", bg: "лекар", es: "doctor" },
  { id: "wk2", en: "firefighter", bg: "пожарникар", es: "bombero" },
  { id: "wk3", en: "chef", bg: "готвач", es: "chef" },
  { id: "wk4", en: "pilot", bg: "пилот", es: "piloto" },
  { id: "wk5", en: "police officer", bg: "полицай", es: "policía" },
  { id: "wk6", en: "builder", bg: "строител", es: "constructor" },
  { id: "wk7", en: "farmer", bg: "фермер", es: "granjero" },
  { id: "wk8", en: "singer", bg: "певец", es: "cantante" },
  { id: "wk9", en: "painter", bg: "художник", es: "pintor" },
  { id: "wk10", en: "astronaut", bg: "космонавт", es: "astronauta" },
  // Sports
  { id: "spt1", en: "ball", bg: "топка", es: "balón" },
  { id: "spt2", en: "swim", bg: "плувам", es: "nadar" },
  { id: "spt3", en: "run", bg: "тичам", es: "correr" },
  { id: "spt4", en: "team", bg: "отбор", es: "equipo" },
  { id: "spt5", en: "bicycle", bg: "колело", es: "bicicleta" },
  { id: "spt6", en: "jump", bg: "скачам", es: "saltar" },
  { id: "spt7", en: "goal", bg: "гол", es: "gol" },
  { id: "spt8", en: "win", bg: "печеля", es: "ganar" },
  { id: "spt9", en: "race", bg: "надбягване", es: "carrera" },
  { id: "spt10", en: "coach", bg: "треньор", es: "entrenador" },
  // Music
  { id: "mu1", en: "guitar", bg: "китара", es: "guitarra" },
  { id: "mu2", en: "sing", bg: "пея", es: "cantar" },
  { id: "mu3", en: "dance", bg: "танцувам", es: "bailar" },
  { id: "mu4", en: "piano", bg: "пиано", es: "piano" },
  { id: "mu5", en: "drums", bg: "барабани", es: "tambor" },
  { id: "mu6", en: "song", bg: "песен", es: "canción" },
  { id: "mu7", en: "violin", bg: "цигулка", es: "violín" },
  { id: "mu8", en: "flute", bg: "флейта", es: "flauta" },
  { id: "mu9", en: "concert", bg: "концерт", es: "concierto" },
  { id: "mu10", en: "rhythm", bg: "ритъм", es: "ritmo" },
];

// Story intro phrases (BG only)
// Note: Unicode stress marks (◌́) break Google Chirp3-HD TTS, so we use plain text here.
// Display text in page.tsx has stress marks for visual guidance.
const STORY_PHRASES = [
  { id: "story1", text: "Преди много, много години, насред безкрайния океан, съществувал магически свят — ЛангУърлд.", lang: "bg" },
  { id: "story2", text: "Всеки остров пазел тайните на различни думи и езици. Но с времето хората забравили тези тайни и островите потънали в мъгла.", lang: "bg" },
  { id: "story3", text: "Само един смел изследовател можел да ги събуди отново — и този изследовател си ТИ!", lang: "bg" },
  { id: "story4", text: "Професор Глоуб ще ти бъде водач. Открий всеки остров, научи думите му и събери най-голямата награда на света — ПОЗНАНИЕТО!", lang: "bg" },
  { id: "story5", text: "Хахаха, шегичка! Естествено, че знанието е важно, но ще има и други награди — точки, звезди и изненади по пътя!", lang: "bg" },
];

// Motivational phrases (BG only)
const MOTIVATIONAL = [
  { id: "motiv1", text: "страхотен избор", lang: "bg" },
  { id: "motiv2", text: "да играем", lang: "bg" },
  { id: "motiv3", text: "уууууу", lang: "bg" },
  { id: "motiv4", text: "това ще е велико", lang: "bg" },
  { id: "motiv5", text: "фантастично", lang: "bg" },
  { id: "motiv6", text: "магнифик", lang: "bg" },
  { id: "motiv7", text: "мисли за всичко", lang: "bg" },
  { id: "motiv8", text: "владей своя ЛангУърлд", lang: "bg" },
];

// Professor Globe rules (BG)
const RULES_BG = [
  { id: "rules-greeting-bg", text: "Здравей! Нека ти обясня как работи играта.", lang: "bg" },
  { id: "rules-islands-bg", text: "Натисни остров, за да избереш игра. Всеки остров е тема. Печели точки, за да отключиш нови!", lang: "bg" },
  { id: "rules-stats-bg", text: "Горната лента показва напредъка ти. Звездата е за точките. Мълнията е енергия, която се зарежда с времето. Огънчето показва колко дни поред си играл. Отметките са дневните ти цели, а бутонът за език превключва между български и английски.", lang: "bg" },
  { id: "rules-memory-bg", text: "Мемори Мач. Обръщай карти и намери съвпадащи двойки думи. Получаваш 10 точки за вярна двойка, губиш 2 за грешна, и печелиш 50 бонус точки ако завършиш всички!", lang: "bg" },
  { id: "rules-quiz-bg", text: "Уърд Куиз. Чуй дума и избери правилния превод от четири варианта. Получаваш 15 точки за верен отговор, губиш 5 за грешен, и печелиш 60 бонус точки ако завършиш!", lang: "bg" },
  { id: "rules-truefalse-bg", text: "Вярно или Грешно. Виждаш дума и превод. Реши дали преводът е верен или не! Получаваш 10 точки за правилен отговор и губиш 5 за грешен.", lang: "bg" },
  { id: "rules-scramble-bg", text: "Уърд Скрамбъл. Буквите на дума са разбъркани. Натискай ги в правилния ред, за да изпишеш превода! Получаваш 20 точки за всяка дума и губиш 3 за грешно натискане.", lang: "bg" },
  { id: "rules-levels-bg", text: "Всеки остров има 3 нива. Открий — научи нови думи. Използвай — приложи ги в контекст. Оцелей — истинска комуникация! Завърши 2 игри на ниво, за да отключиш следващото.", lang: "bg" },
  { id: "rules-fillscene-bg", text: "Попълни сцената. Довърши изреченията в реални ситуации. Избери правилната дума за всяко празно място! Получаваш 15 точки за верен отговор и губиш 5 за грешен.", lang: "bg" },
  { id: "rules-sayit-bg", text: "Кажи го! Упражнявай произношението си на глас. Играта слуша и проверява дали казваш думата правилно! Получаваш 20 точки за добро произношение.", lang: "bg" },
  { id: "rules-listenrepeat-bg", text: "Слушай и повтори. Чуй как Професор Глоуб казва фраза, после я повтори! Получаваш 15 точки за добро повторение.", lang: "bg" },
  { id: "rules-npctalk-bg", text: "Ен Пи Си разговор. Разговаряй с герой чрез изкуствен интелект! Води истински разговор, за да упражниш уменията си. Получаваш 10 точки за всеки отговор и 50 бонус ако завършиш чата!", lang: "bg" },
  { id: "rules-unlock-bg", text: "Печели достатъчно точки, за да отключиш нови острови. Всеки следващ остров струва 500 точки повече от предишния!", lang: "bg" },
  { id: "rules-lang-bg", text: "Можеш да превключваш между английски, български и испански с бутона за език горе вдясно.", lang: "bg" },
];

// Professor Globe rules (EN)
const RULES_EN = [
  { id: "rules-greeting-en", text: "Hi there! Let me explain how the game works.", lang: "en" },
  { id: "rules-islands-en", text: "Tap an island to choose a game. Each island is a topic. Earn points to unlock new ones!", lang: "en" },
  { id: "rules-stats-en", text: "The top bar shows your progress. The star is your points. The lightning bolt is energy that refills over time. The fire shows your daily streak. The checkmarks are your daily goals, and the language button switches between Bulgarian and English.", lang: "en" },
  { id: "rules-memory-en", text: "Memory Match. Flip cards to find matching word pairs. You get 10 points for a correct match, lose 2 for a wrong one, and earn 50 bonus points for completing all pairs!", lang: "en" },
  { id: "rules-quiz-en", text: "Word Quiz. Listen to a word and pick the right translation. You earn 15 points for a correct answer, lose 5 for a wrong one, and get 60 bonus points for finishing!", lang: "en" },
  { id: "rules-truefalse-en", text: "True or False. You see a word and a translation. Decide if the translation is correct or not! You earn 10 points for a right answer and lose 5 for a wrong one.", lang: "en" },
  { id: "rules-scramble-en", text: "Word Scramble. The letters of a word are mixed up. Tap them in the right order to spell the translation! You earn 20 points per word and lose 3 for each wrong tap.", lang: "en" },
  { id: "rules-levels-en", text: "Each island has 3 levels. Discover — learn new words. Use — apply them in context. Survive — real communication! Complete 2 games per level to unlock the next one.", lang: "en" },
  { id: "rules-fillscene-en", text: "Fill the Scene. Complete sentences in real situations. Pick the right word for each blank! You earn 15 points for a correct answer and lose 5 for a wrong one.", lang: "en" },
  { id: "rules-sayit-en", text: "Say It! Practice saying words out loud. The game listens and checks your pronunciation! You earn 20 points for good pronunciation.", lang: "en" },
  { id: "rules-listenrepeat-en", text: "Listen and Repeat. Listen to Professor Globe say a phrase, then repeat it yourself! You earn 15 points for a good repeat.", lang: "en" },
  { id: "rules-npctalk-en", text: "NPC Talk. Chat with a character using AI! Have a real conversation to practice your skills. You earn 10 points for each reply and 50 bonus points for completing the chat!", lang: "en" },
  { id: "rules-unlock-en", text: "Earn enough points to unlock new islands. Each new island costs 500 more points than the previous one!", lang: "en" },
  { id: "rules-lang-en", text: "You can switch between English, Bulgarian, and Spanish using the language button in the top right corner.", lang: "en" },
];

const OUTPUT_DIR = path.join(__dirname, "..", "public", "audio");

async function synthesize(text, lang, voiceName) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: LANG_CODES[lang], name: voiceName },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return Buffer.from(data.audioContent, "base64");
}

async function generateFile(id, text, lang, subdir) {
  const voiceName = VOICES[lang];
  const dir = path.join(OUTPUT_DIR, subdir || lang);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${id}.mp3`);

  // Skip if already exists
  if (fs.existsSync(filePath)) {
    console.log(`  SKIP ${filePath}`);
    return;
  }

  const audio = await synthesize(text, lang, voiceName);
  fs.writeFileSync(filePath, audio);
  console.log(`  OK   ${filePath} (${audio.length} bytes)`);
}

// Rate limiting: max ~8 requests per second
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== Generating word audio files ===\n");

  let count = 0;

  // Generate all words in all 3 languages
  for (const word of WORDS) {
    for (const lang of ["bg", "en", "es"]) {
      await generateFile(word.id, word[lang], lang);
      count++;
      await sleep(120); // rate limit
    }
  }

  console.log(`\n=== Generating story phrases ===\n`);
  for (const p of STORY_PHRASES) {
    await generateFile(p.id, p.text, p.lang, "phrases");
    count++;
    await sleep(120);
  }

  console.log(`\n=== Generating motivational phrases ===\n`);
  for (const p of MOTIVATIONAL) {
    await generateFile(p.id, p.text, p.lang, "phrases");
    count++;
    await sleep(120);
  }

  console.log(`\n=== Generating rules (BG) ===\n`);
  for (const p of RULES_BG) {
    await generateFile(p.id, p.text, p.lang, "phrases");
    count++;
    await sleep(120);
  }

  console.log(`\n=== Generating rules (EN) ===\n`);
  for (const p of RULES_EN) {
    await generateFile(p.id, p.text, p.lang, "phrases");
    count++;
    await sleep(120);
  }

  console.log(`\n✅ Done! Generated ${count} audio files.`);
}

main().catch(console.error);
