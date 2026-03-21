MODELS = {
    "groq": {
        "llama-3.1-8b": {
            "id": "llama-3.1-8b-instant",
            "name": "Llama 3.1 8B",
            "provider": "Groq",
            "size": "8B",
            "size_category": "small",
            "context": "128k"
        },
        "llama-3.3-70b": {
            "id": "llama-3.3-70b-versatile",
            "name": "Llama 3.3 70B",
            "provider": "Groq",
            "size": "70B",
            "size_category": "large",
            "context": "128k"
        },
        "mixtral-8x7b": {
            "id": "mixtral-8x7b-32768",
            "name": "Mixtral 8x7B",
            "provider": "Groq",
            "size": "47B",
            "size_category": "medium",
            "context": "32k"
        },
        "gemma2-9b": {
            "id": "gemma2-9b-it",
            "name": "Gemma 2 9B",
            "provider": "Groq",
            "size": "9B",
            "size_category": "small",
            "context": "8k"
        }
    },
    "openrouter": {
        "llama-3.2-1b": {
            "id": "meta-llama/llama-3.2-1b-instruct:free",
            "name": "Llama 3.2 1B",
            "provider": "OpenRouter",
            "size": "1B",
            "size_category": "small",
            "context": "131k"
        },
        "llama-3.2-3b": {
            "id": "meta-llama/llama-3.2-3b-instruct:free",
            "name": "Llama 3.2 3B",
            "provider": "OpenRouter",
            "size": "3B",
            "size_category": "small",
            "context": "131k"
        },
        "llama-3.1-8b": {
            "id": "meta-llama/llama-3.1-8b-instruct:free",
            "name": "Llama 3.1 8B",
            "provider": "OpenRouter",
            "size": "8B",
            "size_category": "small",
            "context": "131k"
        },
        "qwen-2.5-7b": {
            "id": "qwen/qwen-2.5-7b-instruct:free",
            "name": "Qwen 2.5 7B",
            "provider": "OpenRouter",
            "size": "7B",
            "size_category": "small",
            "context": "128k"
        },
        "qwen-2.5-coder-7b": {
            "id": "qwen/qwen-2.5-coder-7b-instruct:free",
            "name": "Qwen 2.5 Coder 7B",
            "provider": "OpenRouter",
            "size": "7B",
            "size_category": "small",
            "context": "128k"
        },
        "mistral-nemo": {
            "id": "mistralai/mistral-nemo:free",
            "name": "Mistral Nemo",
            "provider": "OpenRouter",
            "size": "12B",
            "size_category": "medium",
            "context": "128k"
        },
        "phi-3-mini": {
            "id": "microsoft/phi-3-mini-128k-instruct:free",
            "name": "Phi-3 Mini",
            "provider": "OpenRouter",
            "size": "3.8B",
            "size_category": "small",
            "context": "128k"
        },
        "deepseek-chat": {
            "id": "deepseek/deepseek-chat:free",
            "name": "DeepSeek Chat",
            "provider": "OpenRouter",
            "size": "67B",
            "size_category": "large",
            "context": "128k"
        },
        "deepseek-coder": {
            "id": "deepseek/deepseek-coder:free",
            "name": "DeepSeek Coder",
            "provider": "OpenRouter",
            "size": "33B",
            "size_category": "large",
            "context": "128k"
        },
        "gemma-2-9b": {
            "id": "google/gemma-2-9b-it:free",
            "name": "Gemma 2 9B",
            "provider": "OpenRouter",
            "size": "9B",
            "size_category": "small",
            "context": "8k"
        }
    }
}

TESTS = {
    "speed": {
        "simple": "Write a haiku about artificial intelligence.",
        "medium": "Explain quantum computing in simple terms (200 words).",
        "long": "Write a detailed tutorial on Python decorators with examples (300 words)."
    },
    "code": {
        "prime": {
            "prompt": "Write a Python function called is_prime(n) that returns True if n is prime, False otherwise. Return ONLY the function.",
            "fn": "is_prime",
            "test_input": [2, 3, 4, 17, 100],
            "expected": [True, True, False, True, False]
        },
        "fibonacci": {
            "prompt": "Write a Python function called fibonacci(n) that returns the nth Fibonacci number. Return ONLY the function.",
            "fn": "fibonacci",
            "test_input": [0, 1, 7, 10],
            "expected": [0, 1, 13, 55]
        }
    },
    "reasoning": {
        "logic": {
            "prompt": "If all bloops are razzies and all razzies are lazzies, are all bloops lazzies? Answer Yes or No.",
            "answer": "yes"
        }
    }
}

RATE_LIMITS = {
    "groq": 25,
    "openrouter": 10
}
