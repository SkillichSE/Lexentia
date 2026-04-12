# Lexentia Proof

> **[skillichse.github.io/Lexentia-Proof](https://skillichse.github.io/Lexentia-Proof)**

**Free AI models, ranked every day.**

---

## What Is This?

Lexentia Proof is an automated daily benchmark that answers one question:

> **Which free AI model is actually the best right now?**

Every night, all tracked models are tested on tasks that matter in the real world — writing correct code, solving logic problems, following instructions precisely, and translating text. Results are published fresh each morning.

### Principles

- **No vibes grading.** Code is executed against expected outputs. Reasoning questions have known correct answers.
- **Speed and quality are always separate.** A small fast model and a large smart model can both rank #1 in their own category.
- **Completely free.** Every model tested requires no credit card, no subscription, no API payment.

---

## Scoring

Quality score is a weighted average across four task categories:

| Category | Weight | What's tested |
|---|---|---|
| 🧑‍💻 **Code** | 35% | Functions executed against unit tests |
| 🧠 **Reasoning** | 30% | Logic puzzles, probability, deduction |
| 📋 **Instruction Following** | 20% | JSON output, exact lists, sentence counts |
| 🌐 **Translation** | 15% | EN↔RU, EN→ES with script/keyword checks |

Models are grouped into **three size tiers** with difficulty-matched tests:

| Tier | Size | Task Difficulty |
|---|---|---|
| 🟢 Small | ≤ 10B | Basic recursion, simple logic, trivial functions |
| 🟡 Medium | 11–50B | Sorting, multi-step reasoning, structured output |
| 🔴 Large | > 50B | Graph algorithms, Knights & Knaves, Bayes traps |

Speed is measured separately (tokens/sec across short, medium, and long prompts) and never baked into the quality score.

---

## Current State — as of April 12, 2026

### Providers

| Provider | Models Tracked | Notes |
|---|---|---|
| **OpenRouter** | 9 | Free-tier models only (`:free` suffix) |
| **Groq** | 6 | Fast inference, some rate-limited to 30 req/min |
| **Google** | 3 | Gemini 2.5 Flash, Flash-Lite, Gemma 3 27B |
| **Cerebras** | 1 | Llama 3.1 8B — extremely fast wafer-scale inference |
| **SambaNova** | 1 | Llama 3.3 70B |

**Total models in rotation: 20**

> Models are added and removed as providers update their free-tier offerings. The config file (`src/config.py`) is the source of truth.

### Rate Limits (requests / minute)

| Provider | Limit |
|---|---|
| Groq | 30 |
| OpenRouter | 8 |
| Google | 4 |
| Together | 2 |
| SambaNova | 2 |
| Cerebras | 1 |

### Top 5 — Quality Leaderboard (April 12)

| Rank | Model | Provider | Tier | Quality | Speed (tok/s) |
|---|---|---|---|---|---|
| 🥇 1 | GPT-OSS 120B | Groq | Large | 100.0 | 547 |
| 🥈 2 | Kimi K2 | Groq | — | 97.7 | 246 |
| 🥉 3 | Gemini 2.5 Flash-Lite | Google | Medium | 97.7 | 142 |
| 4 | MiniMax M2.5 | OpenRouter | Medium | 97.7 | 3 |
| 5 | *(see site)* | — | — | — | — |

### How We Test

The benchmark pipeline runs via GitHub Actions every night (`/.github/workflows/benchmark.yml`):

1. For each model, send tier-appropriate prompts across all four categories
2. Execute code responses in a sandboxed Python environment and compare against expected outputs
3. Check reasoning answers for exact keyword match
4. Validate instruction outputs (JSON parsed, list items counted, sentences counted)
5. Check translation scripts (Cyrillic ratio, Latin ratio, keyword hits for Spanish)
6. Write results to `docs/data/results/YYYY-MM-DD.json` and update `latest.json`, `leaderboard.json`, `summary.json`
7. GitHub Pages serves the static site from `docs/`

### What's Being Worked On

```
- Delete methodology page and fix broken links
- Remove stale/garbage models from config
- Redo some tests (current ones need revision)
- JSON data structure refactor
- Clean up comments in source
```

---

## Repo Structure

```
LexentiaProof/
├── src/
│   ├── benchmark.py      # Main runner
│   ├── config.py         # Models + tests config
│   └── news_parser.py    # AI news feed parser
├── docs/                 # GitHub Pages site
│   ├── index.html        # Leaderboard
│   ├── providers.html    # Per-provider breakdown
│   ├── trends.html       # Historical charts
│   ├── search.html       # Model search
│   └── data/results/     # Daily JSON results
├── .github/workflows/
│   └── benchmark.yml     # Nightly CI job
└── requirements.txt      # requests, feedparser
```

---

## License

See [LICENSE](LICENSE).