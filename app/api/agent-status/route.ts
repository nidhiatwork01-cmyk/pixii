import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SCANS_DIR = path.join(process.cwd(), "data", "scans");
const ALERTS_DIR = path.join(process.cwd(), "data", "alerts");
const CONFIG_FILE = path.join(process.cwd(), "data", "config.json");

export async function GET() {
  try {
    // Count scans
    let totalScans = 0;
    let lastScanTime: string | null = null;
    if (fs.existsSync(SCANS_DIR)) {
      const files = fs.readdirSync(SCANS_DIR).filter(f => f.endsWith(".json")).sort().reverse();
      totalScans = files.length;
      if (files.length > 0) {
        try {
          const latest = JSON.parse(fs.readFileSync(path.join(SCANS_DIR, files[0]), "utf-8"));
          lastScanTime = latest.timestamp || null;
        } catch { /* ignore */ }
      }
    }

    // Count alerts
    let totalAlerts = 0;
    if (fs.existsSync(path.join(ALERTS_DIR, "alerts.jsonl"))) {
      const content = fs.readFileSync(path.join(ALERTS_DIR, "alerts.jsonl"), "utf-8");
      totalAlerts = content.split("\n").filter(l => l.trim()).length;
    }

    // Read config
    let monitoredQueries: string[] = [];
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      monitoredQueries = config.monitored_queries || [];
    }

    return NextResponse.json({
      status: "operational",
      totalScans,
      totalAlerts,
      lastScanTime,
      monitoredQueries,
      agent: "Pixii Sentinel",
      framework: "Strands Agents SDK",
    });
  } catch (err) {
    console.error("Agent status error:", err);
    return NextResponse.json({ status: "error", error: String(err) }, { status: 500 });
  }
}
