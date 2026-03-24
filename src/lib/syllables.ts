/**
 * Syllable breakdown utilities for pronunciation feedback.
 * Splits words into syllables and provides phonetic hints.
 */

import type { Language } from "@/types";

export interface SyllableInfo {
  text: string;        // The syllable text (e.g. "hip")
  phonetic: string;    // Simplified phonetic (e.g. "hip")
  stressed: boolean;   // Whether this is the stressed syllable
}

// Manual syllable data for known words (English).
// For words not listed, we use a heuristic splitter.
const SYLLABLE_DATA: Record<string, SyllableInfo[]> = {
  // Animals
  cat: [{ text: "cat", phonetic: "kat", stressed: true }],
  dog: [{ text: "dog", phonetic: "dawg", stressed: true }],
  bird: [{ text: "bird", phonetic: "burd", stressed: true }],
  fish: [{ text: "fish", phonetic: "fish", stressed: true }],
  horse: [{ text: "horse", phonetic: "hors", stressed: true }],
  bear: [{ text: "bear", phonetic: "behr", stressed: true }],
  rabbit: [
    { text: "rab", phonetic: "rab", stressed: true },
    { text: "bit", phonetic: "bit", stressed: false },
  ],
  elephant: [
    { text: "el", phonetic: "el", stressed: true },
    { text: "e", phonetic: "uh", stressed: false },
    { text: "phant", phonetic: "fuhnt", stressed: false },
  ],
  lion: [
    { text: "li", phonetic: "ly", stressed: true },
    { text: "on", phonetic: "uhn", stressed: false },
  ],
  monkey: [
    { text: "mon", phonetic: "muhn", stressed: true },
    { text: "key", phonetic: "kee", stressed: false },
  ],
  turtle: [
    { text: "tur", phonetic: "tur", stressed: true },
    { text: "tle", phonetic: "tuhl", stressed: false },
  ],
  penguin: [
    { text: "pen", phonetic: "pen", stressed: true },
    { text: "guin", phonetic: "gwin", stressed: false },
  ],
  dolphin: [
    { text: "dol", phonetic: "dawl", stressed: true },
    { text: "phin", phonetic: "fin", stressed: false },
  ],
  giraffe: [
    { text: "gi", phonetic: "juh", stressed: false },
    { text: "raffe", phonetic: "raf", stressed: true },
  ],
  crocodile: [
    { text: "croc", phonetic: "krok", stressed: true },
    { text: "o", phonetic: "uh", stressed: false },
    { text: "dile", phonetic: "dyl", stressed: false },
  ],
  // Colors
  red: [{ text: "red", phonetic: "red", stressed: true }],
  blue: [{ text: "blue", phonetic: "bloo", stressed: true }],
  green: [{ text: "green", phonetic: "green", stressed: true }],
  yellow: [
    { text: "yel", phonetic: "yel", stressed: true },
    { text: "low", phonetic: "loh", stressed: false },
  ],
  white: [{ text: "white", phonetic: "wyt", stressed: true }],
  black: [{ text: "black", phonetic: "blak", stressed: true }],
  orange: [
    { text: "or", phonetic: "or", stressed: true },
    { text: "ange", phonetic: "inj", stressed: false },
  ],
  purple: [
    { text: "pur", phonetic: "pur", stressed: true },
    { text: "ple", phonetic: "puhl", stressed: false },
  ],
  pink: [{ text: "pink", phonetic: "pink", stressed: true }],
  brown: [{ text: "brown", phonetic: "brawn", stressed: true }],
  // Food
  bread: [{ text: "bread", phonetic: "bred", stressed: true }],
  water: [
    { text: "wa", phonetic: "waw", stressed: true },
    { text: "ter", phonetic: "tur", stressed: false },
  ],
  milk: [{ text: "milk", phonetic: "milk", stressed: true }],
  apple: [
    { text: "ap", phonetic: "ap", stressed: true },
    { text: "ple", phonetic: "puhl", stressed: false },
  ],
  cheese: [{ text: "cheese", phonetic: "cheez", stressed: true }],
  egg: [{ text: "egg", phonetic: "eg", stressed: true }],
  rice: [{ text: "rice", phonetic: "rys", stressed: true }],
  meat: [{ text: "meat", phonetic: "meet", stressed: true }],
  banana: [
    { text: "ba", phonetic: "buh", stressed: false },
    { text: "na", phonetic: "na", stressed: true },
    { text: "na", phonetic: "nuh", stressed: false },
  ],
  cake: [{ text: "cake", phonetic: "kayk", stressed: true }],
  chicken: [
    { text: "chick", phonetic: "chik", stressed: true },
    { text: "en", phonetic: "uhn", stressed: false },
  ],
  pizza: [
    { text: "piz", phonetic: "peet", stressed: true },
    { text: "za", phonetic: "suh", stressed: false },
  ],
  soup: [{ text: "soup", phonetic: "soop", stressed: true }],
  // Numbers
  one: [{ text: "one", phonetic: "wuhn", stressed: true }],
  two: [{ text: "two", phonetic: "too", stressed: true }],
  three: [{ text: "three", phonetic: "three", stressed: true }],
  four: [{ text: "four", phonetic: "for", stressed: true }],
  five: [{ text: "five", phonetic: "fyv", stressed: true }],
  six: [{ text: "six", phonetic: "siks", stressed: true }],
  seven: [
    { text: "sev", phonetic: "sev", stressed: true },
    { text: "en", phonetic: "uhn", stressed: false },
  ],
  eight: [{ text: "eight", phonetic: "ayt", stressed: true }],
  nine: [{ text: "nine", phonetic: "nyn", stressed: true }],
  ten: [{ text: "ten", phonetic: "ten", stressed: true }],
  // Family
  mother: [
    { text: "moth", phonetic: "muhth", stressed: true },
    { text: "er", phonetic: "ur", stressed: false },
  ],
  father: [
    { text: "fa", phonetic: "fah", stressed: true },
    { text: "ther", phonetic: "thur", stressed: false },
  ],
  sister: [
    { text: "sis", phonetic: "sis", stressed: true },
    { text: "ter", phonetic: "tur", stressed: false },
  ],
  brother: [
    { text: "broth", phonetic: "bruhth", stressed: true },
    { text: "er", phonetic: "ur", stressed: false },
  ],
  baby: [
    { text: "ba", phonetic: "bay", stressed: true },
    { text: "by", phonetic: "bee", stressed: false },
  ],
  grandmother: [
    { text: "grand", phonetic: "grand", stressed: true },
    { text: "moth", phonetic: "muhth", stressed: false },
    { text: "er", phonetic: "ur", stressed: false },
  ],
  grandfather: [
    { text: "grand", phonetic: "grand", stressed: true },
    { text: "fa", phonetic: "fah", stressed: false },
    { text: "ther", phonetic: "thur", stressed: false },
  ],
  friend: [{ text: "friend", phonetic: "frend", stressed: true }],
  // Body
  head: [{ text: "head", phonetic: "hed", stressed: true }],
  hand: [{ text: "hand", phonetic: "hand", stressed: true }],
  foot: [{ text: "foot", phonetic: "fuut", stressed: true }],
  eye: [{ text: "eye", phonetic: "ay", stressed: true }],
  ear: [{ text: "ear", phonetic: "eer", stressed: true }],
  nose: [{ text: "nose", phonetic: "nohz", stressed: true }],
  mouth: [{ text: "mouth", phonetic: "mawth", stressed: true }],
  heart: [{ text: "heart", phonetic: "hart", stressed: true }],
  finger: [
    { text: "fin", phonetic: "fin", stressed: true },
    { text: "ger", phonetic: "gur", stressed: false },
  ],
  leg: [{ text: "leg", phonetic: "leg", stressed: true }],
  // Weather
  sun: [{ text: "sun", phonetic: "suhn", stressed: true }],
  rain: [{ text: "rain", phonetic: "rayn", stressed: true }],
  snow: [{ text: "snow", phonetic: "snoh", stressed: true }],
  wind: [{ text: "wind", phonetic: "wind", stressed: true }],
  cloud: [{ text: "cloud", phonetic: "klawd", stressed: true }],
  storm: [{ text: "storm", phonetic: "storm", stressed: true }],
  rainbow: [
    { text: "rain", phonetic: "rayn", stressed: true },
    { text: "bow", phonetic: "boh", stressed: false },
  ],
  thunder: [
    { text: "thun", phonetic: "thuhn", stressed: true },
    { text: "der", phonetic: "dur", stressed: false },
  ],
  lightning: [
    { text: "light", phonetic: "lyt", stressed: true },
    { text: "ning", phonetic: "ning", stressed: false },
  ],
  temperature: [
    { text: "tem", phonetic: "tem", stressed: true },
    { text: "per", phonetic: "pur", stressed: false },
    { text: "a", phonetic: "uh", stressed: false },
    { text: "ture", phonetic: "chur", stressed: false },
  ],
};

/**
 * Heuristic syllable splitter for English words not in our dictionary.
 * Not perfect, but good enough for simple words.
 */
function heuristicSplit(word: string): SyllableInfo[] {
  const w = word.toLowerCase();
  if (w.length <= 3) {
    return [{ text: w, phonetic: w, stressed: true }];
  }

  const vowels = "aeiouy";
  const syllables: string[] = [];
  let current = "";

  for (let i = 0; i < w.length; i++) {
    current += w[i];
    const isVowel = vowels.includes(w[i]);
    const nextIsConsonant = i + 1 < w.length && !vowels.includes(w[i + 1]);
    const nextNextIsVowel = i + 2 < w.length && vowels.includes(w[i + 2]);

    if (isVowel && nextIsConsonant && nextNextIsVowel && current.length >= 2) {
      syllables.push(current);
      current = "";
    }
  }
  if (current) {
    if (syllables.length > 0 && current.length <= 1) {
      syllables[syllables.length - 1] += current;
    } else {
      syllables.push(current);
    }
  }

  // Remove trailing silent 'e' syllable
  if (syllables.length > 1 && syllables[syllables.length - 1] === "e") {
    syllables[syllables.length - 2] += "e";
    syllables.pop();
  }

  return syllables.map((s, i) => ({
    text: s,
    phonetic: s,
    stressed: i === 0, // Default: stress first syllable
  }));
}

/**
 * Get syllable breakdown for a word.
 * Currently supports English; returns basic split for other languages.
 */
export function getSyllables(word: string, _lang: Language = "en"): SyllableInfo[] {
  const key = word.toLowerCase().trim();
  if (SYLLABLE_DATA[key]) return SYLLABLE_DATA[key];
  return heuristicSplit(key);
}

/**
 * Score each syllable by comparing spoken vs expected.
 * Returns per-syllable scores (0-100).
 */
export function scoreSyllables(
  spoken: string,
  syllables: SyllableInfo[]
): { scores: number[]; overall: number } {
  const spokenLower = spoken.toLowerCase().trim();
  const expectedFull = syllables.map((s) => s.text).join("");

  // If perfect match, all 100
  if (spokenLower === expectedFull) {
    return { scores: syllables.map(() => 100), overall: 100 };
  }

  // Try to align spoken text to syllables proportionally
  const totalLen = expectedFull.length;
  const scores: number[] = [];
  let spokenPos = 0;

  for (const syl of syllables) {
    const sylLen = syl.text.length;
    const proportion = sylLen / totalLen;
    const spokenChunkLen = Math.max(1, Math.round(proportion * spokenLower.length));
    const spokenChunk = spokenLower.slice(spokenPos, spokenPos + spokenChunkLen);
    spokenPos += spokenChunkLen;

    // Levenshtein-based similarity for this syllable
    const sim = syllableSimilarity(spokenChunk, syl.text);
    scores.push(Math.round(sim * 100));
  }

  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { scores, overall };
}

function syllableSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const len1 = a.length;
  const len2 = b.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return 1 - matrix[len1][len2] / Math.max(len1, len2);
}
