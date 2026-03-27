import { NextRequest, NextResponse } from "next/server";

const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY || "";

const VOICES: Record<string, { languageCode: string; name: string }> = {
  en: { languageCode: "en-US", name: "en-US-Chirp3-HD-Puck" },
  bg: { languageCode: "bg-BG", name: "bg-BG-Standard-B" },
  es: { languageCode: "es-ES", name: "es-ES-Chirp3-HD-Puck" },
  it: { languageCode: "it-IT", name: "it-IT-Standard-C" },
  de: { languageCode: "de-DE", name: "de-DE-Standard-B" },
  fr: { languageCode: "fr-FR", name: "fr-FR-Standard-B" },
};

// Rate limiting: simple in-memory counter (resets on cold start)
let ttsRequestCount = 0;
let ttsWindowStart = Date.now();
const TTS_MAX_REQUESTS_PER_MINUTE = 60;

const ALLOWED_LANGUAGES = ["en", "bg", "es", "it", "de", "fr"];

export async function POST(request: NextRequest) {
  // Origin validation
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";
  const allowedOrigins = ["http://localhost:3002", "https://langworld.vercel.app"];
  const isAllowed = allowedOrigins.some(o => origin === o || referer.startsWith(o));
  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit check
  const now = Date.now();
  if (now - ttsWindowStart > 60000) { ttsRequestCount = 0; ttsWindowStart = now; }
  ttsRequestCount++;
  if (ttsRequestCount > TTS_MAX_REQUESTS_PER_MINUTE) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { text, language } = await request.json();

    // Input validation
    if (!text || typeof text !== "string" || text.length > 500) {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }
    if (!language || !ALLOWED_LANGUAGES.includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    const voice = VOICES[language] || VOICES.en;

    const response = await fetch(
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

    if (!response.ok) {
      const err = await response.text();
      console.error("[TTS] Google API error:", err);
      return NextResponse.json({ error: "TTS failed" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ audioContent: data.audioContent });
  } catch (error) {
    console.error("[TTS] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
