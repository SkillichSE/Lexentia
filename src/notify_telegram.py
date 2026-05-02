#!/usr/bin/env python3
# klyxe telegram daily report
# runs after benchmark via github actions
# reads today/yesterday from public/data/results/YYYY-MM-DD.json
# sends report to telegram channel

import json
import os
import requests
from datetime import datetime, timedelta
from pathlib import Path

# config
BOT_TOKEN   = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID     = os.environ["TELEGRAM_CHAT_ID"]  # channel id like -100xxxxxxxxxx
RESULTS_DIR = Path(__file__).parent.parent / "public" / "data" / "results"
SITE_URL    = "https://klyxe-ai.vercel.app"

# alert thresholds
SCORE_DROP_WARN     = 10
SCORE_DROP_CRITICAL = 25
SPEED_DROP_PCT      = 30   # percent
RATE_LIMIT_RATIO    = 0.5  # fraction of tests returning 429


# load data

def load_day(date: datetime) -> list:
    path = RESULTS_DIR / f"{date.strftime('%Y-%m-%d')}.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def index(models: list) -> dict:
    # index models by model_id for fast lookup
    return {m["model_id"]: m for m in models}


# alert detection

def check_rate_limit(model: dict) -> float:
    # returns fraction of tests that returned 429
    total = 0
    failed = 0
    for cat in model.get("tests", {}).values():
        for d in cat.get("details", []):
            total += 1
            if isinstance(d.get("error"), str) and "429" in d["error"]:
                failed += 1
    if total == 0:
        return 0.0
    return failed / total

def get_alerts(today_list: list, yesterday_list: list) -> list:
    today     = index(today_list)
    yesterday = index(yesterday_list)
    alerts = []

    for mid, t in today.items():
        p = yesterday.get(mid)

        # check rate limit storm
        rl = check_rate_limit(t)
        if rl >= RATE_LIMIT_RATIO:
            alerts.append({
                "level":    "critical" if rl == 1.0 else "warning",
                "type":     "rate_limit",
                "name":     t["model_name"],
                "provider": t["provider"],
                "msg":      "fully unavailable (all requests returned 429)" if rl == 1.0
                            else f"rate limited: {int(rl*100)}% of tests blocked",
            })
            continue  # skip other checks for this model

        if not p:
            continue  # new model, nothing to compare

        # check score drop
        drop = p["overall_score"] - t["overall_score"]
        if drop >= SCORE_DROP_CRITICAL:
            alerts.append({
                "level": "critical", "type": "score_drop",
                "name": t["model_name"], "provider": t["provider"],
                "msg": f"score dropped by {drop:.0f} pts ({p['overall_score']:.0f} to {t['overall_score']:.0f})",
            })
        elif drop >= SCORE_DROP_WARN:
            alerts.append({
                "level": "warning", "type": "score_drop",
                "name": t["model_name"], "provider": t["provider"],
                "msg": f"score dropped by {drop:.0f} pts ({p['overall_score']:.0f} to {t['overall_score']:.0f})",
            })

        # check recovery after previous degradation
        gain = t["overall_score"] - p["overall_score"]
        if gain >= SCORE_DROP_WARN and p["overall_score"] < 60:
            alerts.append({
                "level": "good", "type": "recovery",
                "name": t["model_name"], "provider": t["provider"],
                "msg": f"recovered +{gain:.0f} pts ({p['overall_score']:.0f} to {t['overall_score']:.0f})",
            })

        # check speed drop
        ps = p.get("raw_speed", 0)
        ts = t.get("raw_speed", 0)
        if ps > 0 and ts > 0:
            speed_drop = (ps - ts) / ps * 100
            if speed_drop >= SPEED_DROP_PCT:
                alerts.append({
                    "level": "warning", "type": "speed_drop",
                    "name": t["model_name"], "provider": t["provider"],
                    "msg": f"speed dropped {speed_drop:.0f}% ({ps:.0f} to {ts:.0f} tok/s)",
                })

    # sort: critical first, then warning, then good news
    order = {"critical": 0, "warning": 1, "good": 2}
    return sorted(alerts, key=lambda a: order[a["level"]])


# top models

def get_top(models: list, n=3) -> list:
    # filter out models that failed completely
    valid = [m for m in models if m.get("overall_score", 0) > 10]
    return sorted(valid, key=lambda m: m["overall_score"], reverse=True)[:n]


# message formatting

EMOJI = {"critical": "🔴", "warning": "🟡", "good": "🟢"}

def format_message(today: list, alerts: list, date: str) -> str:
    lines = []
    lines.append(f"📊 <b>Klyxe Daily — {date}</b>")
    lines.append(f"Models tested: <b>{len(today)}</b>\n")

    # top 3 models
    top = get_top(today)
    if top:
        lines.append("🏆 <b>Top today</b>")
        medals = ["🥇", "🥈", "🥉"]
        for i, m in enumerate(top):
            speed = f" · {m['raw_speed']:.0f} tok/s" if m.get("raw_speed") else ""
            lines.append(
                f"{medals[i]} {m['model_name']} ({m['provider']}) — "
                f"<b>{m['overall_score']:.0f}/100</b>{speed}"
            )
        lines.append("")

    # alerts section
    if alerts:
        lines.append("⚠️ <b>Changes since yesterday</b>")
        for a in alerts:
            lines.append(f"{EMOJI[a['level']]} <b>{a['name']}</b> ({a['provider']}) — {a['msg']}")
        lines.append("")
    else:
        lines.append("✅ All models running stable\n")

    lines.append(f"→ <a href='{SITE_URL}'>Full ranking on Klyxe</a>")
    return "\n".join(lines)


# send to telegram

def send(text: str):
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    resp = requests.post(url, json={
        "chat_id":    CHAT_ID,
        "text":       text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }, timeout=15)
    resp.raise_for_status()
    print("sent")


# entry point

def main():
    today_dt     = datetime.utcnow()
    yesterday_dt = today_dt - timedelta(days=1)

    today_data     = load_day(today_dt)
    yesterday_data = load_day(yesterday_dt)

    if not today_data:
        print("no data for today, skipping")
        return

    alerts  = get_alerts(today_data, yesterday_data)
    message = format_message(today_data, alerts, today_dt.strftime("%Y-%m-%d"))
    send(message)


if __name__ == "__main__":
    main()
