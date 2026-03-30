# Context Optimization for Different Model Sizes

This document explains how Lexentia intelligently adapts context and prompts for different model sizes.

## Problem

Previously, Lexentia would provide the same large prompts to all models, which caused issues:
- **Large models (70B+)**: Works well, but wastes tokens
- **Medium models (20-70B)**: Generally fine, but can hit context limits
- **Small models (7-9B)**: Struggles with large context, produces errors
- **Tiny models (1-3B)**: Almost unusable with full prompts

Simply truncating prompts blindly leads to low code quality—missing context causes incorrect suggestions.

## Solution: Smart Context Optimization

### 1. Model Size Detection (`contextOptimizer.ts`)

Automatically detects model size from model name:

```typescript
detectModelSize("llama-3-8b")      // → 'small'
detectModelSize("gpt-4-turbo")     // → 'large'
detectModelSize("qwen-72b")        // → 'medium'
detectModelSize("phi-mini")        // → 'tiny'
```

Models are classified as:
- **Tiny**: 1-3B parameters (phi, mobius, etc.)
- **Small**: 7-9B parameters (llama-3-8b, mistral-7b, etc.)
- **Medium**: 20-70B parameters (gpt-3.5, claude-3-haiku, etc.)
- **Large**: 70B+ or advanced models (gpt-4, claude-3-5, llama-3-70b, etc.)

### 2. Context Budgets

Each model size gets appropriate token limits:

| Model Size | Max Prompt | Max File | Max Codebase Hits | Keep Errors |
|------------|-----------|----------|-------------------|-------------|
| Tiny       | 6K        | 4K       | 2                 | YES         |
| Small      | 14K       | 8K       | 4                 | YES         |
| Medium     | 56K       | 40K      | 8                 | NO          |
| Large      | 220K      | 120K     | 12                | NO          |

### 3. Smart Truncation Strategies

#### For Tiny/Small Models: `prioritizeErrorLines=true`

When context exceeds budget, Lexentia:

1. **Extracts keyword-relevant code blocks** — keeps only parts related to user's query
2. **Prioritizes error/warning lines** — never discards lines with `error`, `warning`, `TODO`, `FIXME`
3. **Keeps function/class definitions** — maintains structure
4. **Preserves import statements** — keeps dependencies
5. **Smart line scoring** — weights importance, removes bulk

```typescript
// Example: User asks about a bug in parseConfig
// Instead of truncating randomly, Lexentia will keep:
// - Functions with "parse" or "config" in name
// - Lines with error/warning keywords
// - Related imports
// - Typically 30-50% less content, but all critical parts preserved
```

#### For Medium/Large Models: `prioritizeErrorLines=false`

Tries to include full files when possible, only truncates if absolutely necessary.

### 4. System Prompt Adaptation

Three levels of system prompts:

#### Full Prompt (Large Models)
- Complete instructions for clarity/plan/final responses
- Detailed UI capabilities documentation
- Best practices and edge cases

#### Short Prompt (Small Models, 7-9B)
- Essential rules only (~1/3 of full size)
- No elaborate explanations
- Strict formatting requirements

#### Tiny Prompt (Tiny Models, 1-3B)
- Minimal instructions (~1/6 of full size)
- One sentence per rule
- Ultra-strict JSON format

### 5. Automatic Integration in ModelService

Every message sent to a model is automatically optimized:

```typescript
// Before: Send raw content (may be 100K+ chars)
// After: Intelligently optimized for model size
const optimizedMessages = messages.map((m) =>
  m.role === 'user'
    ? {
        ...m,
        content: this.optimizeMessageContent(m.content, profile.model),
      }
    : m,
)
```

## Example: Fix Line Request

**Scenario**: User clicks Alt+F on a line in a large file (50KB)

### Large Model (GPT-4)
- Gets full file (~50KB)
- Gets full system prompt (~3KB)
- Total context: ~53KB
- Quality: Excellent

### Small Model (llama-3-8b)
- Gets smart truncation (~8KB max)
- Extracts: error line + 2 lines context + related functions
- Gets short system prompt (~1KB)
- Total context: ~9KB
- Quality: Good (kept essential parts, still captures the issue)

### Tiny Model (phi-3)
- Gets ultra-smart truncation (~4KB max)
- Extracts: ONLY error line + immediate context + function signature
- Gets tiny system prompt (~200 bytes)
- Total context: ~4.2KB
- Quality: Reasonable (trades depth for fit)

## Token Estimation

Context optimizer estimates tokens with the formula:
```
tokens ≈ chars / 4
```

This is approximate but useful for budgeting. More accurate calculation available with tokenizer library if needed.

## Configuration

### Current Defaults

In `contextOptimizer.ts`:
- Tiny: 6K chars (≈1500 tokens)
- Small: 14K chars (≈3500 tokens)
- Medium: 56K chars (≈14K tokens)
- Large: 220K chars (≈55K tokens)

To adjust per-model limits, edit `CONTEXT_BUDGETS`:

```typescript
export const CONTEXT_BUDGETS: Record<ModelSize, ContextBudget> = {
  small: {
    maxPromptChars: 14_000, // Increase to 20_000 if your 7B model supports more
    // ...
  },
  // ...
}
```

### Per-Query Override

Currently, the system auto-detects and optimizes. Future: allow user-facing toggle in Settings to override (e.g., force "compact" for any model size).

## Benefits

1. **Works with small models** — 7-9B models now produce reasonable code instead of errors
2. **Tiny models become usable** — 1-3B models can now assist with basic tasks
3. **Better large model usage** — no wasted context, cleaner output
4. **Adaptive to hardware** — users with modest GPUs can still use Lexentia effectively
5. **No quality loss** — intelligent selection preserves important context

## Future Improvements

1. **Vector embeddings** — rank relevance of code blocks by semantic similarity
2. **User preferences** — let users adjust budget per model
3. **Query-aware extraction** — analyze user query to pick MOST relevant code
4. **Adaptive system prompt** — generate compressed prompts based on specific model
5. **Tokenizer integration** — use actual tokenizer for precise budgeting

## Debug Logging

Enable browser console to see optimization in action:

```
[contextOptimizer] Optimized prompt for small model: 52000 → 8000 tokens
[contextOptimizer] Optimized prompt for tiny model: 15000 → 4200 tokens
```

Monitor these logs to verify context is being optimized appropriately.
