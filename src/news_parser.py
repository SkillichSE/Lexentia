"""
News Parser for ModelArena
Fetches AI news from reliable RSS feeds.
"""

import json
import re
import feedparser
from datetime import datetime, timezone
from pathlib import Path
from email.utils import parsedate_to_datetime

# RSS feeds that reliably cover AI model releases and updates
RSS_FEEDS = [
    {
        "url": "https://huggingface.co/blog/feed.xml",
        "source": "Hugging Face",
        "keywords": ["model", "release", "launch", "llm", "benchmark", "fine-tun", "open"]
    },
    {
        "url": "https://blog.google/technology/ai/rss/",
        "source": "Google AI Blog",
        "keywords": ["gemini", "model", "ai", "release", "update"]
    },
    {
        "url": "https://aws.amazon.com/blogs/machine-learning/feed/",
        "source": "AWS ML Blog",
        "keywords": ["model", "llm", "inference", "release", "bedrock", "sagemaker"]
    },
    {
        "url": "https://developer.nvidia.com/blog/feed/",
        "source": "NVIDIA Developer",
        "keywords": ["model", "llm", "inference", "release", "nim", "gpu"]
    },
    {
        "url": "https://www.together.ai/blog/rss.xml",
        "source": "Together AI",
        "keywords": ["model", "release", "open", "inference", "fine-tun"]
    },
]

KEYWORDS_ALWAYS_INCLUDE = [
    "llm", "language model", "gpt", "llama", "gemini", "claude", "mistral",
    "qwen", "deepseek", "release", "launched", "benchmark", "open source",
    "open-source", "api", "fine-tun", "instruct", "inference"
]


def parse_date(entry) -> str:
    """Try to extract a parseable ISO date from a feed entry."""
    for field in ("published", "updated", "created"):
        val = entry.get(field, "")
        if not val:
            continue
        try:
            dt = parsedate_to_datetime(val)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass
        # Already ISO-ish
        if "T" in val or val.count("-") >= 2:
            return val
    return datetime.now(timezone.utc).isoformat()


def is_relevant(title: str, summary: str, keywords: list) -> bool:
    text = (title + " " + summary).lower()
    feed_match   = any(kw.lower() in text for kw in keywords)
    global_match = any(kw in text for kw in KEYWORDS_ALWAYS_INCLUDE)
    return feed_match or global_match


def clean_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:280]


def fetch_all_news() -> list:
    items = []
    seen_titles = set()

    for feed_cfg in RSS_FEEDS:
        print(f"  📡 {feed_cfg['source']}...", end=" ", flush=True)
        try:
            feed = feedparser.parse(feed_cfg["url"])
            count = 0
            for entry in feed.entries[:15]:
                title   = entry.get("title", "").strip()
                link    = entry.get("link", "")
                summary = clean_html(entry.get("summary", entry.get("description", "")))

                if not title or title in seen_titles:
                    continue
                if not is_relevant(title, summary, feed_cfg["keywords"]):
                    continue

                seen_titles.add(title)
                items.append({
                    "title":   title,
                    "link":    link,
                    "date":    parse_date(entry),
                    "source":  feed_cfg["source"],
                    "summary": summary,
                })
                count += 1

            print(f"{count} items")
        except Exception as e:
            print(f"⚠️  error: {e}")

    # Sort newest first
    items.sort(key=lambda x: x["date"], reverse=True)

    # Deduplicate by title again (cross-feed)
    seen = set()
    unique = []
    for item in items:
        if item["title"] not in seen:
            seen.add(item["title"])
            unique.append(item)

    return unique[:30]


def save_news(items: list):
    Path("../docs/data/results").mkdir(parents=True, exist_ok=True)
    out = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "count":   len(items),
        "items":   items,
    }
    path = "../docs/data/results/news.json"
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"💾 {len(items)} news items saved")


if __name__ == "__main__":
    print("🔍 Fetching AI news...")
    items = fetch_all_news()
    save_news(items)
    print("✨ Done!")
