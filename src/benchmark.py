"""
AI Model Benchmarking Script
Runs tests on all configured models and saves results.

Scoring philosophy:
  - Speed and quality are SEPARATE leaderboards — never mixed into one number.
  - Quality score = average of: code correctness, reasoning accuracy, translation check.
  - Size categories: small (≤10B), medium (10–50B), large (50B+), unknown.
  - A small model beating other smalls is meaningful; ranking it against 671B is not.
"""

import os
import re
import sys
import json
import time
import argparse
from datetime import datetime
from pathlib import Path
import requests
from config import MODELS, TESTS

GROQ_API       = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions"

REQUEST_DELAY = {"groq": 2, "google": 8, "openrouter": 1}

# ── Ground-truth answers for reasoning tests ──────────────────────────────────
REASONING_ANSWERS = {
    "logic":  ["yes", "definitely", "all bloops are lazzies"],
    "math":   ["same", "equal", "both", "60 km/h", "60km/h"],   # both 60 km/h
    "puzzle": ["weigh", "group", "four", "4"],
}

# ── Size category helper ───────────────────────────────────────────────────────
def size_category(size_str: str) -> str:
    s = size_str.upper().replace(" ", "")
    if s in ("N/A", "UNKNOWN", ""):
        return "unknown"
    # MoE notation like 17Bx16E or 8x7B → use active params heuristic
    moe = re.search(r"(\d+(?:\.\d+)?)B\s*[Xx×]\s*(\d+)", s)
    if moe:
        # active params ≈ total/num_experts for sparse MoE
        active = float(moe.group(1))   # per-expert size
        return _bucket(active)
    plain = re.search(r"(\d+(?:\.\d+)?)B", s)
    if plain:
        return _bucket(float(plain.group(1)))
    return "unknown"

def _bucket(b: float) -> str:
    if b <= 10:  return "small"
    if b <= 50:  return "medium"
    return "large"


class ModelBenchmark:
    def __init__(self, active_providers=None, merge=False):
        self.groq_key        = os.getenv("GROQ_API_KEY")
        self.google_key      = os.getenv("GOOGLE_API_KEY")
        self.openrouter_key  = os.getenv("OPENROUTER_API_KEY")
        self.active_providers = active_providers   # None = all
        self.merge = merge                         # True = append to today's file
        self.results = []

    # ── Low-level HTTP ────────────────────────────────────────────────────────

    def _openai_post(self, url, headers, model_id, prompt, timeout=60):
        data = {
            "model": model_id,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,   # lower = more deterministic for evals
            "max_tokens": 350,
        }
        start = time.time()
        try:
            r = requests.post(url, headers=headers, json=data, timeout=timeout)
            elapsed = time.time() - start
            if r.status_code == 200:
                body = r.json()
                content = body["choices"][0]["message"]["content"]
                usage = body.get("usage", {})
                tokens = usage.get("total_tokens", 0) or usage.get("completion_tokens", 0)
                return {
                    "success": True, "content": content,
                    "total_time": round(elapsed, 3),
                    "tokens": tokens,
                    "tokens_per_sec": round(tokens / elapsed, 2) if elapsed > 0 else 0,
                }
            err = f"Status {r.status_code}"
            try:
                msg = r.json().get("error", {}).get("message", "")
                if msg: err += f" - {msg}"
            except Exception: pass
            return {"success": False, "error": err}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ── Provider callers ──────────────────────────────────────────────────────

    def call_groq(self, model_id, prompt):
        if not self.groq_key:
            return {"success": False, "error": "GROQ_API_KEY not set"}
        headers = {"Authorization": f"Bearer {self.groq_key}", "Content-Type": "application/json"}
        return self._openai_post(GROQ_API, headers, model_id, prompt)

    def call_google(self, model_id, prompt, retries=2):
        if not self.google_key:
            return {"success": False, "error": "GOOGLE_API_KEY not set"}
        url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
               f"{model_id}:generateContent?key={self.google_key}")
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600},
        }
        for attempt in range(retries + 1):
            start = time.time()
            try:
                r = requests.post(url, json=data, timeout=60)
                elapsed = time.time() - start
                if r.status_code == 200:
                    body = r.json()
                    if not body.get("candidates"):
                        return {"success": False, "error": "No candidates"}
                    content = body["candidates"][0]["content"]["parts"][0]["text"]
                    usage = body.get("usageMetadata", {})
                    tokens = usage.get("totalTokenCount", 0)
                    return {
                        "success": True, "content": content,
                        "total_time": round(elapsed, 3),
                        "tokens": tokens,
                        "tokens_per_sec": round(tokens / elapsed, 2) if elapsed > 0 else 0,
                    }
                elif r.status_code == 429 and attempt < retries:
                    wait = 65
                    try:
                        m = re.search(r"retry in (\d+(?:\.\d+)?)s",
                                      r.json().get("error", {}).get("message", ""))
                        if m: wait = float(m.group(1)) + 2
                    except Exception: pass
                    print(f"    ⏳ Google rate-limit, waiting {int(wait)}s ({attempt+1}/{retries})...")
                    time.sleep(wait)
                    continue
                else:
                    err = f"Status {r.status_code}"
                    try:
                        msg = r.json().get("error", {}).get("message", "")
                        if msg: err += f" - {msg}"
                    except Exception: pass
                    return {"success": False, "error": err}
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {"success": False, "error": "Rate-limit retries exhausted"}

    def call_openrouter(self, model_id, prompt):
        if not self.openrouter_key:
            return {"success": False, "error": "OPENROUTER_API_KEY not set"}
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/ModelArena",
            "X-Title": "ModelArena Benchmark",
        }
        return self._openai_post(OPENROUTER_API, headers, model_id, prompt, timeout=45)

    def _call(self, provider, model_id, prompt):
        return {"groq": self.call_groq, "google": self.call_google,
                "openrouter": self.call_openrouter}[provider](model_id, prompt)

    # ── Evaluators ────────────────────────────────────────────────────────────

    def eval_code(self, response: str) -> dict:
        """
        Extract code block from response, then apply heuristic checks.
        Returns score 0-100 and detail flags.
        """
        # Try to pull out the actual code block
        code_match = re.search(r"```(?:python)?\s*\n([\s\S]+?)```", response)
        code = code_match.group(1) if code_match else response

        has_def     = bool(re.search(r"\bdef\s+\w+\s*\(", code))
        has_return  = "return" in code
        has_comment = "#" in code or '"""' in code or "'''" in code
        has_logic   = any(k in code for k in ["if ", "for ", "while ", "and ", "or "])
        # Penalise if response looks like it has no code at all
        has_code_structure = has_def and has_return

        score = 0
        if has_code_structure: score += 50
        if has_comment:        score += 20
        if has_logic:          score += 20
        if has_def:            score += 10   # already counted but cap is 100
        return {
            "score": min(score, 100),
            "has_function": has_def,
            "has_return": has_return,
            "has_comments": has_comment,
            "has_logic": has_logic,
        }

    def eval_reasoning(self, test_name: str, response: str) -> dict:
        """Check if the response contains the expected answer keywords."""
        keywords = REASONING_ANSWERS.get(test_name, [])
        text = response.lower()
        correct = any(kw in text for kw in keywords)
        return {"correct": correct, "score": 100 if correct else 0}

    def eval_translation(self, test_name: str, response: str) -> dict:
        """
        Lightweight translation check:
        - en_ru: response should contain Cyrillic characters
        - ru_en: response should be mostly ASCII / Latin
        - complex: response should contain Spanish function words
        """
        if test_name == "en_ru":
            has_cyrillic = bool(re.search(r"[а-яёА-ЯЁ]", response))
            return {"score": 100 if has_cyrillic else 0, "detected_script": "cyrillic" if has_cyrillic else "none"}
        if test_name == "ru_en":
            latin_ratio = sum(1 for c in response if c.isascii() and c.isalpha()) / max(len(response), 1)
            ok = latin_ratio > 0.7
            return {"score": 100 if ok else 0, "latin_ratio": round(latin_ratio, 2)}
        if test_name == "complex":
            spanish_words = ["recursos", "computacionales", "aprendizaje", "máquina",
                             "modelos", "requieren", "sustanciales", "automatico"]
            ok = any(w in response.lower() for w in spanish_words)
            return {"score": 100 if ok else 0}
        return {"score": 50}  # unknown test, neutral

    # ── Per-model runner ──────────────────────────────────────────────────────

    def run_model(self, provider: str, model_info: dict) -> dict | None:
        delay = REQUEST_DELAY.get(provider, 3)
        mid   = model_info["id"]

        result = {
            "model_id":    model_info.get("key", mid),
            "model_name":  model_info["name"],
            "provider":    model_info["provider"],
            "size":        model_info["size"],
            "size_category": size_category(model_info["size"]),
            "context":     model_info.get("context", "N/A"),
            "timestamp":   datetime.now().isoformat(),
            "tests": {},
        }

        # ── 1. Speed ──────────────────────────────────────────────────────────
        print("  ⚡ Speed tests...")
        speed_raw = []
        for name, prompt in TESTS["speed"].items():
            r = self._call(provider, mid, prompt)
            if r["success"]:
                speed_raw.append({"test": name, "time": r["total_time"],
                                  "tokens_per_sec": r["tokens_per_sec"],
                                  "tokens": r["tokens"]})
            else:
                print(f"    ⚠️  speed/{name}: {r['error']}")
            time.sleep(delay)

        avg_tps = round(sum(x["tokens_per_sec"] for x in speed_raw) / len(speed_raw), 2) if speed_raw else 0
        result["tests"]["speed"] = {"avg_tokens_per_sec": avg_tps, "details": speed_raw}

        # ── 2. Code ───────────────────────────────────────────────────────────
        print("  💻 Code tests...")
        code_raw = []
        for name, prompt in TESTS["code"].items():
            r = self._call(provider, mid, prompt)
            if r["success"]:
                ev = self.eval_code(r["content"])
                code_raw.append({"test": name, **ev,
                                 "snippet": r["content"][:300]})
            else:
                print(f"    ⚠️  code/{name}: {r['error']}")
            time.sleep(delay)

        avg_code = round(sum(x["score"] for x in code_raw) / len(code_raw), 1) if code_raw else 0
        result["tests"]["code"] = {"avg_score": avg_code, "details": code_raw}

        # ── 3. Reasoning ──────────────────────────────────────────────────────
        print("  🧠 Reasoning tests...")
        reasoning_raw = []
        for name, prompt in TESTS["reasoning"].items():
            r = self._call(provider, mid, prompt)
            if r["success"]:
                ev = self.eval_reasoning(name, r["content"])
                reasoning_raw.append({"test": name, **ev,
                                      "answer_snippet": r["content"][:200]})
            else:
                print(f"    ⚠️  reasoning/{name}: {r['error']}")
            time.sleep(delay)

        correct_count = sum(1 for x in reasoning_raw if x.get("correct"))
        reasoning_score = round(correct_count / len(reasoning_raw) * 100, 1) if reasoning_raw else 0
        result["tests"]["reasoning"] = {
            "score": reasoning_score,
            "correct": correct_count,
            "total": len(reasoning_raw),
            "details": reasoning_raw,
        }

        # ── 4. Translation ────────────────────────────────────────────────────
        print("  🌍 Translation tests...")
        trans_raw = []
        for name, prompt in TESTS["translation"].items():
            r = self._call(provider, mid, prompt)
            if r["success"]:
                ev = self.eval_translation(name, r["content"])
                trans_raw.append({"test": name, **ev,
                                  "response_snippet": r["content"][:200]})
            else:
                print(f"    ⚠️  translation/{name}: {r['error']}")
            time.sleep(delay)

        avg_trans = round(sum(x["score"] for x in trans_raw) / len(trans_raw), 1) if trans_raw else 0
        result["tests"]["translation"] = {"avg_score": avg_trans, "details": trans_raw}

        # ── Quality score (no speed) ──────────────────────────────────────────
        # Weighted: code 40%, reasoning 40%, translation 20%
        quality = round(avg_code * 0.4 + reasoning_score * 0.4 + avg_trans * 0.2, 1)
        result["quality_score"] = quality

        # Speed score: normalised later in save_results (against the field)
        result["raw_speed"] = avg_tps

        # Legacy field so old frontend doesn't break
        result["overall_score"] = quality

        return result

    # ── Main ──────────────────────────────────────────────────────────────────

    def run_benchmark(self):
        print("🚀 Starting AI Model Benchmark...")
        print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        key_map = {"groq": self.groq_key, "google": self.google_key,
                   "openrouter": self.openrouter_key}
        active = [p.capitalize() for p, k in key_map.items() if k]
        print(f"🔑 Active providers: {', '.join(active) or 'none'}")

        for provider, models in MODELS.items():
            if self.active_providers and provider not in self.active_providers:
                print(f"\n⏭️  Skipping {provider} — not in --providers list")
                continue
            if not key_map.get(provider):
                print(f"\n⏭️  Skipping {provider} — API key not set")
                continue
            for mkey, minfo in models.items():
                minfo = dict(minfo, key=mkey)
                print(f"\n🤖 Testing {minfo['name']} [{size_category(minfo['size'])}]...")
                r = self.run_model(provider, minfo)
                if r:
                    self.results.append(r)
                    print(f"  ✅ quality={r['quality_score']}  speed={r['raw_speed']} tok/s")

        self.save_results()

    def save_results(self):
        date_str = datetime.now().strftime("%Y-%m-%d")
        Path("../docs/data/results").mkdir(parents=True, exist_ok=True)

        # Normalise speed score 0-100 within this run
        speeds = [r["raw_speed"] for r in self.results if r["raw_speed"] > 0]
        max_speed = max(speeds) if speeds else 1
        for r in self.results:
            r["speed_score"] = round(r["raw_speed"] / max_speed * 100, 1)

        # Daily snapshot — merge if flag set (Google runs after Groq)
        daily_path = Path(f"../docs/data/results/{date_str}.json")
        if self.merge and daily_path.exists():
            try:
                existing = json.loads(daily_path.read_text())
                # Replace models that we just tested, keep the rest
                tested_ids = {r["model_id"] for r in self.results}
                kept = [r for r in existing if r["model_id"] not in tested_ids]
                self.results = kept + self.results
                print(f"  ↩️  Merged with {len(kept)} existing results")
            except Exception as e:
                print(f"  ⚠️  Merge failed ({e}), overwriting")
        with open(daily_path, "w") as f:
            json.dump(self.results, f, indent=2)

        # Latest (used by frontend)
        with open("../docs/data/results/latest.json", "w") as f:
            json.dump({"date": date_str, "timestamp": datetime.now().isoformat(),
                       "results": self.results}, f, indent=2)

        # Quality leaderboard
        q_board = sorted(self.results, key=lambda x: x["quality_score"], reverse=True)
        with open("../docs/data/results/leaderboard.json", "w") as f:
            json.dump(q_board, f, indent=2)

        # Speed leaderboard (separate)
        s_board = sorted(self.results, key=lambda x: x["raw_speed"], reverse=True)
        with open("../docs/data/results/leaderboard_speed.json", "w") as f:
            json.dump(s_board, f, indent=2)

        print(f"\n💾 Results saved — {date_str}.json")
        print("🏆 Quality & speed leaderboards updated")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--providers",
        default=None,
        help="Comma-separated list of providers to run, e.g. groq,openrouter"
    )
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Merge results into existing daily file instead of overwriting"
    )
    args = parser.parse_args()

    active_providers = None
    if args.providers:
        active_providers = [p.strip().lower() for p in args.providers.split(",")]

    bench = ModelBenchmark(active_providers=active_providers, merge=args.merge)
    bench.run_benchmark()
    print("\n✨ Benchmark complete!")
