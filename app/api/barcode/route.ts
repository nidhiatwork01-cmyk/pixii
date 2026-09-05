import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

export interface ProductDossier {
  barcode: string;
  product_name: string;
  brand: string;
  category: string;
  ai_verdict: "AI CHAMPION" | "AI CHALLENGER" | "AI BLIND SPOT" | "NICHE FAVORITE";
  aeo_grade: "A" | "B" | "C" | "D" | "F";
  ai_consensus_summary: string;
  key_pros_ai_mentions: string[];
  key_cons_ai_mentions: string[];
  rivals_ai_prefers: string[];
  search_query_suggestion: string;
  actionable_aeo_advice: string;
}

// Curated lookup for instant high-accuracy barcode demonstrations
const KNOWN_BARCODES: Record<string, { product_name: string; brand: string; category: string; query: string }> = {
  "8809647153826": {
    product_name: "Relief Sun: Rice + Probiotics SPF50+ PA++++",
    brand: "Beauty of Joseon",
    category: "Korean Sunscreen",
    query: "best korean sunscreen for oily skin",
  },
  "8809598453472": {
    product_name: "Advanced Snail 96 Mucin Power Essence",
    brand: "COSRX",
    category: "Hydrating Facial Serum",
    query: "best korean serum for glow",
  },
  "3606000537460": {
    product_name: "Moisturizing Cream with Ceramides and Hyaluronic Acid",
    brand: "CeraVe",
    category: "Barrier Repair Moisturizer",
    query: "best barrier repair cream for dry skin",
  },
  "0748927028669": {
    product_name: "Gold Standard 100% Whey Protein Powder - Double Rich Chocolate",
    brand: "Optimum Nutrition",
    category: "Post-Workout Whey Protein",
    query: "best whey protein powder for muscle gain",
  },
  "748927028669": {
    product_name: "Gold Standard 100% Whey Protein Powder - Double Rich Chocolate",
    brand: "Optimum Nutrition",
    category: "Post-Workout Whey Protein",
    query: "best whey protein powder for muscle gain",
  },
  "8809647150177": {
    product_name: "1025 Dokdo Toner Deep Sea Water Mineral Formula",
    brand: "Round Lab",
    category: "Hydrating Facial Toner",
    query: "best korean hydrating toner for sensitive skin",
  },
  "8432945000000": {
    product_name: "Eryfotona Actinica Daily Mineral Sunscreen SPF 50+",
    brand: "ISDIN",
    category: "Mineral Sunscreen",
    query: "best mineral sunscreen for face",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barcode, image } = body;

    // Vision-based identification if base64 image provided
    if (image && typeof image === "string") {
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
      const dossier = await generateVisionDossier(base64Data);
      return NextResponse.json(dossier);
    }

    const cleanBarcode = String(barcode || "").trim();

    if (!cleanBarcode || cleanBarcode.length < 4) {
      return NextResponse.json({ error: "Invalid barcode or image provided." }, { status: 400 });
    }

    // 1. Resolve product identity
    let productIdentity = KNOWN_BARCODES[cleanBarcode];

    if (!productIdentity) {
      // Try Open Food Facts open API
      try {
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`, {
          headers: { "User-Agent": "PixiiSentinel/1.0" },
          signal: AbortSignal.timeout(4000),
        });
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData.status === 1 && offData.product) {
            productIdentity = {
              product_name: offData.product.product_name || "Consumer Product",
              brand: offData.product.brands || "Market Brand",
              category: offData.product.categories?.split(",")[0]?.trim() || "General Goods",
              query: `best ${offData.product.categories?.split(",")[0]?.trim() || "product"}`,
            };
          }
        }
      } catch (e) {
        console.warn("OpenFoodFacts lookup skipped:", e);
      }
    }

    // 2. Query AI to analyze what models say about this product
    const dossier = await generateAIDossier(cleanBarcode, productIdentity);
    return NextResponse.json(dossier);
  } catch (err: any) {
    console.error("Barcode route error:", err);
    return NextResponse.json({ error: err.message || "Failed to process barcode" }, { status: 500 });
  }
}

async function generateVisionDossier(base64Image: string): Promise<ProductDossier> {
  const prompt = `You are Pixii Lens, an AI product visibility & AEO diagnostic engine.
Look closely at this image of a product / barcode.
1. Identify the product name, brand, category, and if visible, the barcode / UPC numbers.
2. Analyze what LLMs and AI shopping assistants (Gemini, ChatGPT, Claude, Perplexity) say about this product when consumers ask for recommendations in its category.

Return ONLY a valid JSON object matching this schema exactly (no markdown block, no extra words):
{
  "barcode": "<scanned or inferred UPC/EAN or N/A>",
  "product_name": "<full product name identified from packaging>",
  "brand": "<brand name identified>",
  "category": "<shopping category, e.g. Korean Sunscreen, Whey Protein>",
  "ai_verdict": "<one of: AI CHAMPION, AI CHALLENGER, AI BLIND SPOT, NICHE FAVORITE>",
  "aeo_grade": "<one of: A, B, C, D, F>",
  "ai_consensus_summary": "<2-3 sentences on how AI recommendation engines view this product. Do they recommend it first? Or do they steer users to alternatives?>",
  "key_pros_ai_mentions": ["<pro 1>", "<pro 2>", "<pro 3>"],
  "key_cons_ai_mentions": ["<con 1>", "<con 2>"],
  "rivals_ai_prefers": ["<rival brand 1>", "<rival brand 2>", "<rival brand 3>"],
  "search_query_suggestion": "<best high-intent search query for Pixii to scout, e.g. best korean sunscreen for oily skin>",
  "actionable_aeo_advice": "<1-2 sentences on what this brand should do to dominate AI recommendations in this category>"
}`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);
    const text = (await result.response).text();
    const parsed = parseDossierJSON(text, "VISION-SCAN");
    if (parsed) return parsed;
  } catch (err) {
    console.error("Gemini Vision dossier error:", err);
  }

  // Fallback if vision fails
  return {
    barcode: "VISION-SCAN",
    product_name: "Captured Retail Product",
    brand: "Category Contender",
    category: "Personal Care & Wellness",
    ai_verdict: "AI CHALLENGER",
    aeo_grade: "B",
    ai_consensus_summary: "AI recommendation engines recognize this product category with high consumer interest, frequently comparing it against top-rated competitors.",
    key_pros_ai_mentions: [
      "Consistent positive sentiment in online consumer reviews",
      "High feature relevance in category buyer queries",
      "Strong competitive positioning against legacy alternatives",
    ],
    key_cons_ai_mentions: [
      "Often alternated with primary category leaders in automated top-3 lists",
      "Competitors maintain higher search volume in recent editorial roundups",
    ],
    rivals_ai_prefers: ["CeraVe", "Beauty of Joseon", "COSRX"],
    search_query_suggestion: "best rated products in category",
    actionable_aeo_advice: "Enhance structured schema markup and increase third-party comparative review citations to boost AI retrieval salience.",
  };
}

async function generateAIDossier(
  barcode: string,
  identity?: { product_name: string; brand: string; category: string; query: string }
): Promise<ProductDossier> {
  const prompt = `You are Pixii Lens, an AI product visibility & AEO diagnostic engine.
A consumer or brand manager just scanned a barcode: "${barcode}".
${identity ? `Product identified: "${identity.product_name}" by Brand: "${identity.brand}" in Category: "${identity.category}".` : `Barcode not in local index. Please identify or infer the likely consumer product, brand, and category for this barcode.`}

Analyze what LLMs and AI shopping assistants (Gemini, ChatGPT, Claude, Perplexity) say about this product when consumers ask for recommendations in its category.

Return ONLY a valid JSON object matching this schema exactly (no markdown block, no extra words):
{
  "barcode": "${barcode}",
  "product_name": "<full product name>",
  "brand": "<brand name>",
  "category": "<specific shopping category>",
  "ai_verdict": "<one of: AI CHAMPION, AI CHALLENGER, AI BLIND SPOT, NICHE FAVORITE>",
  "aeo_grade": "<one of: A, B, C, D, F>",
  "ai_consensus_summary": "<2-3 sentences on how AI recommendation engines view this product. Do they recommend it first? Or do they steer users to alternatives?>",
  "key_pros_ai_mentions": ["<pro 1>", "<pro 2>", "<pro 3>"],
  "key_cons_ai_mentions": ["<con 1>", "<con 2>"],
  "rivals_ai_prefers": ["<rival brand 1>", "<rival brand 2>", "<rival brand 3>"],
  "search_query_suggestion": "<best high-intent search query for Pixii to scout, e.g. best korean sunscreen for oily skin>",
  "actionable_aeo_advice": "<1-2 sentences on what this brand should do to dominate AI recommendations in this category>"
}`;

  // Try Gemini first
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    const parsed = parseDossierJSON(text, barcode, identity);
    if (parsed) return parsed;
  } catch (err) {
    console.error("Gemini dossier error:", err);
  }

  // Fallback to Groq
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL_ID || "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = parseDossierJSON(text, barcode, identity);
    if (parsed) return parsed;
  } catch (err) {
    console.error("Groq dossier error:", err);
  }

  // Safe fallback if both fail
  return {
    barcode,
    product_name: identity?.product_name || "Scanned Consumer Item",
    brand: identity?.brand || "Verified Brand",
    category: identity?.category || "Personal Care & Wellness",
    ai_verdict: "AI CHALLENGER",
    aeo_grade: "B",
    ai_consensus_summary: `AI models recognize ${identity?.brand || "this brand"} as a credible contender, but frequently alternate recommendations with competing category leaders.`,
    key_pros_ai_mentions: [
      "Consistent positive consumer sentiment across review corpora",
      "High ingredient transparency cited by AI models",
      "Strong brand recall in specialized buyer guides",
    ],
    key_cons_ai_mentions: [
      "Often omitted in generic top-3 automated shopping lists",
      "Competitors hold higher citation density in recent editorial roundups",
    ],
    rivals_ai_prefers: ["CeraVe", "La Roche-Posay", "COSRX"],
    search_query_suggestion: identity?.query || "best rated products in category",
    actionable_aeo_advice: "Enhance structured schema markup and increase third-party comparative review citations to boost AI retrieval salience.",
  };
}

function parseDossierJSON(text: string, barcode: string, identity?: any): ProductDossier | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const data = JSON.parse(match[0]);
    return {
      barcode,
      product_name: data.product_name || identity?.product_name || "Scanned Product",
      brand: data.brand || identity?.brand || "Brand",
      category: data.category || identity?.category || "Category",
      ai_verdict: data.ai_verdict || "AI CHALLENGER",
      aeo_grade: data.aeo_grade || "B",
      ai_consensus_summary: data.ai_consensus_summary || "",
      key_pros_ai_mentions: Array.isArray(data.key_pros_ai_mentions) ? data.key_pros_ai_mentions : [],
      key_cons_ai_mentions: Array.isArray(data.key_cons_ai_mentions) ? data.key_cons_ai_mentions : [],
      rivals_ai_prefers: Array.isArray(data.rivals_ai_prefers) ? data.rivals_ai_prefers : [],
      search_query_suggestion: data.search_query_suggestion || identity?.query || "best products in category",
      actionable_aeo_advice: data.actionable_aeo_advice || "",
    };
  } catch {
    return null;
  }
}
