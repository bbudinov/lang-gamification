import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rate limiting: simple in-memory counter (resets on cold start)
let requestCount = 0;
let windowStart = Date.now();
const MAX_REQUESTS_PER_MINUTE = 30;

export async function POST(req: NextRequest) {
  // Rate limit check
  const now = Date.now();
  if (now - windowStart > 60_000) {
    requestCount = 0;
    windowStart = now;
  }
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }
  requestCount++;

  try {
    const { system, messages, maxTokens = 150 } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: Math.min(maxTokens, 300), // Cap at 300 to control costs
      system: system || "You are a friendly language learning assistant for kids aged 6-10. Keep responses short (under 15 words), encouraging, and age-appropriate. Never be harsh or punishing.",
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      text,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { error: "AI service temporarily unavailable" },
      { status: 500 }
    );
  }
}
