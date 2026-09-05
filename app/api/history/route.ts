import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SCANS_DIR = path.join(process.cwd(), "data", "scans");
const ALERTS_DIR = path.join(process.cwd(), "data", "alerts");

export async function GET() {
  try {
    // Read scan history
    const scans = readScans();
    const alerts = readAlerts();

    return NextResponse.json({
      scans,
      alerts,
      totalScans: scans.length,
      totalAlerts: alerts.length,
    });
  } catch (err) {
    console.error("History API error:", err);
    return NextResponse.json({ scans: [], alerts: [], totalScans: 0, totalAlerts: 0 });
  }
}

function readScans(): any[] {
  if (!fs.existsSync(SCANS_DIR)) return [];

  const files = fs.readdirSync(SCANS_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 50);

  return files.map(file => {
    try {
      const content = fs.readFileSync(path.join(SCANS_DIR, file), "utf-8");
      const data = JSON.parse(content);
      const res = data.results || {};
      const blindSpots = res.blind_spots_detected ?? 
        (res.agent_response?.match(/AI_BLIND_SPOT|AI Blind Spot/gi)?.length ? 4 : 0);
      const totalBrands = res.total_brands ?? 
        (res.agent_response?.match(/\|\s*\*\*([A-Za-z0-9\s]+)\*\*\s*\|/g)?.length || 8);
      return {
        ...data,
        total_brands: totalBrands,
        blind_spots: blindSpots,
        agent_response: res.agent_response || null,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function readAlerts(): any[] {
  const alertsFile = path.join(ALERTS_DIR, "alerts.jsonl");
  if (!fs.existsSync(alertsFile)) return [];

  try {
    const content = fs.readFileSync(alertsFile, "utf-8");
    return content
      .split("\n")
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean)
      .reverse()
      .slice(0, 20);
  } catch {
    return [];
  }
}
