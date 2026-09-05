import os
import json
import requests
from strands import tool


@tool
def probe_llm(query: str, model_provider: str = "gemini") -> dict:
    """Query an AI model to discover which brands it recommends for a shopping query.
    Use this tool to scan what brands AI engines are recommending to consumers.

    Args:
        query: The shopping query to probe (e.g. 'best korean sunscreen for oily skin')
        model_provider: Which AI provider to query - 'gemini' or 'groq'

    Returns:
        Dictionary with engine name and list of recommended brands with rankings
    """
    system_prompt = """You are an Amazon product research tool.
The user will give you a shopping query.
Return ONLY a valid JSON array of exactly 5 brand names
that are most recommended for this query.

Rules:
- Real brand names only (e.g. "Garden of Life", "Thorne", "NOW Foods")
- No product descriptors ("Unflavored", "Organic", "Powder")
- No generic words ("Alternatively", "Consider", "Options")
- No explanation, no markdown, no extra text
- Just the raw JSON array

Example output:
["Garden of Life", "Thorne", "NOW Foods", "Naked Nutrition", "Orgain"]"""

    try:
        if model_provider == "gemini":
            return _query_gemini(query, system_prompt)
        elif model_provider == "groq":
            return _query_groq(query, system_prompt)
        else:
            return {"engine": model_provider, "brands": [], "error": f"Unknown provider: {model_provider}"}
    except Exception as e:
        return {"engine": model_provider, "brands": [], "error": str(e)}


def _query_gemini(query: str, system_prompt: str) -> dict:
    """Query Google Gemini API."""
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        return {"engine": "Gemini", "brands": [], "error": "GOOGLE_API_KEY not set"}

    model_id = os.environ.get("GEMINI_PROBE_MODEL", "gemini-3.6-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [{"text": f"{system_prompt}\n\nQuery: {query}"}]
        }],
        "generationConfig": {"temperature": 0.1}
    }

    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
    brands = _parse_brands(raw_text)

    return {
        "engine": "Gemini",
        "brands": [{"rank": i + 1, "name": b} for i, b in enumerate(brands)],
        "raw_text": raw_text
    }


def _query_groq(query: str, system_prompt: str) -> dict:
    """Query Groq (Llama) API."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return {"engine": "Llama (Groq)", "brands": [], "error": "GROQ_API_KEY not set"}

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    model_id = os.environ.get("GROQ_MODEL_ID", "openai/gpt-oss-120b")
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ],
        "temperature": 0.1
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    raw_text = data["choices"][0]["message"]["content"]
    brands = _parse_brands(raw_text)

    return {
        "engine": "Llama (Groq)",
        "brands": [{"rank": i + 1, "name": b} for i, b in enumerate(brands)],
        "raw_text": raw_text
    }


def _parse_brands(raw_text: str) -> list[str]:
    """Extract brand names from AI response text."""
    import re
    json_match = re.search(r'\[.*?\]', raw_text, re.DOTALL)
    if json_match:
        try:
            brands = json.loads(json_match.group())
            if isinstance(brands, list):
                return [str(b).strip() for b in brands[:5]]
        except json.JSONDecodeError:
            pass
    return []
