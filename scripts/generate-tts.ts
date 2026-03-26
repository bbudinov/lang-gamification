/**
 * Generate TTS MP3 files for all new words and phrases.
 *
 * Usage: npx tsx scripts/generate-tts.ts
 *
 * Generates files in /public/audio/{lang}/{wordId}.mp3
 * and /public/audio/phrases/sentence-{phraseId}-{lang}.mp3
 */

import * as fs from "fs";
import * as path from "path";

const GOOGLE_TTS_API_KEY = "AIzaSyB21_R92leVkpQm_IUpxEF73b4sAl3-2F8";

const VOICES: Record<string, { languageCode: string; name: string }> = {
  en: { languageCode: "en-US", name: "en-US-Chirp3-HD-Puck" },
  bg: { languageCode: "bg-BG", name: "bg-BG-Standard-B" },
  es: { languageCode: "es-ES", name: "es-ES-Chirp3-HD-Puck" },
};

const AUDIO_DIR = path.join(__dirname, "..", "public", "audio");
const LANGUAGES = ["en", "bg", "es"] as const;

// Rate limiting — Google TTS has limits
const DELAY_MS = 200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function synthesize(text: string, lang: string): Promise<Buffer | null> {
  const voice = VOICES[lang] || VOICES.en;
  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: voice.languageCode, name: voice.name },
          audioConfig: { audioEncoding: "MP3", speakingRate: 0.95, pitch: 0 },
        }),
      }
    );
    if (!res.ok) {
      console.error(`  [ERROR] ${lang}/${text}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return Buffer.from(data.audioContent, "base64");
  } catch (err) {
    console.error(`  [ERROR] ${lang}/${text}:`, err);
    return null;
  }
}

async function main() {
  // Dynamically import the data (TypeScript modules)
  // We'll read words.ts and phrases.ts directly
  const { topics } = await import("../src/data/words");
  const { phrases } = await import("../src/data/phrases");

  // Ensure directories exist
  for (const lang of LANGUAGES) {
    const dir = path.join(AUDIO_DIR, lang);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const phrasesDir = path.join(AUDIO_DIR, "phrases");
  if (!fs.existsSync(phrasesDir)) fs.mkdirSync(phrasesDir, { recursive: true });

  // Find which word audio files are MISSING
  const newTopicIds = topics
    .filter((t) => t.id.startsWith("ocean-") || t.id.startsWith("air-") || t.id.startsWith("underwater-") || ["botanical-garden", "central-park", "university", "art-museum", "history-museum", "legendary-places"].includes(t.id))
    .map((t) => t.id);

  const newTopics = topics.filter((t) => newTopicIds.includes(t.id));
  const newPhrases = phrases.filter((p) => newTopicIds.includes(p.topicId));

  console.log(`Found ${newTopics.length} new topics with ${newTopics.reduce((s, t) => s + t.words.length, 0)} words`);
  console.log(`Found ${newPhrases.length} new phrases`);

  // Generate word audio
  let wordCount = 0;
  let skipped = 0;
  for (const topic of newTopics) {
    console.log(`\n📦 Topic: ${topic.id} (${topic.words.length} words)`);
    for (const word of topic.words) {
      for (const lang of LANGUAGES) {
        const filePath = path.join(AUDIO_DIR, lang, `${word.id}.mp3`);
        if (fs.existsSync(filePath)) {
          skipped++;
          continue;
        }
        const text = word[lang as keyof typeof word] as string;
        if (!text) continue;

        const audio = await synthesize(text, lang);
        if (audio) {
          fs.writeFileSync(filePath, audio);
          wordCount++;
          process.stdout.write(`  ✅ ${lang}/${word.id}.mp3 (${text})\n`);
        }
        await sleep(DELAY_MS);
      }
    }
  }

  // Generate phrase audio (sentence with blank filled)
  let phraseCount = 0;
  console.log(`\n📝 Generating phrase audio...`);
  for (const phrase of newPhrases) {
    for (const lang of LANGUAGES) {
      const fileName = `sentence-${phrase.id}-${lang}.mp3`;
      const filePath = path.join(phrasesDir, fileName);
      if (fs.existsSync(filePath)) {
        skipped++;
        continue;
      }

      // Build full sentence (replace ___ with answer)
      const sentence = phrase.sentence[lang as keyof typeof phrase.sentence] as string;
      const answer = phrase.answer[lang as keyof typeof phrase.answer] as string;
      const fullSentence = sentence.replace("___", answer);

      const audio = await synthesize(fullSentence, lang);
      if (audio) {
        fs.writeFileSync(filePath, audio);
        phraseCount++;
        process.stdout.write(`  ✅ ${fileName}\n`);
      }
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n🎉 Done! Generated ${wordCount} word files + ${phraseCount} phrase files (${skipped} skipped)`);
}

main().catch(console.error);
