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

export function useSpeechRecognition(language: string = "en", opts?: { continuous?: boolean; silenceMs?: number }): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedManuallyRef = useRef(false);
  const accumulatedTranscriptRef = useRef("");
  const [isSupported, setIsSupported] = useState(false);

  // Detect support on client only (SSR has no window)
  useEffect(() => {
    setIsSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);
  const continuousMode = opts?.continuous ?? false;
  const silenceMs = opts?.silenceMs ?? 1500;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const start = useCallback(() => {
    if (!isSupported) return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    setTranscript("");
    setConfidence(0);
    stoppedManuallyRef.current = false;
    accumulatedTranscriptRef.current = "";

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.lang = LANG_MAP[language] || language;
    recognition.continuous = continuousMode;
    recognition.interimResults = continuousMode;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Separate final (confirmed) from interim (still changing) results
      let finalParts = "";
      let interimPart = "";
      let lastConfidence = 0;
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalParts += event.results[i][0].transcript;
          lastConfidence = event.results[i][0].confidence;
        } else {
          interimPart += event.results[i][0].transcript;
        }
      }

      // Accumulate only final parts across recognition restarts
      if (finalParts) {
        accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + " " + finalParts).trim();
      }

      // Display = accumulated finals + current interim
      const display = (accumulatedTranscriptRef.current + " " + interimPart).trim();
      setTranscript(display);
      if (lastConfidence > 0) setConfidence(lastConfidence);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
      // In continuous mode, auto-restart on error (unless manually stopped)
      if (continuousMode && !stoppedManuallyRef.current) {
        accumulatedTranscriptRef.current = accumulatedTranscriptRef.current || "";
        setTimeout(() => {
          if (!stoppedManuallyRef.current) {
            try { recognition.start(); } catch { setIsListening(false); }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // In continuous mode, auto-restart if not manually stopped
      if (continuousMode && !stoppedManuallyRef.current) {
        // accumulatedTranscriptRef already has all final parts — just restart
        setTimeout(() => {
          if (!stoppedManuallyRef.current && recognitionRef.current) {
            try { recognition.start(); } catch { setIsListening(false); }
          }
        }, 100);
      } else {
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language, continuousMode, silenceMs]);

  const stop = useCallback(() => {
    stoppedManuallyRef.current = true;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    accumulatedTranscriptRef.current = "";
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
