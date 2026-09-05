import os
import json
import requests
from strands import tool


@tool
def fetch_amazon_bsr(query: str) -> dict:
    """Fetch real Amazon Best Seller data for a product query.
    Cross-references AI recommendations against actual marketplace performance.

    Args:
        query: The product search query (e.g. 'best korean sunscreen for oily skin')

    Returns:
        Dictionary with top-selling brands from Amazon search results
    """
    api_key = os.environ.get("RAINFOREST_KEY", "")

    # If no Rainforest API key, use simulated data for demo
    if not api_key or api_key == "paste_your_rainforest_key_here":
        return _simulated_bsr(query)

    try:
        url = (
            f"https://api.rainforestapi.com/request"
            f"?api_key={api_key}"
            f"&type=search"
            f"&amazon_domain=amazon.com"
            f"&search_term={requests.utils.quote(query)}"
            f"&sort_by=featured"
        )

        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if data.get("error"):
            return {"engine": "Amazon BSR", "brands": [], "error": str(data["error"])}

        brands: list[str] = []

        # Try structured brand data first
        if data.get("related_brands") and isinstance(data["related_brands"], list):
            brands = [b.get("name") or b.get("store_name") for b in data["related_brands"] if b.get("name") or b.get("store_name")]

        if not brands and data.get("refinements", {}).get("brand"):
            brands = [b["name"] for b in data["refinements"]["brand"] if b.get("name")]

        # Fallback: extract from product titles
        if not brands and data.get("search_results"):
            for item in data["search_results"][:20]:
                title = item.get("title", "")
                if title:
                    first_word = title.strip().split()[0].rstrip(",:")
                    if first_word and len(first_word) > 1:
                        brands.append(first_word)

        # Deduplicate and limit to top 5
        seen = set()
        unique_brands = []
        for b in brands:
            if b.lower() not in seen:
                seen.add(b.lower())
                unique_brands.append(b)
            if len(unique_brands) >= 5:
                break

        return {
            "engine": "Amazon BSR",
            "brands": [{"rank": i + 1, "name": b} for i, b in enumerate(unique_brands)],
        }

    except Exception as e:
        return {"engine": "Amazon BSR", "brands": [], "error": str(e)}


def _simulated_bsr(query: str) -> dict:
    """Simulated Amazon BSR data for demo/testing when no API key is available."""
    # Map common queries to realistic brand data
    simulated_data = {
        "sunscreen": ["COSRX", "Beauty of Joseon", "Biore", "Supergoop", "La Roche-Posay"],
        "serum": ["COSRX", "TruSkin", "L'Oreal Paris", "Estee Lauder", "The Ordinary"],
        "protein": ["Optimum Nutrition", "Garden of Life", "Orgain", "Naked Nutrition", "Vega"],
        "collagen": ["Vital Proteins", "Sports Research", "Garden of Life", "NeoCell", "Ancient Nutrition"],
        "magnesium": ["Nature Made", "NOW Foods", "Doctor's Best", "Natural Vitality", "Life Extension"],
    }

    # Find matching simulated data
    query_lower = query.lower()
    brands = ["Brand A", "Brand B", "Brand C", "Brand D", "Brand E"]  # default
    for keyword, brand_list in simulated_data.items():
        if keyword in query_lower:
            brands = brand_list
            break

    return {
        "engine": "Amazon BSR",
        "brands": [{"rank": i + 1, "name": b} for i, b in enumerate(brands)],
        "simulated": True
    }
