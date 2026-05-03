/**
 * parseResponse.ts
 * Robust brand/product extraction from raw LLM text.
 * Handles: mid-sentence mentions, bulleted lists, numbered lists,
 * parenthetical qualifiers, possessives, and varied capitalisation.
 */

export interface BrandMention {
  rank: number;
  brand: string;
  sentiment: "positive" | "neutral" | "mentioned briefly";
  excerpt: string;
  firstIndex: number;
}

export interface ParsedResult {
  engine: string;
  mentions: BrandMention[];
  rawText: string;
}

// ─── Sentiment helpers ────────────────────────────────────────────────────────

const POSITIVE_SIGNALS = [
  "highly recommend",
  "excellent",
  "great",
  "best",
  "top",
  "superior",
  "outstanding",
  "premium",
  "popular",
  "loved",
  "trusted",
  "effective",
  "high quality",
  "high-quality",
  "ideal",
  "perfect",
  "fantastic",
  "amazing",
  "impressive",
  "well-regarded",
  "well regarded",
  "reputable",
  "leading",
  "notable",
  "favorite",
  "favourite",
  "proven",
  "reliable",
  "stand out",
  "stands out",
];

const NEGATIVE_SIGNALS = [
  "avoid",
  "poor",
  "inferior",
  "disappointing",
  "bad",
  "worst",
  "low quality",
  "low-quality",
  "overpriced",
  "not recommended",
  "ineffective",
  "weak",
];

function getSentiment(
  excerpt: string
): "positive" | "neutral" | "mentioned briefly" {
  const lower = excerpt.toLowerCase();

  // A very short excerpt with no strong signals = "mentioned briefly"
  if (excerpt.trim().split(/\s+/).length < 8) return "mentioned briefly";

  if (NEGATIVE_SIGNALS.some((s) => lower.includes(s))) return "neutral";
  if (POSITIVE_SIGNALS.some((s) => lower.includes(s))) return "positive";

  // If the excerpt is long but neutral-toned
  if (excerpt.trim().split(/\s+/).length < 15) return "mentioned briefly";
  return "neutral";
}

// ─── Excerpt extraction ───────────────────────────────────────────────────────

/**
 * Pull the sentence(s) surrounding the brand mention.
 * Looks up to 120 chars before and after the match within sentence boundaries.
 */
function extractExcerpt(text: string, index: number, brandLen: number): string {
  const start = Math.max(0, index - 120);
  const end = Math.min(text.length, index + brandLen + 200);
  const slice = text.slice(start, end);

  // Try to snap to sentence boundaries
  const sentenceBreak = /[.!?]\s+/g;
  let sentenceStart = 0;
  let sentenceEnd = slice.length;

  // Find sentence containing the brand (brand is near offset 120 in the slice)
  const brandOffset = index - start;
  let match: RegExpExecArray | null;
  while ((match = sentenceBreak.exec(slice)) !== null) {
    if (match.index < brandOffset) {
      sentenceStart = match.index + match[0].length;
    } else if (match.index > brandOffset && sentenceEnd === slice.length) {
      sentenceEnd = match.index + 1;
      break;
    }
  }

  const excerpt = slice.slice(sentenceStart, sentenceEnd).trim();
  return excerpt.length > 0 ? excerpt : slice.trim();
}

// ─── Candidate brand detection ────────────────────────────────────────────────

/**
 * Heuristic patterns for "brand-like" tokens in LLM output:
 *  - Proper-cased words (Title Case or ALL CAPS abbreviations)
 *  - Preceded by list markers: "1.", "-", "•", "*"
 *  - Followed by possessives or model names
 */
const BRAND_PATTERNS: RegExp[] = [
  // Numbered list: "1. BrandName" or "1) BrandName"
  /(?:^|\n)\s*\d+[.)]\s+([A-Z][A-Za-z0-9''\-&+.]{1,40}(?:\s+[A-Z][A-Za-z0-9''\-&+.]{1,30}){0,3})/gm,
  // Bulleted list: "- BrandName" or "• BrandName" or "* BrandName"
  /(?:^|\n)\s*[-•*]\s+([A-Z][A-Za-z0-9''\-&+.]{1,40}(?:\s+[A-Z][A-Za-z0-9''\-&+.]{1,30}){0,3})/gm,
  // Bold markdown: **BrandName** or *BrandName*
  /\*{1,2}([A-Z][A-Za-z0-9''\-&+.\s]{2,50}?)\*{1,2}/g,
  // Quoted brand: "BrandName"
  /"([A-Z][A-Za-z0-9''\-&+.\s]{2,40})"/g,
  // Title-cased 1–4 word phrases mid-sentence (requires at least 2-char first word)
  /\b([A-Z][A-Za-z0-9''\-+]{2,30}(?:\s+[A-Z][A-Za-z0-9''\-+]{1,25}){0,2})\b/g,
];

// Very common English words that are falsely Title-Cased at start of sentences
const STOP_WORDS = new Set([
  "The",
  "This",
  "These",
  "Those",
  "Here",
  "There",
  "When",
  "Where",
  "What",
  "Which",
  "Who",
  "How",
  "Why",
  "Some",
  "Many",
  "Most",
  "More",
  "Also",
  "Both",
  "Each",
  "Every",
  "Such",
  "Other",
  "Another",
  "First",
  "Second",
  "Third",
  "One",
  "Two",
  "Three",
  "For",
  "With",
  "From",
  "Into",
  "About",
  "After",
  "Before",
  "During",
  "Since",
  "While",
  "Because",
  "Although",
  "However",
  "Therefore",
  "Moreover",
  "Furthermore",
  "Additionally",
  "Overall",
  "Note",
  "Always",
  "Never",
  "Often",
  "Generally",
  "Typically",
  "Usually",
  "Especially",
  "Particularly",
  "Important",
  "Consider",
  "Look",
  "Make",
  "Keep",
  "Take",
  "Give",
  "See",
  "Use",
  "Try",
  "Check",
  "Choose",
  "Select",
  "Find",
  "Get",
  "Buy",
  "Read",
  "Learn",
  "Start",
  "Stop",
  "Add",
  "Remove",
  "Help",
  "Amazon",
  "Google",
  "United",
  "States",
  "Please",
  "Remember",
  "Sure",
  "Great",
  "Good",
  "Best",
  "Top",
  "New",
  "Old",
  "High",
  "Low",
  "Large",
  "Small",
  "Big",
  "Different",
  "Various",
  "Similar",
  "Same",
  "Like",
  "Need",
  "Want",
  "May",
  "Can",
  "Will",
  "Should",
  "Must",
  "Could",
  "Would",
  "Might",
  "Let",
  "Know",
  "Think",
  "Feel",
  "Look",
  "They",
  "Their",
  "Your",
  "Our",
  "Its",
  "Has",
  "Have",
  "Had",
  "Been",
  "Being",
  "Here",
  "Just",
  "Then",
  "Than",
  "That",
  "And",
  "But",
  "Not",
]);

function isLikelyBrand(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (trimmed.length < 2) return false;
  if (STOP_WORDS.has(trimmed)) return false;
  // Must start with uppercase
  if (!/^[A-Z]/.test(trimmed)) return false;
  // Reject pure number strings
  if (/^\d+$/.test(trimmed)) return false;
  // Reject single lowercase words that leaked through
  if (/^[a-z]/.test(trimmed)) return false;
  return true;
}

// ─── Main parse function ──────────────────────────────────────────────────────

export function parseResponse(engine: string, rawText: string): ParsedResult {
  // Collect (candidate, firstIndex) pairs across all patterns
  const seen = new Map<string, number>(); // normalised brand → first char index

  for (const pattern of BRAND_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(rawText)) !== null) {
      const raw = (match[1] ?? match[0]).trim();
      // Clean markdown/punctuation artefacts
      const candidate = raw
        .replace(/[*_`~#]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!isLikelyBrand(candidate)) continue;

      const normalised = candidate.toLowerCase();
      if (!seen.has(normalised)) {
        seen.set(normalised, match.index);
      }
    }
  }

  // Sort by first appearance in text
  const sorted = Array.from(seen.entries()).sort((a, b) => a[1] - b[1]);

  // Build mentions (cap at 8 brands)
  const mentions: BrandMention[] = sorted.slice(0, 8).map(([norm, idx], i) => {
    // Recover original casing from the text around idx
    const originalCasing =
      rawText.slice(idx, idx + 60).match(/[A-Z][A-Za-z0-9''\-&+.\s]{1,50}/)?.[0]?.trim() ??
      norm;

    // Find canonical brand name from seen keys
    const brandDisplay = Array.from(seen.keys())
      .find((k) => k === norm)
      ?.split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") ?? originalCasing;

    const excerpt = extractExcerpt(rawText, idx, brandDisplay.length);
    const sentiment = getSentiment(excerpt);

    return {
      rank: i + 1,
      brand: brandDisplay,
      sentiment,
      excerpt,
      firstIndex: idx,
    };
  });

  return { engine, mentions, rawText };
}
