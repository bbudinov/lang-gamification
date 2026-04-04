const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GOOGLE_TTS_API_KEY || "AIzaSyB21_R92leVkpQm_IUpxEF73b4sAl3-2F8";
const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

const VOICES = {
  it: "it-IT-Wavenet-A",
  de: "de-DE-Wavenet-A",
  fr: "fr-FR-Wavenet-A",
};

const LANG_CODES = {
  it: "it-IT",
  de: "de-DE",
  fr: "fr-FR",
};

const OUTPUT_DIR = path.join(__dirname, "..", "public", "audio");

// Parse words.ts to extract all word entries with id, it, de, fr
function parseWords() {
  const filePath = path.join(__dirname, "..", "src", "data", "words.ts");
  const content = fs.readFileSync(filePath, "utf-8");

  const words = [];
  // Match patterns like: { id: "a1", en: "cat", bg: "котка", es: "gato", it: "gatto", de: "Katze", fr: "chat", ...}
  const regex = /\{\s*id:\s*"([^"]+)"[^}]*?,\s*it:\s*"([^"]*)"[^}]*?,\s*de:\s*"([^"]*)"[^}]*?,\s*fr:\s*"([^"]*)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    // Only include actual word entries (letter prefix + number), skip topic/NPC names
    if (/^[a-z]+\d+$/.test(id)) {
      words.push({
        id,
        it: match[2],
        de: match[3],
        fr: match[4],
      });
    }
  }

  return words;
}

async function synthesize(text, lang, voiceName) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: LANG_CODES[lang], name: voiceName },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return Buffer.from(data.audioContent, "base64");
}

async function generateFile(id, text, lang) {
  const voiceName = VOICES[lang];
  const dir = path.join(OUTPUT_DIR, lang);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${id}.mp3`);

  // Skip if already exists
  if (fs.existsSync(filePath)) {
    return "skip";
  }

  const audio = await synthesize(text, lang, voiceName);
  fs.writeFileSync(filePath, audio);
  return audio.length;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const words = parseWords();
  console.log(`Found ${words.length} words to process`);
  console.log(`Languages: it, de, fr`);
  console.log(`Total files to generate: ${words.length * 3}\n`);

  const langs = ["it", "de", "fr"];
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const lang of langs) {
    console.log(`\n=== Generating ${lang.toUpperCase()} (${VOICES[lang]}) ===\n`);
    let langCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const text = word[lang];

      if (!text) {
        console.log(`  EMPTY ${word.id} — no ${lang} translation`);
        errors++;
        continue;
      }

      try {
        const result = await generateFile(word.id, text, lang);
        if (result === "skip") {
          skipped++;
        } else {
          generated++;
          langCount++;
          if (langCount % 50 === 0) {
            console.log(`  [${lang}] ${langCount}/${words.length} generated...`);
          }
        }
        await sleep(150); // rate limit
      } catch (err) {
        console.error(`  ERROR ${word.id} (${lang}): ${err.message}`);
        errors++;
        // Wait longer on error (might be rate limit)
        await sleep(2000);
      }
    }

    console.log(`  [${lang}] Done! ${langCount} files generated.`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Generated: ${generated}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Done!`);
}

main().catch(console.error);
