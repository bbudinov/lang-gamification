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

// ─── UI Sound Effects (Web Audio API) ─────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Short "pop" sound for tapping an island */
export function playPopSound(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

/** Two-tone "ding" for unlocking */
export function playDingSound(): void {
  try {
    const ctx = getAudioContext();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.value = 523;
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 784;
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.25);
  } catch {}
}

/** Short "buzz" for wrong answer */
export function playBuzzSound(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

/** Short "whoosh" for navigation */
export function playWhooshSound(): void {
  try {
    const ctx = getAudioContext();
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.15);
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + 0.15);
  } catch {}
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

// Male voice name hints — Professor Globe should always sound male
const MALE_HINTS = ["daniel", "aaron", "guy", "james", "thomas", "male", "puck", "ivan", "jorge", "andrés"];
const FEMALE_HINTS = ["samantha", "karen", "fiona", "moira", "female", "woman", "girl", "alice", "victoria", "kate", "tessa"];

function isMaleVoice(v: SpeechSynthesisVoice): boolean {
  const n = v.name.toLowerCase();
  if (MALE_HINTS.some((h) => n.includes(h))) return true;
  if (FEMALE_HINTS.some((h) => n.includes(h))) return false;
  return false; // unknown
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

  // Prefer male voices for Professor Globe
  const males = matching.filter(isMaleVoice);

  // Try male Google voice first
  const maleGoogle = males.find((v) => v.name.toLowerCase().includes("google"));
  if (maleGoogle) return maleGoogle;

  // Any male premium voice
  const malePremium = males.find((v) => !v.localService);
  if (malePremium) return malePremium;

  // Any male voice
  if (males.length > 0) return males[0];

  // Fallback: any Google voice
  const google = matching.find((v) => v.name.toLowerCase().includes("google"));
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
  utterance.pitch = 0.9;
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
  utterance.pitch = 0.9;
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
    utterance.pitch = 0.9;
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
