import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseResponse } from "@/lib/parseResponse";

const SYSTEM_PROMPT = `You are a helpful shopping assistant. Answer the user's question by recommending specific products and brands. Be specific — name real brands and products. When you recommend a brand, explain briefly why it stands out. Format your response naturally, as if you're advising a knowledgeable friend.`;

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const trimmedQuery = query.trim().slice(0, 300);

    // ── Run Claude and Gemini in parallel ────────────────────────────────────
    const [claudeResult, geminiResult] = await Promise.allSettled([
      queryClaude(trimmedQuery),
      queryGemini(trimmedQuery),
    ]);

    const results = [];

    if (claudeResult.status === "fulfilled") {
      results.push(parseResponse("Claude", claudeResult.value));
    } else {
      console.error("Claude error:", claudeResult.reason);
      results.push({
        engine: "Claude",
        mentions: [],
        rawText: "",
        error: String(claudeResult.reason?.message ?? "Claude request failed"),
      });
    }

    if (geminiResult.status === "fulfilled") {
      results.push(parseResponse("Gemini", geminiResult.value));
    } else {
      console.error("Gemini error:", geminiResult.reason);
      results.push({
        engine: "Gemini",
        mentions: [],
        rawText: "",
        error: String(geminiResult.reason?.message ?? "Gemini request failed"),
      });
    }

    return NextResponse.json({ results, query: trimmedQuery });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Claude ────────────────────────────────────────────────────────────────────

async function queryClaude(query: string): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: query }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

// ── Gemini ────────────────────────────────────────────────────────────────────

async function queryGemini(query: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(query);
  const response = result.response;
  return response.text();
}
