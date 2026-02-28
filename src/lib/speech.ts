import type { Language } from "@/types";

const LANG_MAP: Record<Language, string> = {
  en: "en-US",
  bg: "bg-BG",
  es: "es-ES",
};

let voicesLoaded = false;

function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      resolve(voices);
      return;
    }
    if (voicesLoaded) {
      resolve(voices);
      return;
    }
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        voicesLoaded = true;
        resolve(window.speechSynthesis.getVoices());
      },
      { once: true }
    );
  });
}

function findBestVoice(
  voices: SpeechSynthesisVoice[],
  language: Language
): SpeechSynthesisVoice | null {
  const locale = LANG_MAP[language];
  const langPrefix = locale.split("-")[0];

  const matching = voices.filter((v) => v.lang.startsWith(langPrefix));
  if (matching.length === 0) return null;

  // Prefer Google voices (higher quality, especially on Android)
  const google = matching.find((v) =>
    v.name.toLowerCase().includes("google")
  );
  if (google) return google;

  // Prefer exact locale match (e.g. bg-BG over bg)
  const exact = matching.find((v) => v.lang === locale);
  if (exact) return exact;

  return matching[0];
}

// Call on app start (from splash screen) to preload voices
export function initSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  ensureVoices();
}

export async function speak(text: string, language: Language): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const voices = await ensureVoices();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_MAP[language];
  utterance.rate = 0.85;
  utterance.pitch = 1.1;
  utterance.volume = 1;

  const voice = findBestVoice(voices, language);
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

/**
 * Speak text and return a promise that resolves when speech ends.
 * Used when we need to wait for speech to finish before navigating.
 */
export function speakAndWait(
  text: string,
  language: Language,
  maxWaitMs = 3000
): Promise<void> {
  return new Promise(async (resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const voices = await ensureVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[language];
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    const voice = findBestVoice(voices, language);
    if (voice) utterance.voice = voice;

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    utterance.onend = done;
    utterance.onerror = done;
    setTimeout(done, maxWaitMs);

    window.speechSynthesis.speak(utterance);
  });
}
