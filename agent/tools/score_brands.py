import json
from strands import tool


@tool
def calculate_aeo_grades(scan_results: str) -> dict:
    """Calculate AEO visibility grades for brands based on multi-engine scan data.
    Compares AI engine recommendations against Amazon BSR to detect blind spots.

    Args:
        scan_results: JSON string containing results from probe_llm and fetch_amazon_bsr.
                      Expected format: {"engines": [{"engine": "...", "brands": [...]}]}

    Returns:
        Dictionary with brand grades, verdicts, and detected anomalies
    """
    try:
        data = json.loads(scan_results) if isinstance(scan_results, str) else scan_results
        engines = data.get("engines", [])
    except (json.JSONDecodeError, AttributeError):
        return {"error": "Invalid scan_results format", "grades": []}

    # Collect all unique brands across all engines
    all_brands: set[str] = set()
    engine_map: dict[str, dict[str, int]] = {}  # engine_name -> {brand: rank}

    for engine_data in engines:
        engine_name = engine_data.get("engine", "Unknown")
        engine_map[engine_name] = {}
        for brand_info in engine_data.get("brands", []):
            brand_name = brand_info.get("name", "")
            rank = brand_info.get("rank", 6)
            if brand_name:
                all_brands.add(brand_name)
                engine_map[engine_name][brand_name] = rank

    # Calculate grades for each brand
    grades = []
    anomalies = []

    for brand in sorted(all_brands):
        # Score: higher is better. Max 5 per engine (rank 1 = 5 points, rank 5 = 1 point)
        total_score = 0
        presence = {}

        for engine_name, brands_dict in engine_map.items():
            rank = brands_dict.get(brand)
            if rank:
                total_score += (6 - rank)  # rank 1 = 5pts, rank 5 = 1pt
                presence[engine_name] = rank
            else:
                presence[engine_name] = None

        # Assign letter grade
        if total_score >= 12:
            grade = "A"
        elif total_score >= 8:
            grade = "B"
        elif total_score >= 4:
            grade = "C"
        elif total_score >= 1:
            grade = "D"
        else:
            grade = "F"

        # Detect verdict
        ai_engines = [e for e in engine_map if e != "Amazon BSR"]
        in_ai = any(brand in engine_map.get(e, {}) for e in ai_engines)
        in_bsr = brand in engine_map.get("Amazon BSR", {})

        if in_bsr and not in_ai:
            verdict = "AI_BLIND_SPOT"
            bsr_rank = engine_map.get("Amazon BSR", {}).get(brand, "?")
            anomalies.append({
                "type": "AI_BLIND_SPOT",
                "brand": brand,
                "message": f"{brand} is ranked #{bsr_rank} on Amazon but completely invisible to AI engines.",
                "severity": "HIGH"
            })
        elif in_ai and in_bsr:
            verdict = "STRONG_PRESENCE"
        elif in_ai and not in_bsr:
            verdict = "AI_ONLY"
        else:
            verdict = "WEAK_SIGNAL"

        grades.append({
            "brand": brand,
            "grade": grade,
            "score": total_score,
            "verdict": verdict,
            "presence": presence
        })

    # Sort by score descending
    grades.sort(key=lambda x: x["score"], reverse=True)

    return {
        "grades": grades,
        "anomalies": anomalies,
        "total_brands": len(all_brands),
        "blind_spots_detected": len(anomalies)
    }
