/**
 * Client-side AI helper — calls /api/ai/chat endpoint.
 * All AI requests go through the server to keep the API key safe.
 */

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIResponse {
  text: string;
  usage: { input: number; output: number };
}

export async function askAI(
  messages: AIMessage[],
  system?: string,
  maxTokens?: number
): Promise<string> {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system, maxTokens }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.warn("AI error:", err.error);
      return "";
    }

    const data: AIResponse = await res.json();
    return data.text;
  } catch {
    console.warn("AI request failed");
    return "";
  }
}
