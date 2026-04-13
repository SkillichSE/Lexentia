// Hub functionality
document.addEventListener('DOMContentLoaded', function() {
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    const isLight = t === 'light';
    themeToggle.checked = isLight;
    themeLabel.textContent = isLight ? 'Light' : 'Dark';
  }

  applyTheme(localStorage.getItem('theme') || 'dark');

  themeToggle.addEventListener('change', () => {
    applyTheme(themeToggle.checked ? 'light' : 'dark');
  });

  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Navigation between sections
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  const sections = document.querySelectorAll('.hub-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = item.dataset.section;
      
      // Update active nav
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Show target section
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetSection) {
          section.classList.add('active');
        }
      });
      
      // Close sidebar on mobile
      if (window.innerWidth <= 1024) {
        sidebar.classList.remove('open');
      }
    });
  });

  // Initialize Library section with prompts
  loadPrompts();
  
  // Initialize Presets section
  loadPresets();
  
  // Initialize Insights section
  loadArticles();
});

// Prompt data
const prompts = [
  {
    id: 1,
    title: "Code Review Assistant",
    category: "code",
    models: "Llama 3.3, Qwen 2.5",
    content: `You are an expert code reviewer. Analyze the provided code for:
1. Code quality and best practices
2. Performance optimization opportunities
3. Security vulnerabilities
4. Readability and maintainability
5. Potential bugs or edge cases

Provide specific, actionable feedback with code examples where relevant. Rate the code quality from 1-10 and explain your reasoning.`,
    tags: ["code", "review", "quality"]
  },
  {
    id: 2,
    title: "Math Problem Solver",
    category: "math",
    models: "DeepSeek V3, Claude 3.5",
    content: `You are a mathematical expert. Solve the given problem step-by-step:
1. Understand the problem statement
2. Identify the mathematical concepts involved
3. Show your work clearly with each step
4. Explain your reasoning
5. Provide the final answer with verification
6. Discuss alternative approaches if applicable

Use clear mathematical notation and explain complex concepts simply.`,
    tags: ["math", "reasoning", "education"]
  },
  {
    id: 3,
    title: "Creative Story Generator",
    category: "creative",
    models: "GPT-4o, Claude 3.5",
    content: `You are a creative writing expert. Generate engaging stories based on the prompt:
1. Create compelling characters with depth
2. Build immersive settings and atmosphere
3. Craft realistic dialogue
4. Maintain narrative tension and pacing
5. Include sensory details and vivid descriptions
6. Ensure a satisfying story arc

Write in a style appropriate to the genre and target audience. Aim for 800-1200 words.`,
    tags: ["creative", "writing", "storytelling"]
  },
  {
    id: 4,
    title: "Logical Reasoning Coach",
    category: "logic",
    models: "Llama 3.3, DeepSeek V3",
    content: `You are a logical reasoning expert. Analyze the given problem or argument:
1. Identify the premises and conclusion
2. Evaluate the logical structure
3. Check for fallacies or weak reasoning
4. Consider counterarguments
5. Provide a step-by-step logical analysis
6. Suggest improvements to strengthen the argument

Use formal logic notation where helpful, but explain concepts clearly for general understanding.`,
    tags: ["logic", "reasoning", "critical thinking"]
  },
  {
    id: 5,
    title: "Data Science Analyst",
    category: "logic",
    models: "Qwen 2.5, Llama 3.3",
    content: `You are a data science expert. Analyze the provided dataset or problem:
1. Understand the data structure and variables
2. Identify patterns, trends, and correlations
3. Choose appropriate statistical methods
4. Visualize key findings effectively
5. Draw valid conclusions with confidence intervals
6. Suggest further analysis or data collection

Provide clear explanations of statistical concepts and assumptions made during analysis.`,
    tags: ["logic", "data", "statistics", "analysis"]
  },
  {
    id: 6,
    title: "Creative Marketing Copy",
    category: "creative",
    models: "GPT-4o, Claude 3.5",
    content: `You are a marketing copywriting expert. Create compelling marketing content:
1. Understand the target audience and product
2. Craft attention-grabbing headlines
3. Write persuasive body copy with emotional appeal
4. Include clear calls-to-action
5. Optimize for the specific platform (social media, email, web)
6. Ensure brand voice consistency

Focus on benefits over features, use storytelling techniques, and create urgency without being pushy.`,
    tags: ["creative", "marketing", "copywriting"]
  }
];

// Preset configurations
const presets = {
  groq: [
    {
      title: "Llama 3.3 70B - Balanced",
      model: "llama-3.3-70b-versatile",
      config: {
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: null
      }
    },
    {
      title: "Llama 3.3 70B - Code Generation",
      model: "llama-3.3-70b-versatile",
      config: {
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 8192,
        top_p: 0.95,
        frequency_penalty: 0.1,
        presence_penalty: 0.0,
        stop: null
      }
    },
    {
      title: "Mixtral 8x7B - Fast Response",
      model: "mixtral-8x7b-32768",
      config: {
        model: "mixtral-8x7b-32768",
        temperature: 0.6,
        max_tokens: 2048,
        top_p: 0.8,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: null
      }
    }
  ],
  openrouter: [
    {
      title: "DeepSeek V3 - Reasoning",
      model: "deepseek/deepseek-v3",
      config: {
        model: "deepseek/deepseek-v3",
        temperature: 0.3,
        max_tokens: 4096,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        response_format: { type: "text" }
      }
    },
    {
      title: "Qwen 2.5 72B - Creative",
      model: "qwen/qwen-2.5-72b-instruct",
      config: {
        model: "qwen/qwen-2.5-72b-instruct",
        temperature: 0.9,
        max_tokens: 6144,
        top_p: 0.95,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        response_format: { type: "text" }
      }
    },
    {
      title: "Claude 3.5 Sonnet - Analysis",
      model: "anthropic/claude-3.5-sonnet",
      config: {
        model: "anthropic/claude-3.5-sonnet",
        temperature: 0.2,
        max_tokens: 4096,
        top_p: 0.8,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      }
    }
  ],
  together: [
    {
      title: "Llama 3.1 405B - Premium",
      model: "meta-llama/Llama-3.1-405B-Instruct-Turbo",
      config: {
        model: "meta-llama/Llama-3.1-405B-Instruct-Turbo",
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.9,
        repetition_penalty: 1.1,
        stop: ["<|eot_id|>", "<|end_of_text|>"]
      }
    },
    {
      title: "Qwen 2.5 32B - Efficient",
      model: "Qwen/Qwen2.5-32B-Instruct-Turbo",
      config: {
        model: "Qwen/Qwen2.5-32B-Instruct-Turbo",
        temperature: 0.6,
        max_tokens: 2048,
        top_p: 0.85,
        repetition_penalty: 1.05,
        stop: ["<|im_end|>", "<|endoftext|>"]
      }
    }
  ]
};

// Load prompts
function loadPrompts() {
  const grid = document.getElementById('prompts-grid');
  const filterChips = document.querySelectorAll('.filter-chip');
  let activeCategory = 'all';

  function renderPrompts(category = 'all') {
    const filteredPrompts = category === 'all' 
      ? prompts 
      : prompts.filter(p => p.category === category);

    grid.innerHTML = filteredPrompts.map(prompt => `
      <div class="prompt-card reveal">
        <div class="prompt-header">
          <div>
            <h3 class="prompt-title">${prompt.title}</h3>
            <p class="prompt-models">Optimized for: ${prompt.models}</p>
          </div>
          <button class="copy-btn" onclick="copyPrompt(${prompt.id}, this)">Copy</button>
        </div>
        <div class="prompt-content">${prompt.content}</div>
        <div class="prompt-tags">
          ${prompt.tags.map(tag => `<span class="prompt-tag">${tag}</span>`).join('')}
        </div>
      </div>
    `).join('');

    // Trigger reveal animations
    setTimeout(() => {
      grid.querySelectorAll('.reveal').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.1}s`;
        card.classList.add('visible');
      });
    }, 100);
  }

  // Filter functionality
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.dataset.category;
      renderPrompts(activeCategory);
    });
  });

  // Initial render
  renderPrompts();
}

// Copy prompt function
function copyPrompt(promptId, button) {
  const prompt = prompts.find(p => p.id === promptId);
  if (prompt) {
    navigator.clipboard.writeText(prompt.content).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    });
  }
}

// Load presets
function loadPresets() {
  const grid = document.getElementById('presets-grid');
  const tabs = document.querySelectorAll('.provider-tab');
  let activeProvider = 'groq';

  function renderPresets(provider = 'groq') {
    const providerPresets = presets[provider] || [];
    
    grid.innerHTML = providerPresets.map(preset => `
      <div class="preset-card reveal">
        <div class="preset-header">
          <div>
            <h3 class="preset-title">${preset.title}</h3>
            <p class="preset-model">${preset.model}</p>
          </div>
          <button class="copy-btn" onclick="copyPreset(${provider}, '${preset.title.replace(/'/g, "\\'")}', this)">Copy</button>
        </div>
        <div class="preset-config">
          ${formatConfig(preset.config)}
        </div>
      </div>
    `).join('');

    // Trigger reveal animations
    setTimeout(() => {
      grid.querySelectorAll('.reveal').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.1}s`;
        card.classList.add('visible');
      });
    }, 100);
  }

  // Tab functionality
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeProvider = tab.dataset.provider;
      renderPresets(activeProvider);
    });
  });

  // Initial render
  renderPresets();
}

// Format configuration for display
function formatConfig(config) {
  return Object.entries(config)
    .map(([key, value]) => {
      const formattedValue = typeof value === 'string' 
        ? `<span class="config-string">"${value}"</span>`
        : typeof value === 'number'
        ? `<span class="config-number">${value}</span>`
        : typeof value === 'object' && value !== null
        ? `<span class="config-value">${JSON.stringify(value, null, 2)}</span>`
        : `<span class="config-value">${value}</span>`;
      
      return `<div><span class="config-key">${key}:</span> ${formattedValue}</div>`;
    })
    .join('');
}

// Copy preset function
function copyPreset(provider, title, button) {
  const preset = presets[provider].find(p => p.title === title);
  if (preset) {
    const configJson = JSON.stringify(preset.config, null, 2);
    navigator.clipboard.writeText(configJson).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    });
  }
}

// Load articles
async function loadArticles() {
  const grid = document.getElementById('articles-grid');
  
  // Sample articles data (in real implementation, this would come from /content/articles/)
  const articles = [
    {
      title: "Why Nemotron 3 Dominated the Rankings",
      excerpt: "Deep analysis of how Nemotron 3 achieved top scores across all benchmarks. We examine the architectural improvements and training innovations that propelled this model to the forefront.",
      date: "2024-04-10",
      readTime: "8 min read",
      category: "analysis",
      slug: "nemotron-3-dominance-analysis"
    },
    {
      title: "Token Economy: Maximizing Value in Free Models",
      excerpt: "Learn how to optimize your token usage across different free API providers. Practical tips for reducing costs while maintaining output quality.",
      date: "2024-04-08",
      readTime: "6 min read",
      category: "guide",
      slug: "token-economy-guide"
    },
    {
      title: "4-bit vs 8-bit Quantization: Real-world Performance",
      excerpt: "Comprehensive comparison of quantized models based on our benchmark data. See how different quantization levels affect speed, memory usage, and quality.",
      date: "2024-04-05",
      readTime: "10 min read",
      category: "technical",
      slug: "quantization-comparison"
    }
  ];

  grid.innerHTML = articles.map(article => `
    <div class="article-card reveal" onclick="openArticle('${article.slug}')">
      <div class="article-date">${new Date(article.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</div>
      <h3 class="article-title">${article.title}</h3>
      <p class="article-excerpt">${article.excerpt}</p>
      <div class="article-meta">
        <span class="read-time">${article.readTime}</span>
        <a href="#" class="article-link" onclick="event.stopPropagation(); openArticle('${article.slug}')">Read more →</a>
      </div>
    </div>
  `).join('');

  // Trigger reveal animations
  setTimeout(() => {
    grid.querySelectorAll('.reveal').forEach((card, i) => {
      card.style.animationDelay = `${i * 0.1}s`;
      card.classList.add('visible');
    });
  }, 100);
}

// Open article (placeholder function)
function openArticle(slug) {
  // In a real implementation, this would navigate to the article page
  console.log(`Opening article: ${slug}`);
  // For now, we'll just show an alert
  alert(`Article "${slug}" would open here. In a full implementation, this would navigate to the article page or load the markdown content.`);
}

// Reveal animation helper
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

// Auto-observe elements with reveal class
const observeReveals = () => {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    revealObserver.observe(el);
  });
};

// Initial observation
observeReveals();

// Re-observe when new content is loaded
const mutationObserver = new MutationObserver(observeReveals);
mutationObserver.observe(document.body, { childList: true, subtree: true });
