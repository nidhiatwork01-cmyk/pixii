"""Pixii Sentinel — Scan Result Store

Handles persisting and retrieving agent scan results as JSON files.
The Next.js dashboard reads from the same data directory to display results.

Storage layout:
  data/scans/scan_YYYYMMDD_HHMMSS.json   — Individual scan results
  data/config.json                        — Monitoring configuration
  data/alerts/alerts.jsonl                — Alert history (append-only)
"""

import json
import pathlib
from datetime import datetime, timezone
from typing import Optional

# Data directory is at the project root, shared with Next.js
DATA_DIR = pathlib.Path(__file__).parent.parent / "data"
SCANS_DIR = DATA_DIR / "scans"
ALERTS_DIR = DATA_DIR / "alerts"


def ensure_dirs() -> None:
    """Create data directories if they don't exist."""
    SCANS_DIR.mkdir(parents=True, exist_ok=True)
    ALERTS_DIR.mkdir(parents=True, exist_ok=True)


def save_scan(query: str, results: dict) -> str:
    """Save a scan result to disk.

    Args:
        query: The search query that was scanned
        results: The full scan result data (engines, grades, anomalies)

    Returns:
        The filename of the saved scan
    """
    ensure_dirs()
    timestamp = datetime.now(timezone.utc)
    filename = f"scan_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"

    scan_record = {
        "id": filename.replace(".json", ""),
        "query": query,
        "timestamp": timestamp.isoformat(),
        "results": results
    }

    filepath = SCANS_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(scan_record, f, indent=2, ensure_ascii=False)

    return filename


def load_scan(filename: str) -> Optional[dict]:
    """Load a specific scan result by filename."""
    filepath = SCANS_DIR / filename
    if not filepath.exists():
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def list_scans(limit: int = 50) -> list[dict]:
    """List recent scan results, newest first.

    Args:
        limit: Maximum number of scans to return

    Returns:
        List of scan summaries (id, query, timestamp, grade counts)
    """
    ensure_dirs()
    scan_files = sorted(SCANS_DIR.glob("scan_*.json"), reverse=True)

    summaries = []
    for filepath in scan_files[:limit]:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            summaries.append({
                "id": data.get("id", filepath.stem),
                "query": data.get("query", "Unknown"),
                "timestamp": data.get("timestamp", ""),
                "total_brands": data.get("results", {}).get("total_brands", 0),
                "blind_spots": data.get("results", {}).get("blind_spots_detected", 0),
            })
        except (json.JSONDecodeError, KeyError):
            continue

    return summaries


def load_alerts(limit: int = 20) -> list[dict]:
    """Load recent alerts from the append-only alerts log."""
    ensure_dirs()
    alerts_file = ALERTS_DIR / "alerts.jsonl"
    if not alerts_file.exists():
        return []

    alerts = []
    with open(alerts_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    alerts.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    # Return newest first, limited
    return list(reversed(alerts[-limit:]))


def load_config() -> dict:
    """Load monitoring configuration."""
    config_path = DATA_DIR / "config.json"
    if not config_path.exists():
        # Default configuration
        return {
            "monitored_queries": [
                "best korean sunscreen for oily skin",
                "best korean serum for glow",
                "organic protein powder for women",
                "best magnesium supplement for seniors"
            ],
            "scan_interval_hours": 24,
            "alert_on_blind_spots": True,
            "alert_on_grade_drop": True
        }
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_config(config: dict) -> None:
    """Save monitoring configuration."""
    ensure_dirs()
    config_path = DATA_DIR / "config.json"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
