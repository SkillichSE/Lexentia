"""
Configuration for AI model benchmarks
"""

# Models to test
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
        "gemma2-9b": {
            "id": "gemma2-9b-it",
            "name": "Gemma 2 9B",
            "provider": "Groq",
            "size": "9B",
            "context": "8k"
        },
        "mixtral-8x7b": {
            "id": "mixtral-8x7b-32768",
            "name": "Mixtral 8x7B",
            "provider": "Groq",
            "size": "8x7B",
            "context": "32k"
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
    # OpenRouter gives access to many models via a single API key.
    # Set OPENROUTER_API_KEY in GitHub Secrets to enable these.
    "openrouter": {
        "deepseek-r1": {
            "id": "deepseek/deepseek-r1",
            "name": "DeepSeek R1",
            "provider": "OpenRouter",
            "size": "671B",
            "context": "64k"
        },
        "deepseek-v3": {
            "id": "deepseek/deepseek-chat-v3-5",
            "name": "DeepSeek V3",
            "provider": "OpenRouter",
            "size": "671B",
            "context": "64k"
        },
        "claude-haiku": {
            "id": "anthropic/claude-haiku-4-5",
            "name": "Claude Haiku 4.5",
            "provider": "OpenRouter",
            "size": "N/A",
            "context": "200k"
        },
        "qwen-3-235b": {
            "id": "qwen/qwen3-235b-a22b",
            "name": "Qwen 3 235B",
            "provider": "OpenRouter",
            "size": "235B",
            "context": "41k"
        },
        "mistral-small": {
            "id": "mistralai/mistral-small-3.2-24b-instruct",
            "name": "Mistral Small 3.2 24B",
            "provider": "OpenRouter",
            "size": "24B",
            "context": "128k"
        },
        "llama-4-maverick": {
            "id": "meta-llama/llama-4-maverick",
            "name": "Llama 4 Maverick",
            "provider": "OpenRouter",
            "size": "17Bx128E",
            "context": "1M"
        }
    }
}

# Test prompts
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

# Evaluation criteria
EVALUATION = {
    "speed": {
        "weight": 0.3,
        "metrics": ["ttft", "tokens_per_sec", "total_time"]
    },
    "code": {
        "weight": 0.3,
        "metrics": ["syntax_valid", "runs_correctly", "has_comments"]
    },
    "reasoning": {
        "weight": 0.2,
        "metrics": ["correct_answer", "explanation_quality"]
    },
    "translation": {
        "weight": 0.2,
        "metrics": ["accuracy", "fluency"]
    }
}

# News sources to monitor
NEWS_SOURCES = {
    "groq": {
        "url": "https://groq.com/blog/",
        "selector": "article",
        "keywords": ["release", "launch", "update", "model"]
    },
    "google": {
        "url": "https://ai.google.dev/gemini-api/docs/changelog",
        "selector": ".changelog-entry",
        "keywords": ["gemini", "release", "update"]
    },
    "huggingface": {
        "rss": "https://huggingface.co/blog/feed.xml",
        "keywords": ["release", "model", "launch"]
    },
    "together": {
        "url": "https://www.together.ai/blog",
        "selector": "article",
        "keywords": ["release", "model", "update"]
    }
}

# Rate limits (requests per minute)
RATE_LIMITS = {
    "groq": 30,
    "google": 60,
    "openrouter": 20,
    "together": 20,
    "huggingface": 10
}
