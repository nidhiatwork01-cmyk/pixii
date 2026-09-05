"""Pixii Sentinel — Configuration

Loads environment variables and monitoring settings.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env.local")

# API Keys
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
RAINFOREST_KEY = os.environ.get("RAINFOREST_KEY", "")

# Email Alert Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
ALERT_EMAIL = os.environ.get("ALERT_EMAIL", "")

# Agent Settings
AGENT_MODEL = os.environ.get("AGENT_MODEL", "gemini/gemini-2.0-flash")
