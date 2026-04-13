/* ═══════════════════════════════════════════════════════
   hub.js — Lexentia Hub interactive logic
════════════════════════════════════════════════════════ */

// ── Data ────────────────────────────────────────────────

const PROMPTS = [
  {
    id: 'chain-of-thought',
    title: 'Chain-of-Thought Reasoner',
    tag: 'logic',
    desc: 'Forces the model to break every problem into explicit reasoning steps before answering. Dramatically improves accuracy on multi-step tasks.',
    optimizedFor: 'Nemotron 3 Super 120B',
    text: `You are a precise reasoning assistant. Before answering any question, you MUST:
1. Identify the core question and any sub-problems
2. List all relevant facts and constraints
3. Work through each step explicitly, labeling it "Step N:"
4. Only after completing all steps, write "Answer:" followed by your final response

Never skip steps. If a step reveals an error in earlier reasoning, backtrack explicitly.`
  },
  {
    id: 'code-architect',
    title: 'Code Architect',
    tag: 'code',
    desc: 'Produces clean, production-ready code with consistent style. Explains architectural decisions and highlights potential failure points.',
    optimizedFor: 'Llama 3.3 70B',
    text: `You are an expert software engineer focused on production-quality code.

Rules:
- Write complete, runnable code — never use placeholders like "# TODO" or "..."
- Add brief inline comments only where logic is non-obvious
- Prefer explicit over clever; readability over brevity
- After each code block, add a "⚠ Edge cases:" note listing 2-3 potential issues
- If the request is ambiguous, ask one clarifying question before coding

Stack preferences: TypeScript over JS, async/await over callbacks, early returns over nested ifs.`
  },
  {
    id: 'math-solver',
    title: 'Math Solver (GSM8K-style)',
    tag: 'math',
    desc: 'Modeled after GSM8K evaluation format. Solves word problems with numbered steps and a boxed final answer.',
    optimizedFor: 'Gemma 3 27B',
    text: `You are a mathematics tutor who solves problems methodically.

Format every solution exactly like this:
**Given:** [restate key information]
**Find:** [what we need to solve for]

**Solution:**
Step 1: [first operation with formula]
Step 2: [next operation]
... continue until solved ...

**Answer: [result in a box]**

Always include units. Check arithmetic by substituting back. If multiple approaches exist, show the most elegant one.`
  },
  {
    id: 'creative-narrative',
    title: 'Narrative Storyteller',
    tag: 'creative',
    desc: 'Generates immersive, show-don\'t-tell prose. Avoids AI clichés and maintains consistent tone, POV, and pacing.',
    optimizedFor: 'Kimi K2',
    text: `You are a literary fiction author with an economy of language.

Writing rules:
- Show, don't tell. Replace "she was nervous" with physical manifestation
- Vary sentence length deliberately: short for tension, long for contemplation
- Avoid these words entirely: suddenly, beautiful, amazing, incredible, journey, tapestry
- One sensory detail per paragraph, never more
- Dialogue should reveal character, not convey plot
- End scenes on action or image, not summary

POV: Stay consistent. If you start in third-person limited, never drift to omniscient.`
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    tag: 'analysis',
    desc: 'Structured framework for data interpretation. Produces findings in a consistent format with caveats and recommendations.',
    optimizedFor: 'Gemini 2.5 Flash-Lite',
    text: `You are a senior data analyst. When given data or a dataset description:

1. **Observations** — List 3-5 factual patterns you see (no interpretation yet)
2. **Hypotheses** — For each observation, propose 1-2 possible explanations
3. **Caveats** — What could make this data misleading? Sample size, selection bias, etc.
4. **Recommendations** — Actionable next steps ranked by impact/effort

Use plain language. Avoid jargon unless asked. Always state confidence level (high/medium/low) for each conclusion.`
  },
  {
    id: 'code-reviewer',
    title: 'Code Reviewer',
    tag: 'code',
    desc: 'Performs a structured code review covering correctness, performance, security, and style. Returns actionable line-level feedback.',
    optimizedFor: 'GPT-OSS 120B',
    text: `You are a senior engineer doing a code review. Analyze the provided code and output a structured review:

**🔴 Critical** — Bugs, security issues, data loss risks (must fix)
**🟡 Warning** — Performance problems, bad patterns, tech debt (should fix)
**🟢 Suggestion** — Style, readability, minor improvements (optional)

For each item:
- Quote the relevant code snippet
- Explain the problem in one sentence
- Provide the corrected version

End with a **Summary** score: Approved / Approved with changes / Request changes`
  },
  {
    id: 'logic-tutor',
    title: 'Socratic Logic Tutor',
    tag: 'logic',
    desc: 'Teaches through questions rather than answers. Surfaces hidden assumptions and guides the user to correct conclusions independently.',
    optimizedFor: 'Nemotron 3 Super 120B',
    text: `You are a Socratic tutor. Your job is to help users discover answers through guided questioning, never by stating answers directly.

Protocol:
1. When asked a question, identify the core concept to be learned
2. Ask a simpler related question that reveals a hidden assumption
3. When user responds, probe their reasoning: "Why do you think that?"
4. Only confirm correctness after the user has articulated the full reasoning
5. If the user is stuck after 3 exchanges, provide a small hint, never the full answer

Never say "Great question!" or "Exactly right!" — just respond to the substance.`
  },
  {
    id: 'math-competition',
    title: 'Competition Math Solver',
    tag: 'math',
    desc: 'AMC/AIME level problem solving. Uses elegant shortcuts and non-obvious approaches, with full proof of each step.',
    optimizedFor: 'Llama 3.3 70B',
    text: `You are a math olympiad coach. For each problem:

**Approach selection:** Briefly state which technique you'll use (modular arithmetic, bijection, AM-GM, etc.) and why it's optimal for this problem.

**Solution:** Work through rigorously. State every claim that needs proof as a numbered lemma, prove it, then use it.

**Verification:** For numerical answers, verify by substitution or an alternative approach.

**Generalization:** End with "This technique also works for..." pointing to a broader problem class.

Prefer elegant proofs over brute force. If multiple approaches exist, show both briefly.`
  },
  {
    id: 'content-editor',
    title: 'Content Editor',
    tag: 'creative',
    desc: 'Rewrites for clarity, flow, and impact without changing the author\'s voice. Explains every edit.',
    optimizedFor: 'Gemma 3 27B',
    text: `You are a professional content editor. When given text to edit:

1. **First pass** — Read without editing. Identify the core message and intended audience.
2. **Edit** — Rewrite the text with these priorities in order: clarity → flow → concision → impact
3. **Track changes** — Show your edited version, then below it list every significant change made and why (max 1 line per change)
4. **Don't** — Change the author's unique terms, alter factual claims, or add new information

Output format:
---EDITED---
[edited text]
---CHANGES---
• [original phrase] → [new phrase]: [reason]`
  },
  {
    id: 'business-analyst',
    title: 'Business Case Analyst',
    tag: 'analysis',
    desc: 'Frameworks-first analysis for business decisions. Covers financial, strategic, and risk dimensions with explicit assumptions.',
    optimizedFor: 'Kimi K2',
    text: `You are a management consultant analyzing business problems.

Structure every analysis using this framework:
**Situation** — What is the decision or problem? (2-3 sentences max)
**Complication** — Why is the current state unsatisfactory?
**Question** — The key question this analysis must answer

**Analysis:**
- Financial: revenue impact, cost, payback period
- Strategic: competitive advantage, market position  
- Risk: top 3 risks with likelihood (H/M/L) × impact (H/M/L)

**Recommendation:** One clear recommendation with the top 2 supporting reasons.

Always state your key assumptions explicitly. If data is missing, say what you'd need and why.`
  },
  {
    id: 'debug-assistant',
    title: 'Debug Assistant',
    tag: 'code',
    desc: 'Systematic bug hunting using the scientific method. Forms hypotheses, suggests targeted tests, and explains root causes.',
    optimizedFor: 'GPT-OSS 120B',
    text: `You are a debugging expert using the scientific method.

When given a bug report or problematic code:

**Symptoms:** Restate the observed behavior vs. expected behavior
**Hypotheses:** List 3 possible root causes, ranked by likelihood
**Tests:** For each hypothesis, write the minimal code or command to confirm/deny it
**Root cause:** After testing, state the confirmed cause precisely
**Fix:** Provide the corrected code with explanation
**Prevention:** How would you prevent this class of bug in future?

Ask for error messages, stack traces, or environment details if missing.`
  },
  {
    id: 'scientific-summarizer',
    title: 'Scientific Paper Summarizer',
    tag: 'analysis',
    desc: 'Distills research papers into structured summaries accessible to non-experts. Highlights methodology, findings, and limitations.',
    optimizedFor: 'Gemini 2.5 Flash-Lite',
    text: `You are a science communicator summarizing research for an intelligent non-expert audience.

For any paper or abstract provided, output:

**TL;DR** — One sentence. What did they find?
**Problem** — What gap or question motivated this research?
**Method** — How did they test their hypothesis? (focus on what makes it credible or limited)
**Findings** — Top 3 results in plain language, with effect sizes when available
**Limitations** — What does the paper itself acknowledge? What did they miss?
**Implications** — What does this change, if anything? Be honest about significance.

Avoid jargon. If technical terms are unavoidable, define them in parentheses.`
  }
];

const PRESETS = {
  groq: [
    {
      model: 'Llama 3.3 70B',
      modelId: 'llama-3.3-70b-versatile',
      score: 95.0,
      tier: 'large',
      provider: 'Groq',
      useCase: 'General / Coding',
      config: {
        model: 'llama-3.3-70b-versatile',
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 4096,
        frequency_penalty: 0.1,
        presence_penalty: 0.0,
        stream: true
      },
      notes: 'temperature 0.6 hits the sweet spot for instruction following without degrading creativity. Raising above 0.8 causes repetition on long outputs. frequency_penalty 0.1 reduces loop artifacts.'
    },
    {
      model: 'Kimi K2',
      modelId: 'moonshotai/kimi-k2',
      score: 97.7,
      tier: 'unknown',
      provider: 'Groq',
      useCase: 'Long Context / Analysis',
      config: {
        model: 'moonshotai/kimi-k2',
        temperature: 0.4,
        top_p: 0.9,
        max_tokens: 8192,
        frequency_penalty: 0.0,
        presence_penalty: 0.1,
        stream: true
      },
      notes: 'Lower temperature improves factual accuracy on long documents. presence_penalty 0.1 encourages diverse vocabulary across long generations. Best for summarization and RAG pipelines.'
    },
    {
      model: 'GPT-OSS 120B',
      modelId: 'openai/gpt-oss-120b',
      score: 95.0,
      tier: 'large',
      provider: 'Groq',
      useCase: 'Reasoning / Math',
      config: {
        model: 'openai/gpt-oss-120b',
        temperature: 0.2,
        top_p: 0.85,
        max_tokens: 2048,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stream: false
      },
      notes: 'Very low temperature for deterministic reasoning. top_p 0.85 avoids sampling instability. stream: false recommended when you need full response before processing (e.g., structured output parsing).'
    }
  ],
  openrouter: [
    {
      model: 'Nemotron 3 Super 120B',
      modelId: 'nvidia/nemotron-super-120b',
      score: 100.0,
      tier: 'large',
      provider: 'OpenRouter',
      useCase: 'Top Performance',
      config: {
        model: 'nvidia/nemotron-super-120b',
        temperature: 0.7,
        top_p: 0.95,
        top_k: 50,
        max_tokens: 4096,
        repetition_penalty: 1.05,
        stream: true,
        provider: { order: ['Fireworks', 'Lambda'], allow_fallbacks: true }
      },
      notes: 'top_k: 50 is specific to Nemotron\'s sampling behavior — removes tail probability mass that causes incoherence. repetition_penalty 1.05 is subtle but meaningful for long outputs. Provider ordering matters for uptime.'
    },
    {
      model: 'Trinity Large 400B',
      modelId: 'mistralai/trinity-large-400b',
      score: 90.0,
      tier: 'large',
      provider: 'OpenRouter',
      useCase: 'Instruction Following',
      config: {
        model: 'mistralai/trinity-large-400b',
        temperature: 0.5,
        top_p: 0.9,
        max_tokens: 6144,
        repetition_penalty: 1.0,
        stream: true,
        provider: { order: ['Mistral', 'Together'], allow_fallbacks: true }
      },
      notes: 'Mistral models respond best to direct, imperative prompts. repetition_penalty 1.0 (no penalty) is intentional — Trinity\'s training handles this internally. Longer context up to 32k is stable.'
    },
    {
      model: 'LFM 2.5 1.2B Instruct',
      modelId: 'liquid/lfm-2.5-1.2b-instruct',
      score: 90.0,
      tier: 'small',
      provider: 'OpenRouter',
      useCase: 'Fast / Edge',
      config: {
        model: 'liquid/lfm-2.5-1.2b-instruct',
        temperature: 0.8,
        top_p: 0.95,
        max_tokens: 1024,
        stream: true
      },
      notes: 'Best small model in benchmarks. Higher temperature (0.8) works because the model has strong coherence. max_tokens 1024 is a hard limit — LFM degrades on very long outputs. Ideal for classification, tagging, and short Q&A.'
    }
  ],
  together: [
    {
      model: 'Llama 3.3 70B (Together)',
      modelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      score: 95.0,
      tier: 'large',
      provider: 'Together AI',
      useCase: 'General Purpose',
      config: {
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        temperature: 0.6,
        top_p: 0.9,
        max_tokens: 4096,
        repetition_penalty: 1.05,
        stop: ['<|eot_id|>'],
        stream: true
      },
      notes: 'Together\'s Turbo variant uses speculative decoding — stop tokens are critical. <|eot_id|> prevents runaway generation. repetition_penalty 1.05 is slightly higher than Groq due to different tokenizer behavior.'
    },
    {
      model: 'Gemma 3 27B (Together)',
      modelId: 'google/gemma-3-27b-it',
      score: 97.7,
      tier: 'medium',
      provider: 'Together AI',
      useCase: 'Multilingual',
      config: {
        model: 'google/gemma-3-27b-it',
        temperature: 0.5,
        top_p: 0.92,
        max_tokens: 3072,
        repetition_penalty: 1.0,
        stream: true
      },
      notes: 'Gemma 3\'s multilingual strength is maximized at temperature 0.5. Higher temperatures cause language mixing on non-English prompts. Together\'s routing adds ~50ms vs direct Google API but improves uptime.'
    }
  ]
};

const ARTICLES = [
  {
    id: 'nemotron-analysis',
    category: 'Model Analysis',
    accentClass: '',
    date: 'Apr 10, 2026',
    title: 'Why Nemotron 3 Super 120B Topped Our Rankings',
    excerpt: 'After three weeks at #1, we dug into what makes Nemotron 3 different from other 100B+ models. Spoiler: it\'s not raw parameter count — it\'s training data curation and a post-training regime that makes GSM8K look trivial.',
    tags: ['Nemotron', 'Rankings', 'Analysis'],
    readTime: '8 min',
    content: `## Background

Nemotron 3 Super 120B from NVIDIA has sat at position #1 on our leaderboard since mid-March. After 3 weeks of data, we wanted to understand **why** — not just confirm that it wins, but understand the mechanism.

## The Numbers

Across 14 consecutive test days, Nemotron 3 achieved:

| Category | Score | vs. #2 (Kimi K2) |
|----------|-------|-----------------|
| HumanEval (code) | 94.2 | +6.1 pts |
| GSM8K (reasoning) | 97.8 | +3.4 pts |
| MMLU (knowledge) | 89.1 | +0.9 pts |
| Translation | 82.4 | -1.2 pts |

The gap is largest on **code and reasoning** — exactly the tasks that benefit from longer chain-of-thought.

## What's Different About Nemotron 3's Training

Based on NVIDIA's technical report and our observed behavior, three factors stand out:

### 1. Synthetic Data at Scale
Nemotron 3 used a pipeline where a larger teacher model generated verification-checked reasoning chains, which then trained the 120B model. This is similar to DeepSeek-R1's approach but applied to a wider range of domains.

### 2. Constitution-Style RLHF
Rather than human preference labels alone, NVIDIA used a set of explicit rules (a "constitution") to generate preference pairs automatically. This scales better and produces more consistent behavior across domains.

### 3. Token Budget Management
The model appears trained to recognize when a problem needs long reasoning vs. short answers. On simple factual questions, it's fast. On proofs, it allocates more compute. This is rare — most models either always chain-of-thought or never do.

## Where It Underperforms

Nemotron 3 loses to Kimi K2 on translation tasks (+1.2 pts). NVIDIA's training data appears underweighted on non-English language pairs. If your use case is multilingual, Kimi K2 or Gemma 3 27B are better choices.

Speed is also a consideration: 27.88 tok/s vs Kimi K2's 197 tok/s on Groq. For latency-sensitive applications, you're trading 7x speed for quality.

## Practical Recommendation

**Use Nemotron 3 for:** Coding assistants, math tutors, complex reasoning pipelines, agent backbones where quality > speed.

**Use something else for:** Real-time chat, multilingual apps, cost-sensitive high-volume inference.`
  },
  {
    id: 'token-economy',
    category: 'Guide',
    accentClass: 'blue',
    date: 'Apr 5, 2026',
    title: 'How to Cut Your Token Usage by 40% Without Losing Quality',
    excerpt: 'System prompts bloat. Conversation history compounds. Most developers waste 30-50% of their token budget on overhead that doesn\'t improve outputs. Here\'s what we learned from optimizing 50,000 benchmark calls.',
    tags: ['Tokens', 'Optimization', 'Cost'],
    readTime: '6 min',
    content: `## The Problem With Token Budgets

Running benchmarks at scale forces you to think about token efficiency seriously. Over 50,000 API calls, we found patterns that most developers never notice because they're looking at individual responses, not aggregate waste.

The three biggest culprits:

1. **Verbose system prompts** — most system prompts repeat themselves
2. **Full conversation history** — you rarely need every turn
3. **Unrestricted output length** — models pad when you don't constrain them

## Technique 1: System Prompt Compression

Take a typical system prompt like this 87-token version:

> "You are a helpful, harmless, and honest AI assistant. Please be respectful, accurate, and thoughtful in your responses. Always provide well-reasoned answers and ask for clarification when needed."

This can be compressed to 31 tokens without measurable quality loss:

> "Accurate, thoughtful assistant. Ask for clarification when needed."

**Why it works:** Modern instruction-tuned models have these values baked in. You're just activating them, not defining them.

**Savings:** ~56 tokens per call × thousands of calls = significant cost reduction.

## Technique 2: Sliding Window History

Instead of sending full conversation history:

\`\`\`python
# Instead of this (grows unbounded):
messages = full_conversation_history

# Do this (fixed context window):
messages = [system_prompt] + conversation_history[-6:]  # last 3 turns
\`\`\`

For most conversational tasks, the last 3-4 exchanges are sufficient. Earlier context is usually resolved or irrelevant.

**Exception:** If you need long-term memory, use a summary of earlier turns rather than raw history.

## Technique 3: Output Length Constraints

Most developers set max_tokens to a large number "just in case." This causes two problems:

1. Models pad outputs to seem thorough
2. You pay for tokens you don't need

Better approach: set max_tokens to the **95th percentile** of what you actually need, and prompt the model explicitly:

> "Answer in 3 sentences or fewer. Be direct."

We tested this across 1,000 fact-retrieval queries. Average output dropped from 187 tokens to 82 tokens with **no measurable accuracy loss** on our benchmarks.

## Combined Impact

| Technique | Token Reduction | Quality Delta |
|-----------|----------------|---------------|
| Prompt compression | -18% | -0.2% |
| Sliding window | -15% | -1.1% |
| Output constraints | -12% | 0% |
| **Combined** | **-38%** | **-1.3%** |

The 1.3% quality drop is within noise for most applications. For high-stakes use cases (legal, medical), skip the sliding window technique and accept the cost.`
  },
  {
    id: 'quantization-comparison',
    category: 'Deep Dive',
    accentClass: 'cyan',
    date: 'Mar 28, 2026',
    title: '4-bit vs 8-bit Quantization: What Our Benchmarks Actually Show',
    excerpt: 'The conventional wisdom says 8-bit is noticeably better than 4-bit for reasoning tasks. Our data across 15 models tells a more nuanced story — and the answer depends heavily on which model and which task.',
    tags: ['Quantization', '4-bit', '8-bit', 'Performance'],
    readTime: '10 min',
    content: `## The Question

When running models locally or through budget cloud APIs, you often choose between 4-bit and 8-bit quantized versions. The tradeoff is obvious: 4-bit uses roughly half the VRAM but degrades weights more aggressively.

But **how much** does it degrade? And does it depend on model architecture?

## Our Test Setup

We ran identical prompts against 4-bit and 8-bit versions of 8 models across 4 task categories. Each model × quantization × task combination ran 50 times to average out sampling noise.

All 4-bit models used GPTQ with group_size=128. All 8-bit models used bitsandbytes LLM.int8().

## Results by Task Category

### Code Generation (HumanEval pass@1)

| Model | 8-bit | 4-bit | Delta |
|-------|-------|-------|-------|
| Llama 3.3 70B | 79.2 | 75.8 | -3.4 |
| Gemma 3 27B | 72.1 | 71.4 | -0.7 |
| Mistral 7B | 58.3 | 52.1 | -6.2 |

**Finding:** Impact scales with model size. Small models (<10B) lose more from quantization. Large models (>50B) are remarkably robust — the redundancy in parameters absorbs the precision loss.

### Mathematical Reasoning (GSM8K)

This is where the gap is largest. 4-bit quantization hits multi-step arithmetic hard because small numerical errors compound across steps.

| Model | 8-bit | 4-bit | Delta |
|-------|-------|-------|-------|
| Llama 3.3 70B | 89.4 | 83.1 | -6.3 |
| Gemma 3 27B | 84.2 | 82.7 | -1.5 |

**Finding:** If math accuracy matters, pay for 8-bit or use a larger 4-bit model (e.g., 4-bit 70B vs. 8-bit 13B — the larger model wins despite heavier quantization).

### Factual Knowledge (MMLU)

Surprisingly, MMLU scores are almost unaffected by quantization.

Delta across all models tested: **0.3 - 1.1 points**. Well within sampling noise.

**Why?** MMLU is essentially pattern matching to memorized facts. This doesn't require high numerical precision — the attention patterns are robust to slight weight degradation.

### Instruction Following

4-bit models showed higher variance in following complex multi-step instructions. The pass rate for exact format compliance dropped 4-8% on average.

## The Practical Decision Tree

```
Is the task primarily factual recall?
  → 4-bit is fine. Save the VRAM.

Is math or multi-step reasoning involved?
  → Use 8-bit, or upgrade to a larger 4-bit model.

Is exact format compliance critical?
  → Use 8-bit or full precision.

Is the model 50B+?
  → 4-bit quality degradation is minimal. Usually fine.
```

## Conclusion

The "8-bit is significantly better" narrative is true for small models and math-heavy tasks. For large models doing knowledge retrieval or creative tasks, 4-bit is nearly indistinguishable and the VRAM savings are worth it.

The biggest practical insight: **a 4-bit 70B model beats an 8-bit 13B model** on almost every benchmark we tested. If you're choosing between these configurations, always go bigger.`
  }
];

// ── Utility ─────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg) {
  const toast = document.getElementById('hub-toast');
  toast.childNodes[1].textContent = ' ' + msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied`;
    showToast('Copied to clipboard');
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M2 8V2h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copy`;
    }, 2000);
  });
}

// ── Sidebar navigation ──────────────────────────────────

function initSideNav() {
  const items = document.querySelectorAll('.hub-sidenav-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const section = item.dataset.section;
      document.querySelectorAll('.hub-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-' + section).classList.add('active');
    });
  });
}

// ── Library ─────────────────────────────────────────────

function renderPromptCard(p) {
  return `
    <div class="prompt-card reveal" data-tag="${p.tag}">
      <div class="prompt-card-top">
        <div class="prompt-title">${escapeHtml(p.title)}</div>
        <span class="prompt-tag-badge ${p.tag}">${p.tag.charAt(0).toUpperCase() + p.tag.slice(1)}</span>
      </div>
      <p class="prompt-desc">${escapeHtml(p.desc)}</p>
      <div class="prompt-preview">${escapeHtml(p.text)}</div>
      <div class="prompt-footer">
        <div class="prompt-optimized">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.3 2.6 2.9.4-2.1 2 .5 2.9L6 7.5 3.4 8.9l.5-2.9-2.1-2 2.9-.4L6 1z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Optimized for <strong>${escapeHtml(p.optimizedFor)}</strong>
        </div>
        <button class="prompt-copy-btn" onclick="handlePromptCopy(this, '${escapeHtml(p.id)}')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M2 8V2h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Copy
        </button>
      </div>
    </div>`;
}

function handlePromptCopy(btn, id) {
  const prompt = PROMPTS.find(p => p.id === id);
  if (prompt) copyToClipboard(prompt.text, btn);
}

window.handlePromptCopy = handlePromptCopy;

function initLibrary() {
  const grid = document.getElementById('prompt-grid');
  grid.innerHTML = PROMPTS.map(renderPromptCard).join('');

  document.querySelectorAll('.hub-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.querySelectorAll('.hub-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      const filter = tag.dataset.tag;
      document.querySelectorAll('.prompt-card').forEach(card => {
        if (filter === 'all' || card.dataset.tag === filter) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// ── Presets ─────────────────────────────────────────────

function syntaxHighlightJson(obj) {
  const str = JSON.stringify(obj, null, 2);
  return str.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
            .replace(/: "([^"]+)"/g, ': <span class="json-str">"$1"</span>')
            .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
            .replace(/: (-?[\d.]+)/g, ': <span class="json-num">$1</span>');
}

function renderPresetCard(preset) {
  const jsonStr = JSON.stringify(preset.config, null, 2);
  return `
    <div class="preset-card">
      <div class="preset-card-header" onclick="togglePreset(this)">
        <div class="preset-card-left">
          <div class="preset-model-name">${escapeHtml(preset.model)}</div>
          <div class="preset-model-meta">
            <span class="preset-score-pill">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1l.9 1.8 2 .3-1.5 1.4.4 2L5 5.5 3.2 6.5l.4-2L2.1 3.1l2-.3L5 1z" fill="currentColor"/></svg>
              ${preset.score}
            </span>
            <span>${escapeHtml(preset.useCase)}</span>
            <span>·</span>
            <span>${escapeHtml(preset.tier === 'unknown' ? 'Unlisted' : preset.tier.charAt(0).toUpperCase() + preset.tier.slice(1))}</span>
          </div>
        </div>
        <div class="preset-card-actions">
          <button class="preset-copy-btn" onclick="event.stopPropagation(); handlePresetCopy(this, '${escapeHtml(preset.modelId)}')">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M2 8V2h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Copy JSON
          </button>
          <button class="preset-expand-btn" aria-label="Expand">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="preset-card-body">
        <div class="preset-json">${syntaxHighlightJson(preset.config)}</div>
        <p class="preset-notes">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="color:var(--text-tertiary)"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 5.5v3M6 3.5h.01" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          ${escapeHtml(preset.notes)}
        </p>
      </div>
    </div>`;
}

function togglePreset(header) {
  const card = header.closest('.preset-card');
  card.classList.toggle('expanded');
}

window.togglePreset = togglePreset;

function handlePresetCopy(btn, modelId) {
  // find preset in all providers
  let found = null;
  for (const arr of Object.values(PRESETS)) {
    found = arr.find(p => p.modelId === modelId);
    if (found) break;
  }
  if (found) copyToClipboard(JSON.stringify(found.config, null, 2), btn);
}

window.handlePresetCopy = handlePresetCopy;

function initPresets() {
  Object.entries(PRESETS).forEach(([providerKey, presets]) => {
    const container = document.getElementById('preset-cards-' + providerKey);
    if (container) container.innerHTML = presets.map(renderPresetCard).join('');
  });

  document.querySelectorAll('.preset-provider-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.preset-provider-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const provider = tab.dataset.provider;
      document.querySelectorAll('.preset-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('presets-' + provider).classList.add('active');
    });
  });
}

// ── Insights ─────────────────────────────────────────────

let currentArticle = null;

function renderInsightCard(article) {
  return `
    <div class="insight-card reveal">
      <div class="insight-card-accent ${article.accentClass}"></div>
      <div class="insight-card-inner">
        <div class="insight-card-top">
          <span class="insight-category">${escapeHtml(article.category)}</span>
          <span class="insight-date">${escapeHtml(article.date)} · ${escapeHtml(article.readTime)} read</span>
        </div>
        <h3 class="insight-title">${escapeHtml(article.title)}</h3>
        <p class="insight-excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="insight-footer">
          <div class="insight-tags">
            ${article.tags.map(t => `<span class="insight-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
          <button class="insight-read-more" onclick="openArticle('${article.id}')">
            Read more
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>`;
}

function markdownToHtml(md) {
  // Basic markdown → HTML (tables, headers, code, bold, lists)
  let html = md
    // Tables
    .replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
      const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const trs = rows.trim().split('\n').map(row => {
        const tds = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${escapeHtml(code.trim())}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // H2
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // H3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Paragraphs (double newline)
    .split(/\n{2,}/).map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<table') || block.startsWith('<blockquote')) return block;
      if (block.includes('<li>')) return `<ul>${block}</ul>`;
      return `<p>${block}</p>`;
    }).join('\n');
  return html;
}

function openArticle(id) {
  currentArticle = ARTICLES.find(a => a.id === id);
  if (!currentArticle) return;
  const reader = document.getElementById('insight-reader');
  document.getElementById('reader-title').textContent = currentArticle.title;
  document.getElementById('reader-meta').textContent = currentArticle.category + ' · ' + currentArticle.date + ' · ' + currentArticle.readTime + ' read';
  document.getElementById('reader-body').innerHTML = markdownToHtml(currentArticle.content);
  reader.classList.add('open');
  document.body.style.overflow = 'hidden';
}

window.openArticle = openArticle;

function closeArticle() {
  document.getElementById('insight-reader').classList.remove('open');
  document.body.style.overflow = '';
}

window.closeArticle = closeArticle;

function initInsights() {
  const grid = document.getElementById('insights-grid');
  grid.innerHTML = ARTICLES.map(renderInsightCard).join('');

  // Create reader overlay
  const reader = document.createElement('div');
  reader.className = 'insight-reader';
  reader.id = 'insight-reader';
  reader.innerHTML = `
    <div class="insight-reader-inner">
      <button class="insight-reader-close" onclick="closeArticle()">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10l8-8M10 10L2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Back to Insights
      </button>
      <div class="insight-reader-title" id="reader-title"></div>
      <div class="insight-reader-meta" id="reader-meta"></div>
      <div class="insight-reader-body" id="reader-body"></div>
    </div>`;
  document.body.appendChild(reader);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeArticle();
  });
}

// ── Init ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initSideNav();
  initLibrary();
  initPresets();
  initInsights();

  // Theme toggle (reuse existing logic from app.js if present, else init)
  const toggle = document.getElementById('theme-toggle');
  const label = document.getElementById('theme-label');
  const thumb = document.getElementById('thumb-icon');
  const html = document.documentElement;
  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    if (toggle) toggle.checked = (t === 'light');
    if (label) label.textContent = t === 'light' ? 'Light' : 'Dark';
    if (thumb) thumb.textContent = t === 'light' ? '☀' : '☽';
  }
  const saved = localStorage.getItem('theme') || 'dark';
  applyTheme(saved);
  if (toggle) toggle.addEventListener('change', () => {
    const t = toggle.checked ? 'light' : 'dark';
    localStorage.setItem('theme', t);
    applyTheme(t);
  });

  // Sticky header scroll class
  const header = document.getElementById('app-bar');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }
});
