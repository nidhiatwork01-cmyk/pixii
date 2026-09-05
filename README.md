# Pixii Sentinel — Autonomous AEO Brand Defense Agent

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Strands Agents](https://img.shields.io/badge/Strands_Agents_SDK-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

> **"The blue links are dead. When AI answers the shopping question, is your brand in the answer?"**

**[Live Demo](https://pixii-5zqb.vercel.app/)**

---

## The Problem

Every day, millions of consumers ask AI assistants *"What's the best sunscreen?"* or *"Which protein powder should I buy?"* — and the AI gives a definitive answer. Not a list of links. **An answer.**

If your brand isn't in that answer, you've silently lost the sale. And you don't even know it happened.

**The shift from Search Engine Optimization (SEO) to Answer Engine Optimization (AEO) is the biggest disruption in e-commerce since mobile.** Yet most brands have zero visibility into what AI models recommend — and no way to monitor it at scale.

## Who It's For

E-commerce founders, brand managers, DTC marketers, and SEO/AEO agencies who need to:
- Know which brands AI recommends for their product category
- Detect when competitors overtake them in AI recommendations
- Discover "AI Blind Spots" — products selling well on Amazon but invisible to AI
- Track visibility trends over time without manual checking

## The Solution: Pixii Sentinel

**Pixii Sentinel** is an autonomous agent built with the **Strands Agents SDK** that handles the repetitive, judgment-heavy task of monitoring brand visibility across AI engines.

Instead of manually querying ChatGPT, Gemini, and Claude every day, the agent:

1. **Runs autonomously** on a configurable schedule
2. **Probes multiple AI engines** (Gemini, Llama) with your monitored queries
3. **Cross-references Amazon** Best Seller data for ground-truth comparison
4. **Calculates visibility grades** (A–F) for every brand detected
5. **Detects anomalies** — AI Blind Spots, visibility drops, new competitors
6. **Alerts via email** only when human action is genuinely needed
7. **Records everything** to a premium analytics dashboard

The founder never opens the app to check. The agent runs in the background and only surfaces when there's a real decision to make.

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagrams.

```
┌─────────────────────────────────────────────────────────┐
│              Strands Agent (Python)                      │
│                                                         │
│  Schedule ──► Agent Brain (Gemini via LiteLLM)          │
│                  │                                      │
│                  ├── probe_llm() ──► Gemini + Groq API  │
│                  ├── fetch_amazon_bsr() ──► Amazon API  │
│                  ├── calculate_aeo_grades() ──► A–F     │
│                  └── send_alert() ──► Email / Console   │
│                                                         │
│              Results saved to data/scans/*.json         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│           Next.js Dashboard (Vercel)                     │
│                                                          │
│  • Real-time agent status                                │
│  • Historical scan results + trend charts                │
│  • Alert feed                                            │
│  • Manual on-demand scans                                │
│  • Premium dark-mode analytics UI                        │
└──────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Agent Framework | **Strands Agents SDK** (Python) |
| Agent LLM | Google Gemini 2.0 Flash (via LiteLLM) |
| Probed AI Models | Gemini + Groq Llama 3.3 70B |
| Market Data | Rainforest API (Amazon BSR) |
| Dashboard | Next.js 16 + Tailwind CSS |
| Alerting | SMTP Email |
| Deployment | Vercel (Dashboard) |

## How Strands Agents SDK Is Used

The agent is built using the core Strands primitives:

- **`Agent()`** — Creates the autonomous agent with a model, system prompt, and tools
- **`@tool`** decorator — Defines 4 custom tools the agent can call:
  - `probe_llm` — Queries AI models for brand recommendations
  - `fetch_amazon_bsr` — Fetches real Amazon Best Seller data
  - `calculate_aeo_grades` — Computes A–F visibility scores and detects blind spots
  - `send_alert` — Sends email notifications on anomalies
- **`LiteLLMModel`** — Connects the agent to Gemini (extensible to Bedrock, OpenAI, etc.)
- **ReAct Loop** — The agent autonomously reasons through the scanning protocol, deciding when to call each tool and when to alert

---

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.10+
- Google AI API Key (Gemini)
- Groq API Key

### 1. Clone and Install

```bash
git clone https://github.com/nidhiatwork01-cmyk/pixii.git
cd pixii

# Install dashboard dependencies
npm install

# Set up Python virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install agent dependencies
pip install -r agent/requirements.txt
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```env
# AI Model API Keys
GOOGLE_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key

# Amazon Data (optional — simulated data used if not set)
RAINFOREST_KEY=your_rainforest_key

# Email Alerts (optional — console alerts used if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ALERT_EMAIL=founder@yourbrand.com
```

### 3. Run the Agent

```bash
# Single query scan (dry run — no alerts sent)
python agent/main.py --query "best korean sunscreen" --dry-run

# Single query scan (live — sends alerts if anomalies found)
python agent/main.py --query "best korean sunscreen"

# Full monitoring scan (all configured queries)
python agent/main.py
```

### 4. Launch the Dashboard

```bash
npm run dev
# Open http://localhost:3000
# View agent history at http://localhost:3000/history
```

---

## Hackathon Track

**Professional Agents** — An agent that makes someone dramatically better at the work they already do. Pixii Sentinel targets the repetitive, judgment-heavy task of monitoring brand visibility across AI recommendation engines.

## Why It Matters

The global e-commerce market is $6.3 trillion. As AI assistants become the primary shopping interface, **brand visibility in AI responses will determine market share.** Pixii Sentinel gives brands the intelligence to compete in this new landscape — automatically, continuously, and without human busywork.

---

Built with Strands Agents SDK for the Agents for Humans Hackathon.
