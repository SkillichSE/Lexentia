MODELS = {
    "groq": {
        # PRODUCTION MODELS (6 моделей)
        "llama-3.1-8b": {
            "id": "llama-3.1-8b-instant",
            "name": "Llama 3.1 8B Instant",
            "provider": "Groq",
            "size": "8B",
            "size_category": "small",
            "context": "131k"
        },
        "llama-3.2-1b": {
            "id": "llama-3.2-1b-preview",
            "name": "Llama 3.2 1B",
            "provider": "Groq",
            "size": "1B",
            "size_category": "small",
            "context": "128k"
        },
        "llama-3.2-3b": {
            "id": "llama-3.2-3b-preview",
            "name": "Llama 3.2 3B",
            "provider": "Groq",
            "size": "3B",
            "size_category": "small",
            "context": "128k"
        },
        "llama-3.3-70b": {
            "id": "llama-3.3-70b-versatile",
            "name": "Llama 3.3 70B",
            "provider": "Groq",
            "size": "70B",
            "size_category": "large",
            "context": "131k"
        },
        "gpt-oss-120b": {
            "id": "openai/gpt-oss-120b",
            "name": "GPT OSS 120B",
            "provider": "Groq",
            "size": "120B",
            "size_category": "large",
            "context": "131k"
        },
        "gpt-oss-20b": {
            "id": "openai/gpt-oss-20b",
            "name": "GPT OSS 20B",
            "provider": "Groq",
            "size": "20B",
            "size_category": "medium",
            "context": "131k"
        },
        
        # PREVIEW MODELS (3 модели)
        "llama-4-scout": {
            "id": "meta-llama/llama-4-scout-17b-16e-instruct",
            "name": "Llama 4 Scout 17B",
            "provider": "Groq",
            "size": "17B",
            "size_category": "medium",
            "context": "131k"
        },
        "kimi-k2": {
            "id": "moonshotai/kimi-k2-instruct-0905",
            "name": "Kimi K2",
            "provider": "Groq",
            "size": "14B",
            "size_category": "medium",
            "context": "262k"
        },
        "qwen3-32b": {
            "id": "qwen/qwen3-32b",
            "name": "Qwen3 32B",
            "provider": "Groq",
            "size": "32B",
            "size_category": "medium",
            "context": "131k"
        },
    },
    
    "openrouter": {
        # META LLAMA MODELS
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
        "llama-3.1-70b": {
            "id": "meta-llama/llama-3.1-70b-instruct:free",
            "name": "Llama 3.1 70B",
            "provider": "OpenRouter",
            "size": "70B",
            "size_category": "large",
            "context": "131k"
        },
        "llama-3.1-405b": {
            "id": "meta-llama/llama-3.1-405b-instruct:free",
            "name": "Llama 3.1 405B",
            "provider": "OpenRouter",
            "size": "405B",
            "size_category": "large",
            "context": "131k"
        },
        "llama-3.3-70b": {
            "id": "meta-llama/llama-3.3-70b-instruct:free",
            "name": "Llama 3.3 70B",
            "provider": "OpenRouter",
            "size": "70B",
            "size_category": "large",
            "context": "131k"
        },
        "llama-4-maverick": {
            "id": "meta-llama/llama-4-maverick:free",
            "name": "Llama 4 Maverick",
            "provider": "OpenRouter",
            "size": "405B",
            "size_category": "large",
            "context": "131k"
        },
        "llama-4-scout": {
            "id": "meta-llama/llama-4-scout:free",
            "name": "Llama 4 Scout",
            "provider": "OpenRouter",
            "size": "17B",
            "size_category": "medium",
            "context": "131k"
        },
        
        # QWEN MODELS
        "qwen-2.5-7b": {
            "id": "qwen/qwen-2.5-7b-instruct:free",
            "name": "Qwen 2.5 7B",
            "provider": "OpenRouter",
            "size": "7B",
            "size_category": "small",
            "context": "32k"
        },
        "qwen-2.5-72b": {
            "id": "qwen/qwen-2.5-72b-instruct:free",
            "name": "Qwen 2.5 72B",
            "provider": "OpenRouter",
            "size": "72B",
            "size_category": "large",
            "context": "131k"
        },
        "qwen-2.5-vl-3b": {
            "id": "qwen/qwen2.5-vl-3b-instruct:free",
            "name": "Qwen 2.5 VL 3B",
            "provider": "OpenRouter",
            "size": "3B",
            "size_category": "small",
            "context": "32k"
        },
        
        # MISTRAL MODELS
        "mistral-7b": {
            "id": "mistralai/mistral-7b-instruct:free",
            "name": "Mistral 7B",
            "provider": "OpenRouter",
            "size": "7B",
            "size_category": "small",
            "context": "32k"
        },
        "mistral-nemo": {
            "id": "mistralai/mistral-nemo:free",
            "name": "Mistral Nemo 12B",
            "provider": "OpenRouter",
            "size": "12B",
            "size_category": "medium",
            "context": "128k"
        },
        "mistral-small-3.1": {
            "id": "mistralai/mistral-small-3.1-24b-instruct:free",
            "name": "Mistral Small 3.1 24B",
            "provider": "OpenRouter",
            "size": "24B",
            "size_category": "medium",
            "context": "128k"
        },
        
        # GOOGLE MODELS
        "gemini-2.0-flash": {
            "id": "google/gemini-2.0-flash-exp:free",
            "name": "Gemini 2.0 Flash",
            "provider": "OpenRouter",
            "size": "?",
            "size_category": "medium",
            "context": "1048k"
        },
        "gemini-2.5-flash": {
            "id": "google/gemini-2.5-flash-exp:free",
            "name": "Gemini 2.5 Flash",
            "provider": "OpenRouter",
            "size": "?",
            "size_category": "medium",
            "context": "1048k"
        },
        "gemini-2.5-pro": {
            "id": "google/gemini-2.5-pro-exp-03-25:free",
            "name": "Gemini 2.5 Pro",
            "provider": "OpenRouter",
            "size": "?",
            "size_category": "large",
            "context": "2097k"
        },
        "gemma-2-9b": {
            "id": "google/gemma-2-9b-it:free",
            "name": "Gemma 2 9B",
            "provider": "OpenRouter",
            "size": "9B",
            "size_category": "small",
            "context": "8k"
        },
        
        # MICROSOFT PHI MODELS
        "phi-3-medium": {
            "id": "microsoft/phi-3-medium-128k-instruct:free",
            "name": "Phi-3 Medium 14B",
            "provider": "OpenRouter",
            "size": "14B",
            "size_category": "medium",
            "context": "128k"
        },
        "phi-3-mini": {
            "id": "microsoft/phi-3-mini-128k-instruct:free",
            "name": "Phi-3 Mini 3.8B",
            "provider": "OpenRouter",
            "size": "3.8B",
            "size_category": "small",
            "context": "128k"
        },
        
        # NVIDIA MODELS
        "nemotron-nano-8b": {
            "id": "nvidia/llama-3.1-nemotron-nano-8b-v1:free",
            "name": "Nemotron Nano 8B",
            "provider": "OpenRouter",
            "size": "8B",
            "size_category": "small",
            "context": "131k"
        },
        
        # DEEPSEEK MODELS
        "deepseek-v3": {
            "id": "deepseek/deepseek-chat-v3-0324:free",
            "name": "DeepSeek V3",
            "provider": "OpenRouter",
            "size": "671B",
            "size_category": "large",
            "context": "64k"
        },
        "deepseek-v3-base": {
            "id": "deepseek/deepseek-v3-base:free",
            "name": "DeepSeek V3 Base",
            "provider": "OpenRouter",
            "size": "671B",
            "size_category": "large",
            "context": "64k"
        },
        "deepseek-r1-zero": {
            "id": "deepseek/deepseek-r1-zero:free",
            "name": "DeepSeek R1 Zero",
            "provider": "OpenRouter",
            "size": "671B",
            "size_category": "large",
            "context": "64k"
        },
        
        # MOONSHOT AI
        "kimi-vl-a3b": {
            "id": "moonshotai/kimi-vl-a3b-thinking:free",
            "name": "Kimi VL A3B",
            "provider": "OpenRouter",
            "size": "3B",
            "size_category": "small",
            "context": "32k"
        },
        
        # NOUS RESEARCH
        "deephermes-3": {
            "id": "nousresearch/deephermes-3-llama-3-8b-preview:free",
            "name": "DeepHermes 3 8B",
            "provider": "OpenRouter",
            "size": "8B",
            "size_category": "small",
            "context": "8k"
        },
        
        # COMMUNITY MODELS
        "mythomax-13b": {
            "id": "gryphe/mythomax-l2-13b:free",
            "name": "MythoMax 13B",
            "provider": "OpenRouter",
            "size": "13B",
            "size_category": "medium",
            "context": "8k"
        },
        "toppy-m-7b": {
            "id": "undi95/toppy-m-7b:free",
            "name": "Toppy M 7B",
            "provider": "OpenRouter",
            "size": "7B",
            "size_category": "small",
            "context": "4k"
        },
        
        # ALLENAI
        "olmo-3.1-32b": {
            "id": "allenai/olmo-3.1-32b-think:free",
            "name": "OLMo 3.1 32B",
            "provider": "OpenRouter",
            "size": "32B",
            "size_category": "medium",
            "context": "131k"
        },
        
        # STEPFUN (новая модель!)
        "step-3.5-flash": {
            "id": "stepfun/step-3.5-flash:free",
            "name": "Step 3.5 Flash",
            "provider": "OpenRouter",
            "size": "196B",
            "size_category": "large",
            "context": "1048k"
        },
    },
}

# Rate limits (requests per minute)
RATE_LIMITS = {
    "groq": 30,         # Increased from 25 (Groq has high limits)
    "openrouter": 8,    # Kept at 8 for safety with key rotation
}

# Test categories and weights
TESTS = {
    "speed": {
        "weight": 0,  # Speed is separate, not in quality score
        "tests": [
            {"name": "simple", "prompt": "Write a haiku about AI", "expected_tokens": 50},
            {"name": "medium", "prompt": "Write a 200-word essay about the future of technology", "expected_tokens": 300},
            {"name": "long", "prompt": "Write a 300-word story about a robot learning to paint", "expected_tokens": 400}
        ]
    },
    "code": {
        "weight": 0.30,
        "tests": [
            {
                "name": "prime",
                "prompt": "Write a Python function called is_prime(n) that returns True if n is prime, False otherwise. Return ONLY the function code, no explanations.",
                "test_cases": [
                    {"input": "2", "expected": "True"},
                    {"input": "3", "expected": "True"},
                    {"input": "4", "expected": "False"},
                    {"input": "17", "expected": "True"},
                    {"input": "100", "expected": "False"}
                ]
            },
            {
                "name": "fibonacci",
                "prompt": "Write a Python function called fibonacci(n) that returns the nth Fibonacci number. Return ONLY the function code, no explanations.",
                "test_cases": [
                    {"input": "0", "expected": "0"},
                    {"input": "1", "expected": "1"},
                    {"input": "7", "expected": "13"},
                    {"input": "10", "expected": "55"}
                ]
            },
            {
                "name": "palindrome",
                "prompt": "Write a Python function called is_palindrome(s) that returns True if the string is a palindrome, False otherwise. Return ONLY the function code, no explanations.",
                "test_cases": [
                    {"input": "'racecar'", "expected": "True"},
                    {"input": "'hello'", "expected": "False"},
                    {"input": "'A man a plan a canal Panama'", "expected": "True"},
                    {"input": "'python'", "expected": "False"},
                    {"input": "'Was it a rat I saw'", "expected": "True"}
                ]
            }
        ]
    },
    "reasoning": {
        "weight": 0.25,
        "tests": [
            {
                "name": "syllogism",
                "prompt": "All cats are mammals. All mammals are animals. Therefore, all cats are ___? Answer with just one word.",
                "correct_answers": ["animals"]
            },
            {
                "name": "speed_math",
                "prompt": "If a car travels 60 miles in 2 hours, what is its average speed in miles per hour? Answer with just the number.",
                "correct_answers": ["30"]
            },
            {
                "name": "river_crossing",
                "prompt": "A farmer needs to cross a river with a fox, a chicken, and a bag of grain. The boat can only hold the farmer and one item. If left alone, the fox will eat the chicken, and the chicken will eat the grain. In what order should the farmer transport them? Answer with the first item taken across.",
                "correct_answers": ["chicken"]
            },
            {
                "name": "coin_flip",
                "prompt": "I flip a fair coin 3 times and get heads each time. What is the probability of getting heads on the 4th flip? Answer as a fraction or decimal.",
                "correct_answers": ["1/2", "0.5", "50%", "half"]
            },
            {
                "name": "counting",
                "prompt": "How many R's are in the word 'strawberry'? Answer with just the number.",
                "correct_answers": ["3", "three"]
            }
        ]
    },
    "instruction": {
        "weight": 0.25,
        "tests": [
            {
                "name": "json",
                "prompt": 'Return a JSON object with exactly these keys: "name", "age", "city". Fill with example values. Return ONLY valid JSON, no other text.',
                "check": lambda r: all(k in r for k in ["name", "age", "city"])
            },
            {
                "name": "list",
                "prompt": "List exactly 5 programming languages. Format as a numbered list (1., 2., etc.). No other text.",
                "check": lambda r: r.count("\n") >= 4 and any(str(i) in r for i in range(1, 6))
            },
            {
                "name": "word_count",
                "prompt": "Write exactly 3 sentences about the ocean. Each sentence must be on a new line. No other text.",
                "check": lambda r: r.count("\n") >= 2 and r.count(".") >= 3
            }
        ]
    },
    "translation": {
        "weight": 0.20,
        "tests": [
            {
                "name": "en_ru",
                "prompt": "Translate to Russian: 'Artificial intelligence is changing the world.' Return ONLY the translation.",
                "check": lambda r: any(c in "абвгдеёжзийклмнопрстуфхцчшщъыьэюя" for c in r.lower())
            },
            {
                "name": "ru_en",
                "prompt": "Translate to English: 'Программирование это искусство создания алгоритмов.' Return ONLY the translation.",
                "check": lambda r: "programm" in r.lower() or "algorithm" in r.lower()
            },
            {
                "name": "en_es",
                "prompt": "Translate to Spanish: 'Technology advances rapidly every day.' Return ONLY the translation.",
                "check": lambda r: any(word in r.lower() for word in ["tecnología", "avanza", "rápidamente"])
            }
        ]
    }
}
