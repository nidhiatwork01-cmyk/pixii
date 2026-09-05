import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from strands import tool


@tool
def send_alert(alert_type: str, brand: str, message: str, severity: str = "HIGH") -> dict:
    """Send an alert notification when a significant brand visibility change is detected.
    Only call this tool when there is a genuine anomaly that requires human attention.

    Args:
        alert_type: Type of alert - 'AI_BLIND_SPOT', 'VISIBILITY_DROP', 'NEW_COMPETITOR'
        brand: The brand name the alert is about
        message: Clear description of what was detected and why it matters
        severity: Alert severity - 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'

    Returns:
        Dictionary confirming alert was sent with timestamp
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    alert_record = {
        "timestamp": timestamp,
        "type": alert_type,
        "brand": brand,
        "message": message,
        "severity": severity,
        "delivered": False
    }

    # Try sending email if SMTP credentials are configured
    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    alert_email = os.environ.get("ALERT_EMAIL", "")

    if smtp_host and smtp_user and smtp_pass and alert_email:
        try:
            _send_email(
                smtp_host=smtp_host,
                smtp_port=int(os.environ.get("SMTP_PORT", "587")),
                smtp_user=smtp_user,
                smtp_pass=smtp_pass,
                to_email=alert_email,
                subject=f"[Pixii Sentinel] {severity}: {alert_type} — {brand}",
                body=_format_email_body(alert_type, brand, message, severity, timestamp)
            )
            alert_record["delivered"] = True
            alert_record["channel"] = "email"
        except Exception as e:
            alert_record["delivery_error"] = str(e)
            alert_record["channel"] = "console_fallback"
    else:
        # Console fallback for demos without email configured
        alert_record["channel"] = "console"
        print(f"\n{'='*60}")
        print(f"  PIXII SENTINEL ALERT [{severity}]")
        print(f"  Type: {alert_type}")
        print(f"  Brand: {brand}")
        print(f"  {message}")
        print(f"  Time: {timestamp}")
        print(f"{'='*60}\n")
        alert_record["delivered"] = True

    # Save alert to local log
    _save_alert_log(alert_record)

    return alert_record


def _send_email(smtp_host: str, smtp_port: int, smtp_user: str, smtp_pass: str,
                to_email: str, subject: str, body: str) -> None:
    """Send alert email via SMTP."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())


def _format_email_body(alert_type: str, brand: str, message: str,
                       severity: str, timestamp: str) -> str:
    """Format a clean HTML email body for the alert."""
    severity_colors = {
        "CRITICAL": "#EF4444",
        "HIGH": "#F59E0B",
        "MEDIUM": "#6366F1",
        "LOW": "#10B981"
    }
    color = severity_colors.get(severity, "#6366F1")

    return f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0B; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="border-left: 4px solid {color}; padding-left: 16px; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 20px; color: {color};">Pixii Sentinel Alert</h1>
            <p style="margin: 4px 0 0; color: #71717A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">{alert_type} &bull; {severity}</p>
        </div>
        <div style="background: #111116; border: 1px solid #27272A; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <h2 style="margin: 0 0 8px; font-size: 18px;">{brand}</h2>
            <p style="margin: 0; color: #A1A1AA; line-height: 1.6;">{message}</p>
        </div>
        <p style="color: #52525B; font-size: 11px; margin: 0;">Detected at {timestamp} by Pixii Sentinel AEO Agent</p>
    </div>
    """


def _save_alert_log(alert_record: dict) -> None:
    """Append alert to local alerts log file."""
    import pathlib
    alerts_dir = pathlib.Path(__file__).parent.parent.parent / "data" / "alerts"
    alerts_dir.mkdir(parents=True, exist_ok=True)

    alerts_file = alerts_dir / "alerts.jsonl"
    with open(alerts_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(alert_record) + "\n")
