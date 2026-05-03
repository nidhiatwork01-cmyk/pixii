export interface BrandMention {
  rank: number;
  brand: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  excerpt: string;
  firstIndex: number;
}

export interface EngineResult {
  engine: string;
  mentions: BrandMention[];
  rawText: string;
  error?: string;
}

/**
 * Simplifies the response parsing to handle the new JSON-only requirement.
 */
export function parseResponse(engine: string, rawText: string): EngineResult {
  try {
    // Try to find a JSON array in the text (in case AI adds markdown blocks)
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    const brands: string[] = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    if (!Array.isArray(brands)) throw new Error("Not an array");

    const mentions: BrandMention[] = brands.slice(0, 5).map((brand, i) => ({
      rank: i + 1,
      brand: brand.trim(),
      sentiment: "POSITIVE", // AI recommended brands are positive by default in this clean format
      excerpt: `Ranked #${i + 1} by ${engine} for this query.`,
      firstIndex: 0,
    }));

    return { engine, mentions, rawText };
  } catch (err) {
    console.error(`Parse error for ${engine}:`, err);
    return {
      engine,
      mentions: [],
      rawText,
      error: "Failed to parse AI brands JSON",
    };
  }
}
