import type { Language } from "@/types";

// ─── Audio player (pre-generated MP3 files) ─────────────────────

let currentAudio: HTMLAudioElement | null = null;

/** Stop any currently playing audio */
export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  // Also stop Web Speech API if it was used
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** Play a pre-generated word audio file: /audio/{lang}/{wordId}.mp3 */
export function playWordAudio(wordId: string, language: Language): void {
  stopAudio();
  const audio = new Audio(`/audio/${language}/${wordId}.mp3`);
  currentAudio = audio;
  audio.play().catch(() => {});
}

/** Play a pre-generated phrase audio file: /audio/phrases/{phraseId}.mp3 */
export function playPhraseAudio(phraseId: string): void {
  stopAudio();
  const audio = new Audio(`/audio/phrases/${phraseId}.mp3`);
  currentAudio = audio;
  audio.play().catch(() => {});
}

/** Play a word audio and wait for it to finish */
export function playWordAudioAndWait(
  wordId: string,
  language: Language,
  maxWaitMs = 10000
): Promise<void> {
  return new Promise((resolve) => {
    stopAudio();
    const audio = new Audio(`/audio/${language}/${wordId}.mp3`);
    currentAudio = audio;

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    audio.onended = done;
    audio.onerror = done;
    setTimeout(done, maxWaitMs);
    audio.play().catch(done);
  });
}

/** Play a phrase audio and wait for it to finish */
export function playPhraseAudioAndWait(
  phraseId: string,
  maxWaitMs = 20000
): Promise<void> {
  return new Promise((resolve) => {
    stopAudio();
    const audio = new Audio(`/audio/phrases/${phraseId}.mp3`);
    currentAudio = audio;

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    audio.onended = done;
    audio.onerror = done;
    setTimeout(done, maxWaitMs);
    audio.play().catch(done);
  });
}

// ─── Legacy Web Speech API (kept as fallback) ────────────────────

const LANG_MAP: Record<Language, string> = {
  en: "en-US",
  bg: "bg-BG",
  es: "es-ES",
};

const RATE_MAP: Record<Language, number> = {
  en: 0.9,
  bg: 0.75,
  es: 0.85,
};

const VOICE_STORAGE_KEY = "langworld-voice-pref";

let voicesLoaded = false;
let cachedVoices: SpeechSynthesisVoice[] = [];

function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (cachedVoices.length > 0) {
      resolve(cachedVoices);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      cachedVoices = voices;
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
        cachedVoices = window.speechSynthesis.getVoices();
        resolve(cachedVoices);
      },
      { once: true }
    );
  });
}

export async function getVoicesForLanguage(
  language: Language
): Promise<{ name: string; lang: string }[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return [];
  const voices = await ensureVoices();
  const langPrefix = LANG_MAP[language].split("-")[0];
  return voices
    .filter((v) => v.lang.startsWith(langPrefix))
    .map((v) => ({ name: v.name, lang: v.lang }));
}

export function setPreferredVoice(language: Language, voiceName: string): void {
  if (typeof window === "undefined") return;
  const prefs = JSON.parse(localStorage.getItem(VOICE_STORAGE_KEY) || "{}");
  prefs[language] = voiceName;
  localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(prefs));
}

function getPreferredVoiceName(language: Language): string | null {
  if (typeof window === "undefined") return null;
  const prefs = JSON.parse(localStorage.getItem(VOICE_STORAGE_KEY) || "{}");
  return prefs[language] || null;
}

function findBestVoice(
  voices: SpeechSynthesisVoice[],
  language: Language
): SpeechSynthesisVoice | null {
  const locale = LANG_MAP[language];
  const langPrefix = locale.split("-")[0];
  const matching = voices.filter((v) => v.lang.startsWith(langPrefix));
  if (matching.length === 0) return null;

  const preferredName = getPreferredVoiceName(language);
  if (preferredName) {
    const preferred = matching.find((v) => v.name === preferredName);
    if (preferred) return preferred;
  }

  const google = matching.find((v) =>
    v.name.toLowerCase().includes("google")
  );
  if (google) return google;

  const premium = matching.find((v) => !v.localService);
  if (premium) return premium;

  const exact = matching.find((v) => v.lang === locale);
  if (exact) return exact;

  return matching[0];
}

/** Cancel any ongoing speech (legacy alias) */
export function stopSpeech(): void {
  stopAudio();
}

export function initSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  ensureVoices();
}

/** Speak text using Web Speech API (fallback for dynamic text) */
export async function speak(text: string, language: Language): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const voices = await ensureVoices();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_MAP[language];
  utterance.rate = RATE_MAP[language];
  utterance.pitch = 1.05;
  utterance.volume = 1;

  const voice = findBestVoice(voices, language);
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

export async function speakWithVoice(
  text: string,
  language: Language,
  voiceName: string
): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const voices = await ensureVoices();
  const langPrefix = LANG_MAP[language].split("-")[0];
  const voice = voices.find(
    (v) => v.name === voiceName && v.lang.startsWith(langPrefix)
  );

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_MAP[language];
  utterance.rate = RATE_MAP[language];
  utterance.pitch = 1.05;
  utterance.volume = 1;
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

export function speakAndWait(
  text: string,
  language: Language,
  maxWaitMs = 15000
): Promise<void> {
  return new Promise(async (resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    const voices = await ensureVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[language];
    utterance.rate = RATE_MAP[language];
    utterance.pitch = 1.05;
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
