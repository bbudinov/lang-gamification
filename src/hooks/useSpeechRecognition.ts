"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  confidence: number;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

// Language code mapping for Web Speech API
const LANG_MAP: Record<string, string> = {
  en: "en-US",
  bg: "bg-BG",
  es: "es-ES",
  it: "it-IT",
  de: "de-DE",
  fr: "fr-FR",
};

export function useSpeechRecognition(language: string = "en"): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!isSupported) return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setTranscript("");
    setConfidence(0);

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.lang = LANG_MAP[language] || language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0][0];
      setTranscript(result.transcript);
      setConfidence(result.confidence);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" and "aborted" are expected, don't treat as errors
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isListening, transcript, confidence, isSupported, start, stop };
}

/**
 * Levenshtein distance between two strings (case-insensitive).
 * Returns a similarity score 0-1 (1 = perfect match).
 */
export function similarityScore(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  return 1 - distance / Math.max(len1, len2);
}
