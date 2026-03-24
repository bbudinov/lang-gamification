import { NextRequest, NextResponse } from "next/server";

const GOOGLE_TTS_API_KEY = "AIzaSyB21_R92leVkpQm_IUpxEF73b4sAl3-2F8";

const VOICES: Record<string, { languageCode: string; name: string }> = {
  en: { languageCode: "en-US", name: "en-US-Chirp3-HD-Puck" },
  bg: { languageCode: "bg-BG", name: "bg-BG-Standard-B" },
  es: { languageCode: "es-ES", name: "es-ES-Chirp3-HD-Puck" },
  it: { languageCode: "it-IT", name: "it-IT-Standard-C" },
  de: { languageCode: "de-DE", name: "de-DE-Standard-B" },
  fr: { languageCode: "fr-FR", name: "fr-FR-Standard-B" },
};

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json();

    if (!text || !language) {
      return NextResponse.json({ error: "Missing text or language" }, { status: 400 });
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
