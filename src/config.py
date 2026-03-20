"""
Configuration for AI model benchmarks.
All models here are 100% free — no billing required.
  - Groq:       free tier, no credit card
  - Google:     free tier via AI Studio (aistudio.google.com)
  - OpenRouter: only :free suffix models ($0/M tokens, confirmed March 2026)
"""

MODELS = {
    "groq": {
        "llama-3.1-8b": {
            "id": "llama-3.1-8b-instant",
            "name": "Llama 3.1 8B Instant",
            "provider": "Groq",
            "size": "8B",
            "context": "128k"
        },
        "llama-3.3-70b": {
            "id": "llama-3.3-70b-versatile",
            "name": "Llama 3.3 70B Versatile",
            "provider": "Groq",
            "size": "70B",
            "context": "128k"
        },
        "llama-4-scout": {
            "id": "meta-llama/llama-4-scout-17b-16e-instruct",
            "name": "Llama 4 Scout 17B",
            "provider": "Groq",
            "size": "17Bx16E",
            "context": "131k"
        },
        "qwen3-32b": {
            "id": "qwen/qwen3-32b",
            "name": "Qwen 3 32B",
            "provider": "Groq",
            "size": "32B",
            "context": "32k"
        },
        "gpt-oss-120b": {
            "id": "openai/gpt-oss-120b",
            "name": "GPT-OSS 120B",
            "provider": "Groq",
            "size": "120B",
            "context": "128k"
        }
    },
    "google": {
        "gemini-2.0-flash": {
            "id": "gemini-2.0-flash",
            "name": "Gemini 2.0 Flash",
            "provider": "Google",
            "size": "N/A",
            "context": "1M"
        },
        "gemini-2.0-flash-lite": {
            "id": "gemini-2.0-flash-lite",
            "name": "Gemini 2.0 Flash Lite",
            "provider": "Google",
            "size": "N/A",
            "context": "1M"
        }
    },
    # OpenRouter: все с суффиксом :free — $0/M токенов, подтверждено март 2026.
    # Set OPENROUTER_API_KEY in GitHub Secrets to enable.
    "openrouter": {
        "step-3.5-flash": {
            "id": "stepfun/step-3.5-flash:free",
            "name": "Step 3.5 Flash",
            "provider": "OpenRouter",
            "size": "196B",
            "context": "256k"
        },
        "nemotron-super-120b": {
            "id": "nvidia/nemotron-3-super-120b-a12b:free",
            "name": "Nemotron 3 Super 120B",
            "provider": "OpenRouter",
            "size": "120B",
            "context": "262k"
        },
        "llama-3.3-70b": {
            "id": "meta-llama/llama-3.3-70b-instruct:free",
            "name": "Llama 3.3 70B (OR)",
            "provider": "OpenRouter",
            "size": "70B",
            "context": "66k"
        },
        "gpt-oss-120b": {
            "id": "openai/gpt-oss-120b:free",
            "name": "GPT-OSS 120B (OR)",
            "provider": "OpenRouter",
            "size": "120B",
            "context": "131k"
        },
        "gpt-oss-20b": {
            "id": "openai/gpt-oss-20b:free",
            "name": "GPT-OSS 20B",
            "provider": "OpenRouter",
            "size": "20B",
            "context": "131k"
        },
        "mistral-small-3.1": {
            "id": "mistralai/mistral-small-3.1-24b-instruct:free",
            "name": "Mistral Small 3.1 24B",
            "provider": "OpenRouter",
            "size": "24B",
            "context": "128k"
        },
        "minimax-m2.5": {
            "id": "minimax/minimax-m2.5:free",
            "name": "MiniMax M2.5",
            "provider": "OpenRouter",
            "size": "N/A",
            "context": "197k"
        },
        "qwen3-4b": {
            "id": "qwen/qwen3-4b:free",
            "name": "Qwen 3 4B",
            "provider": "OpenRouter",
            "size": "4B",
            "context": "41k"
        }
    }
}

TESTS = {
    "speed": {
        "simple": "Write a haiku about artificial intelligence.",
        "medium": "Explain quantum computing in simple terms (200 words).",
        "long": "Write a detailed tutorial on Python decorators with examples."
    },
    "code": {
        "easy": "Write a Python function to check if a number is prime.",
        "medium": "Create a binary search implementation in Python with comments.",
        "hard": "Implement a LRU cache in Python using OrderedDict."
    },
    "reasoning": {
        "logic": "If all bloops are razzies and all razzies are lazzies, are all bloops definitely lazzies?",
        "math": "A train travels 120 km in 2 hours. Another train travels 180 km in 3 hours. Which is faster?",
        "puzzle": "You have 12 balls, one is slightly heavier. Using a balance scale only 3 times, how do you find it?"
    },
    "translation": {
        "en_ru": "Translate to Russian: 'The quick brown fox jumps over the lazy dog.'",
        "ru_en": "Translate to English: 'Искусственный интеллект меняет мир.'",
        "complex": "Translate to Spanish: 'Machine learning models require substantial computational resources.'"
    }
}

EVALUATION = {
    "speed":       {"weight": 0.3, "metrics": ["ttft", "tokens_per_sec", "total_time"]},
    "code":        {"weight": 0.3, "metrics": ["syntax_valid", "runs_correctly", "has_comments"]},
    "reasoning":   {"weight": 0.2, "metrics": ["correct_answer", "explanation_quality"]},
    "translation": {"weight": 0.2, "metrics": ["accuracy", "fluency"]}
}

NEWS_SOURCES = {
    "groq":        {"url": "https://groq.com/blog/", "selector": "article", "keywords": ["release", "launch", "update", "model"]},
    "google":      {"url": "https://ai.google.dev/gemini-api/docs/changelog", "selector": ".changelog-entry", "keywords": ["gemini", "release", "update"]},
    "huggingface": {"rss": "https://huggingface.co/blog/feed.xml", "keywords": ["release", "model", "launch"]},
    "together":    {"url": "https://www.together.ai/blog", "selector": "article", "keywords": ["release", "model", "update"]}
}

RATE_LIMITS = {
    "groq": 30,
    "google": 15,
    "openrouter": 20
}
