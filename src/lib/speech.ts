import type { Language } from "@/types";

const LANG_MAP: Record<Language, string> = {
  en: "en-US",
  bg: "bg-BG",
  es: "es-ES",
};

export function speak(text: string, language: Language): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_MAP[language];
  utterance.rate = 0.85;
  utterance.pitch = 1.1;

  const voices = window.speechSynthesis.getVoices();
  const langPrefix = LANG_MAP[language].split("-")[0];
  const voice = voices.find((v) => v.lang.startsWith(langPrefix));
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}
