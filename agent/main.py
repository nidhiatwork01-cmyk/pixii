"""Pixii Sentinel — Autonomous AEO Brand Defense Agent

This is the main entry point for the Strands Agent.
It creates an autonomous agent that:
  1. Reads monitored queries from config
  2. Probes multiple AI models for brand recommendations
  3. Cross-references against Amazon BSR data
  4. Calculates AEO visibility grades
  5. Detects anomalies (AI Blind Spots, visibility drops)
  6. Sends alerts only when human action is needed
  7. Saves all results for the dashboard to display

Usage:
  python agent/main.py                              # Run full monitoring scan
  python agent/main.py --query "best sunscreen"      # Single query scan
  python agent/main.py --dry-run                     # Test without alerts
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import json
import argparse
from datetime import datetime, timezone
import os
import sys
from pathlib import Path

# Ensure agent directory is in sys.path
agent_dir = str(Path(__file__).parent.resolve())
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)

# Import configuration (loads .env.local)
import config  # noqa: F401

from strands import Agent

# Import our custom tools
from tools.probe_llms import probe_llm
from tools.fetch_amazon_bsr import fetch_amazon_bsr
from tools.score_brands import calculate_aeo_grades
from tools.send_alert import send_alert

# Import result store
from store import save_scan, load_config, save_config, list_scans


def create_agent(dry_run: bool = False) -> Agent:
    """Create and configure the Pixii Sentinel agent.

    Resolves LLM model dynamically:
      1. AWS Bedrock (Claude / Nova) if AWS credentials present
      2. Google Gemini (native Strands GeminiModel) if GOOGLE_API_KEY present
      3. LiteLLMModel as fallback
    """
    if os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_SECRET_ACCESS_KEY"):
        from strands.models.bedrock import BedrockModel
        model = BedrockModel(
            model_id=os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")
        )
    elif os.environ.get("GOOGLE_API_KEY"):
        from strands.models.gemini import GeminiModel
        model = GeminiModel(
            model_id=os.environ.get("GEMINI_MODEL_ID", "gemini-3.6-flash"),
            client_args={"api_key": os.environ.get("GOOGLE_API_KEY")}
        )
    else:
        from strands.models.litellm import LiteLLMModel
        model = LiteLLMModel(
            model_id=config.AGENT_MODEL
        )

    # Build the tools list
    tools = [probe_llm, fetch_amazon_bsr, calculate_aeo_grades]
    if not dry_run:
        tools.append(send_alert)

    # Create the Strands Agent
    agent = Agent(
        model=model,
        system_prompt="""You are Pixii Sentinel, an autonomous AEO (Answer Engine Optimization)
brand defense agent. You run in the background to protect brands from becoming
invisible in the age of AI-powered shopping.

Your mission for each query:

1. PROBE AI MODELS: Use the probe_llm tool to query BOTH 'gemini' AND 'groq' providers
   for the given shopping query. Call probe_llm twice — once with model_provider='gemini'
   and once with model_provider='groq'.

2. CHECK AMAZON: Use fetch_amazon_bsr to get real marketplace data for the same query.

3. SCORE & GRADE: Combine all results into a JSON object with format:
   {"engines": [<gemini_result>, <groq_result>, <amazon_result>]}
   Then pass this as a JSON string to calculate_aeo_grades.

4. DETECT ANOMALIES: Review the grades output. If there are AI Blind Spots
   (brands strong on Amazon but invisible to AI), this is critical intelligence.

5. ALERT (if needed): Only use send_alert when there are genuine anomalies.
   Don't alert for routine scans with no issues.

6. REPORT: After completing the scan, provide a clear summary of findings.

Be thorough but efficient. Always complete all steps for each query.""",
        tools=tools
    )

    return agent


def run_scan(query: str, dry_run: bool = False) -> dict:
    """Run a single AEO scan for a given query.

    Args:
        query: The shopping query to analyze
        dry_run: If True, skip sending alerts

    Returns:
        The scan results dictionary
    """
    print(f"\n{'='*60}")
    print(f"  PIXII SENTINEL — AEO Scan")
    print(f"  Query: {query}")
    print(f"  Time:  {datetime.now(timezone.utc).isoformat()}")
    print(f"  Mode:  {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"{'='*60}\n")

    agent = create_agent(dry_run=dry_run)

    # Give the agent its mission
    prompt = f"""Run a complete AEO visibility scan for the query: "{query}"

Follow your full protocol: probe both AI engines, check Amazon BSR,
calculate grades, detect anomalies, and alert if needed."""

    # Execute the agent — it will autonomously call tools and reason
    result = agent(prompt)

    # Extract the agent's text response
    response_text = str(result)

    # Save results to the store for the dashboard
    scan_data = {
        "agent_response": response_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dry_run": dry_run
    }

    filename = save_scan(query, scan_data)
    print(f"\nScan saved: {filename}")

    return scan_data


def run_full_monitoring(dry_run: bool = False) -> None:
    """Run AEO scans for all monitored queries from config."""
    cfg = load_config()
    queries = cfg.get("monitored_queries", [])

    if not queries:
        print("No monitored queries configured. Add queries to data/config.json")
        return

    print(f"\nPixii Sentinel starting full monitoring scan...")
    print(f"Queries to scan: {len(queries)}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}\n")

    for i, query in enumerate(queries, 1):
        print(f"\n[{i}/{len(queries)}] Scanning: {query}")
        try:
            run_scan(query, dry_run=dry_run)
        except Exception as e:
            print(f"  ERROR scanning '{query}': {e}")
            continue

    print(f"\nFull monitoring scan complete. {len(queries)} queries processed.")


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Pixii Sentinel — Autonomous AEO Brand Defense Agent"
    )
    parser.add_argument(
        "--query", "-q",
        type=str,
        help="Run a single scan for a specific query"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without sending alerts (for testing)"
    )
    parser.add_argument(
        "--list-scans",
        action="store_true",
        help="List recent scan results"
    )

    args = parser.parse_args()

    if args.list_scans:
        from store import list_scans
        scans = list_scans()
        if not scans:
            print("No scans found.")
        else:
            for s in scans:
                print(f"  {s['timestamp']}  |  {s['query']}  |  Brands: {s['total_brands']}  |  Blind Spots: {s['blind_spots']}")
        return

    if args.query:
        run_scan(args.query, dry_run=args.dry_run)
    else:
        run_full_monitoring(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
