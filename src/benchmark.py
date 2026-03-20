"""
AI Model Benchmarking Script
Runs tests on all configured models and saves results
"""

import os
import json
import time
from datetime import datetime
from pathlib import Path
import requests
from config import MODELS, TESTS, EVALUATION

# API endpoints
GROQ_API = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions"


class ModelBenchmark:
    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.google_key = os.getenv("GOOGLE_API_KEY")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")
        self.results = []

    def _openai_compat_request(self, url, headers, model_id, prompt, timeout=60):
        """Generic OpenAI-compatible chat completion request."""
        data = {
            "model": model_id,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 500
        }
        start = time.time()
        try:
            response = requests.post(url, headers=headers, json=data, timeout=timeout)
            end = time.time()

            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                usage = result.get("usage", {})
                total_tokens = usage.get("total_tokens", 0) or usage.get("completion_tokens", 0)
                elapsed = end - start
                return {
                    "success": True,
                    "content": content,
                    "total_time": elapsed,
                    "tokens": total_tokens,
                    "tokens_per_sec": total_tokens / elapsed if elapsed > 0 else 0
                }
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_data = response.json()
                    if "error" in error_data:
                        error_msg += f" - {error_data['error'].get('message', '')}"
                except Exception:
                    pass
                return {"success": False, "error": error_msg}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def test_groq_model(self, model_id, prompt):
        """Test a Groq model."""
        if not self.groq_key:
            return {"success": False, "error": "GROQ_API_KEY not set"}
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json"
        }
        return self._openai_compat_request(GROQ_API, headers, model_id, prompt)

    def test_google_model(self, model_id, prompt):
        """Test a Google Gemini model via generateContent API."""
        if not self.google_key:
            return {"success": False, "error": "GOOGLE_API_KEY not set"}

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_id}:generateContent?key={self.google_key}"
        )
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 500}
        }
        start = time.time()
        try:
            response = requests.post(url, json=data, timeout=60)
            end = time.time()
            if response.status_code == 200:
                result = response.json()
                if "candidates" not in result or not result["candidates"]:
                    return {"success": False, "error": "No candidates in response"}
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                usage = result.get("usageMetadata", {})
                total_tokens = usage.get("totalTokenCount", 0)
                elapsed = end - start
                return {
                    "success": True,
                    "content": content,
                    "total_time": elapsed,
                    "tokens": total_tokens,
                    "tokens_per_sec": total_tokens / elapsed if elapsed > 0 else 0
                }
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_data = response.json()
                    if "error" in error_data:
                        error_msg += f" - {error_data['error'].get('message', '')}"
                except Exception:
                    pass
                return {"success": False, "error": error_msg}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def test_openrouter_model(self, model_id, prompt):
        """Test a model via OpenRouter (OpenAI-compatible endpoint)."""
        if not self.openrouter_key:
            return {"success": False, "error": "OPENROUTER_API_KEY not set — skipping"}
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/ModelArena",
            "X-Title": "ModelArena Benchmark"
        }
        return self._openai_compat_request(OPENROUTER_API, headers, model_id, prompt, timeout=90)

    def evaluate_code(self, code):
        """Simple heuristic code quality score (0-100)."""
        score = 0
        if "def " in code and ":" in code:
            score += 40
        if "#" in code or '"""' in code:
            score += 30
        if "return" in code:
            score += 30
        return min(score, 100)

    def _run_tests_for_model(self, provider, model_info):
        """Run speed + code tests for a single model, return results dict."""
        dispatch = {
            "groq": self.test_groq_model,
            "google": self.test_google_model,
            "openrouter": self.test_openrouter_model,
        }
        test_fn = dispatch.get(provider)
        if test_fn is None:
            print(f"  ⚠️  Unknown provider '{provider}', skipping")
            return None

        model_results = {
            "model_id": model_info["id"],
            "model_name": model_info["name"],
            "provider": model_info["provider"],
            "size": model_info["size"],
            "context": model_info.get("context", "N/A"),
            "timestamp": datetime.now().isoformat(),
            "tests": {}
        }

        # Speed tests
        print("  ⚡ Speed tests...")
        speed_results = []
        for test_name, prompt in TESTS["speed"].items():
            result = test_fn(model_info["id"], prompt)
            if result["success"]:
                speed_results.append({
                    "test": test_name,
                    "time": round(result["total_time"], 3),
                    "tokens_per_sec": round(result["tokens_per_sec"], 2)
                })
            else:
                print(f"    ⚠️  Speed test '{test_name}' failed: {result.get('error', 'Unknown')}")
            time.sleep(2)

        avg_speed = (
            sum(r["tokens_per_sec"] for r in speed_results) / len(speed_results)
            if speed_results else 0
        )
        model_results["tests"]["speed"] = {
            "avg_tokens_per_sec": round(avg_speed, 2),
            "details": speed_results
        }

        # Code tests
        print("  💻 Code tests...")
        code_results = []
        for test_name, prompt in TESTS["code"].items():
            result = test_fn(model_info["id"], prompt)
            if result["success"]:
                score = self.evaluate_code(result["content"])
                code_results.append({
                    "test": test_name,
                    "score": score,
                    "code": result["content"][:200]
                })
            else:
                print(f"    ⚠️  Code test '{test_name}' failed: {result.get('error', 'Unknown')}")
            time.sleep(2)

        avg_code = (
            sum(r["score"] for r in code_results) / len(code_results)
            if code_results else 0
        )
        model_results["tests"]["code"] = {
            "avg_score": round(avg_code, 2),
            "details": code_results
        }

        overall = (avg_speed / 10) * 0.5 + avg_code * 0.5
        model_results["overall_score"] = round(overall, 2)
        return model_results

    def run_benchmark(self):
        """Run full benchmark suite."""
        print("🚀 Starting AI Model Benchmark...")
        print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Report which providers are active
        active = []
        if self.groq_key:
            active.append("Groq")
        if self.google_key:
            active.append("Google")
        if self.openrouter_key:
            active.append("OpenRouter")
        print(f"🔑 Active providers: {', '.join(active) if active else 'none — check secrets!'}")

        for provider, models in MODELS.items():
            # Skip providers with no key configured
            key_map = {
                "groq": self.groq_key,
                "google": self.google_key,
                "openrouter": self.openrouter_key,
            }
            if not key_map.get(provider):
                print(f"\n⏭️  Skipping {provider.capitalize()} — API key not set")
                continue

            for model_key, model_info in models.items():
                print(f"\n🤖 Testing {model_info['name']}...")
                result = self._run_tests_for_model(provider, model_info)
                if result:
                    self.results.append(result)
                    print(f"  ✅ Overall score: {result['overall_score']:.2f}")

        self.save_results()

    def save_results(self):
        """Save results to JSON files."""
        date_str = datetime.now().strftime("%Y-%m-%d")
        Path("../docs/data/results").mkdir(parents=True, exist_ok=True)

        daily_file = f"../docs/data/results/{date_str}.json"
        with open(daily_file, "w") as f:
            json.dump(self.results, f, indent=2)

        latest_file = "../docs/data/results/latest.json"
        with open(latest_file, "w") as f:
            json.dump({
                "date": date_str,
                "timestamp": datetime.now().isoformat(),
                "results": self.results
            }, f, indent=2)

        leaderboard = sorted(self.results, key=lambda x: x["overall_score"], reverse=True)
        leaderboard_file = "../docs/data/results/leaderboard.json"
        with open(leaderboard_file, "w") as f:
            json.dump(leaderboard, f, indent=2)

        print(f"\n💾 Results saved to {daily_file}")
        print("🏆 Leaderboard updated")


if __name__ == "__main__":
    benchmark = ModelBenchmark()
    benchmark.run_benchmark()
    print("\n✨ Benchmark complete!")
