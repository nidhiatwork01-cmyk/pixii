# Pixii Sentinel — Architecture

## System Architecture Diagram

```mermaid
flowchart TB
    subgraph TRIGGER["Trigger Layer"]
        CRON["Scheduled Cron<br/>(EventBridge / Local)"]
        MANUAL["Manual Scan<br/>(Dashboard Button)"]
    end

    subgraph AGENT["Strands Agent (Python)"]
        direction TB
        BRAIN["Agent Brain<br/>LiteLLM + Gemini 2.0 Flash"]
        
        subgraph TOOLS["Agent Tools"]
            T1["probe_llm<br/>Query AI Models"]
            T2["fetch_amazon_bsr<br/>Amazon Best Sellers"]
            T3["calculate_aeo_grades<br/>A-F Visibility Scoring"]
            T4["send_alert<br/>Email Notifications"]
        end
        
        BRAIN -->|"THINK → ACT"| T1
        BRAIN -->|"THINK → ACT"| T2
        BRAIN -->|"OBSERVE → THINK"| T3
        BRAIN -->|"DECIDE → ACT"| T4
    end

    subgraph MODELS["AI Models Probed"]
        GEMINI["Google Gemini<br/>2.0 Flash"]
        GROQ["Groq Llama<br/>3.3 70B"]
    end

    subgraph DATA["Data Layer"]
        STORE["JSON Result Store<br/>data/scans/*.json"]
        ALERTS["Alert Log<br/>data/alerts/alerts.jsonl"]
        CONFIG["Monitoring Config<br/>data/config.json"]
    end

    subgraph DASHBOARD["Next.js Dashboard"]
        direction TB
        HOME["Home Page<br/>Agent Status + Search"]
        RESULTS["Results Page<br/>Engine Columns + Score Card"]
        HISTORY["History Page<br/>Trend Charts + Alert Feed"]
    end

    subgraph NOTIFY["Alert Channels"]
        EMAIL["Email via SMTP"]
    end

    CRON -->|triggers| BRAIN
    MANUAL -->|triggers| BRAIN
    T1 -->|queries| GEMINI
    T1 -->|queries| GROQ
    T2 -->|queries| AMAZON["Amazon<br/>Rainforest API"]
    T3 -->|writes| STORE
    T4 -->|writes| ALERTS
    T4 -->|sends| EMAIL
    STORE -->|reads| DASHBOARD
    ALERTS -->|reads| HISTORY
    CONFIG -->|reads| BRAIN

    style AGENT fill:#1a1a2e,stroke:#6366F1,stroke-width:2px,color:#fff
    style BRAIN fill:#6366F1,stroke:#818CF8,color:#fff
    style TOOLS fill:#111116,stroke:#27272A,color:#fff
    style DASHBOARD fill:#0A0A0B,stroke:#F5A623,stroke-width:2px,color:#fff
    style TRIGGER fill:#111116,stroke:#22D3EE,color:#fff
    style MODELS fill:#111116,stroke:#10B981,color:#fff
```

## Agent Execution Flow (ReAct Loop)

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant A as Strands Agent
    participant G as Gemini API
    participant L as Groq/Llama API
    participant B as Amazon BSR
    participant D as Data Store
    participant E as Email

    S->>A: Trigger scan for "best korean sunscreen"
    
    Note over A: THINK: I need to probe AI models first
    A->>G: probe_llm(query, "gemini")
    G-->>A: {brands: ["COSRX", "Beauty of Joseon", ...]}
    
    Note over A: THINK: Now check the other AI engine
    A->>L: probe_llm(query, "groq")
    L-->>A: {brands: ["Supergoop", "COSRX", ...]}
    
    Note over A: THINK: Cross-reference with real sales data
    A->>B: fetch_amazon_bsr(query)
    B-->>A: {brands: ["Biore", "COSRX", "La Roche-Posay", ...]}
    
    Note over A: THINK: Calculate grades and detect anomalies
    A->>A: calculate_aeo_grades(combined_results)
    A-->>A: {grades: [...], anomalies: [{type: "AI_BLIND_SPOT", brand: "Biore"}]}
    
    Note over A: THINK: Biore is #3 on Amazon but invisible to AI! Alert needed.
    A->>E: send_alert("AI_BLIND_SPOT", "Biore", "...")
    A->>D: save_scan(query, results)
    
    Note over A: DONE: Scan complete, anomaly reported
```

## Data Flow

```
Input:  Monitored shopping queries (from config.json)
  │
  ▼
Agent probes AI models + Amazon simultaneously
  │
  ▼
Results compared and graded (A–F visibility score)
  │
  ├── Normal results → Saved silently to data/scans/
  │
  └── Anomaly detected → Alert sent via email
                        → Saved to data/alerts/
                        → Visible on dashboard
```

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| Agent Framework | Strands Agents SDK | Autonomous tool-calling agent loop |
| Agent LLM | Google Gemini 2.0 Flash (via LiteLLM) | Agent reasoning and decision-making |
| Probed AI Models | Gemini + Groq Llama 3.3 | Brand recommendation extraction |
| Market Data | Rainforest API (Amazon) | Real-world BSR cross-reference |
| Dashboard | Next.js 16 + Tailwind CSS | Premium analytics UI |
| Alerting | SMTP Email | Human notification on anomalies |
| Data Store | JSON files | Scan results + alert history |
| Deployment | Vercel (Dashboard) + Local/AWS (Agent) | Production hosting |
