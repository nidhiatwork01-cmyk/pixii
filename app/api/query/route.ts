import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseResponse, EngineResult } from "@/lib/parseResponse";

const SYSTEM_PROMPT = `You are an Amazon product research tool. 
The user will give you a shopping query.
Return ONLY a valid JSON array of exactly 5 brand names 
that are most recommended for this query on Amazon.

Rules:
- Real brand names only (e.g. "Garden of Life", "Thorne", "NOW Foods")
- No product descriptors ("Unflavored", "Organic", "Powder")
- No generic words ("Alternatively", "Consider", "Options")  
- No explanation, no markdown, no extra text
- Just the raw JSON array

Example output:
["Garden of Life", "Thorne", "NOW Foods", "Naked Nutrition", "Orgain"]`;

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();
        if (!query || typeof query !== "string" || query.trim().length < 3) {
            return NextResponse.json({ error: "Invalid query" }, { status: 400 });
        }

        const trimmedQuery = query.trim().slice(0, 300);

        // ── Run Groq, Gemini, and Rainforest in parallel ──────────────────────────
        const [groqRes, geminiRes, rainforestRes] = await Promise.allSettled([
            queryGroq(trimmedQuery),
            queryGemini(trimmedQuery),
            queryRainforest(trimmedQuery),
        ]);

        const results: EngineResult[] = [];

        // Process AI Results
        if (groqRes.status === "fulfilled") {
            results.push(parseResponse("Llama (Groq)", groqRes.value));
        } else {
            results.push({ engine: "Llama (Groq)", mentions: [], rawText: "", error: "Groq failed" });
        }

        if (geminiRes.status === "fulfilled") {
            results.push(parseResponse("Gemini", geminiRes.value));
        } else {
            console.error("Gemini Error:", geminiRes.reason);
            results.push({ engine: "Gemini", mentions: [], rawText: "", error: "Gemini failed" });
        }

        // Process Rainforest Results (Amazon BSR)
        if (rainforestRes.status === "fulfilled") {
            results.push({
                engine: "Amazon BSR",
                mentions: rainforestRes.value.map((brand, i) => ({
                    rank: i + 1,
                    brand,
                    sentiment: "NEUTRAL", // BSR is raw data, not AI sentiment
                    excerpt: "Top selling brand based on actual Amazon search data.",
                    firstIndex: 0,
                })),
                rawText: JSON.stringify(rainforestRes.value),
            });
        } else {
            results.push({ engine: "Amazon BSR", mentions: [], rawText: "", error: "BSR failed" });
        }

        return NextResponse.json({ results, query: trimmedQuery });
    } catch (err) {
        console.error("Route error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function queryGroq(query: string): Promise<string> {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query },
        ],
        response_format: { type: "json_object" }, // Newer models support this
    });
    // If it's a json_object, it might be wrapped in a key. Let's handle string too.
    return completion.choices[0]?.message?.content ?? "[]";
}

async function queryGemini(query: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
    
    try {
        // Using the high-performance 2.5-pro for your new high-limit key
        const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-pro" });
        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nQuery: ${query}`);
        const response = await result.response;
        return response.text();
    } catch (err: any) {
        // High-Availability Fallback: Pivot to Groq if Gemini hits any limits or issues
        if (err.status === 429 || err.message?.includes("429")) {
            console.log("Gemini Rate Limited. Falling back to Groq-Llama-8b...");
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const fallback = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: query },
                ],
            });
            return fallback.choices[0]?.message?.content ?? "[]";
        }
        throw err;
    }
}

async function queryRainforest(query: string): Promise<string[]> {
    const apiKey = process.env.RAINFOREST_KEY;
    if (!apiKey || apiKey === "paste_your_rainforest_key_here") {
        console.error("Rainforest API key is missing or not set.");
        return [];
    }

    const url = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=search&amazon_domain=amazon.com&search_term=${encodeURIComponent(query)}&sort_by=featured`;

    console.log("Querying Rainforest API...");
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
        console.error("Rainforest API error:", data.error);
        return [];
    }

    // 1. Try "related_brands" or "refinements" as these are high-accuracy metadata
    let brands: string[] = [];
    if (data.related_brands && Array.isArray(data.related_brands)) {
        brands = data.related_brands.map((b: any) => b.name || b.store_name).filter(Boolean);
    }
    if (brands.length === 0 && data.refinements?.brand) {
        brands = data.refinements.brand.map((b: any) => b.name).filter(Boolean);
    }

    // 2. Fallback: Extract brand from Title (Primary source for Amazon Search)
    // Most Amazon titles are "Brand Name: Product Description..." or "Brand Name Product..."
    if (data.search_results && Array.isArray(data.search_results)) {
        const titleBrands = data.search_results
            .slice(0, 20)
            .map((item: any) => {
                if (!item.title) return null;
                // Split by space and take the first 1-2 words
                const words = item.title.trim().split(/\s+/);
                if (words.length === 0) return null;

                // If the first word is very short (e.g., "NOW", "HP"), take the first word.
                // Otherwise, usually the first 1-2 words represent the brand.
                // For simplicity and to avoid noise, we take the first word which is the brand 90% of the time.
                return words[0].replace(/[,:]+$/, ""); // Clean up punctuation like "Thorne:"
            })
            .filter(Boolean);

        brands = [...brands, ...titleBrands];
    }

    // Deduplicate and limit to top 5
    const uniqueBrands = brands
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5);

    console.log("Rainforest Detected Brands:", uniqueBrands);
    return uniqueBrands;
}
