function toggleSourcesPanel() {
  document.getElementById('sources-panel').classList.toggle('collapsed');
}

function toggleRightPanel(tab) {
  const panel = document.getElementById('right-panel');
  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
    if (tab) switchRightTab(tab, document.querySelector(`[data-tab="${tab}"]`));
    document.getElementById('studio-btn').classList.add('active');
  } else {
    const currentTab = document.querySelector('.right-panel__tab.active')?.dataset.tab;
    if (currentTab === tab) {
      closeRightPanel();
    } else if (tab) {
      switchRightTab(tab, document.querySelector(`[data-tab="${tab}"]`));
    }
  }
}

function closeRightPanel() {
  document.getElementById('right-panel').classList.add('hidden');
  document.getElementById('studio-btn').classList.remove('active');
}

function switchRightTab(tab, btn) {
  document.querySelectorAll('.right-panel__tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.rp-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('rp-' + tab);
  if (panel) panel.classList.add('active');
}

function openPreviewPanel() {
  const panel = document.getElementById('right-panel');
  panel.classList.remove('hidden');
  switchRightTab('preview', document.querySelector('[data-tab="preview"]'));
}

function buildEmptyState() {
  return `
    <div id="rag-empty-state" class="empty-state">
      <div>
        <div class="empty-state__title">What would you like to explore?</div>
        <div class="empty-state__hint">Add a source on the left, or try one of these:</div>
      </div>
      <div class="suggestion-grid">
        <button class="suggestion-card" onclick="useSuggestion(this)">
          <div class="suggestion-card__label">Summarize</div>
          <div class="suggestion-card__text">What are the main ideas in this document?</div>
        </button>
        <button class="suggestion-card" onclick="useSuggestion(this)">
          <div class="suggestion-card__label">Key facts</div>
          <div class="suggestion-card__text">List the most important facts and figures.</div>
        </button>
        <button class="suggestion-card" onclick="useSuggestion(this)">
          <div class="suggestion-card__label">Clarify</div>
          <div class="suggestion-card__text">Explain this topic in simple terms with examples.</div>
        </button>
        <button class="suggestion-card" onclick="useSuggestion(this)">
          <div class="suggestion-card__label">Deep dive</div>
          <div class="suggestion-card__text">Explain the methodology in detail.</div>
        </button>
      </div>
    </div>
    <div class="rag-messages" id="rag-messages" style="display:none;"></div>`;
}

function updateTokenCount(text) {
  const el = document.getElementById('token-count');
  if (!el) return;
  const est = Math.round((text || '').split(/\s+/).filter(Boolean).length * 1.3);
  el.textContent = `~${est} tokens`;
}

let validationMode = false;

function toggleValidation() {
  validationMode = !validationMode;
  updateValidationUI();
  saveSettings();
}

function updateValidationUI() {
  const row = document.getElementById('validation-row');
  const badge = document.getElementById('validation-badge');
  const statusBadge = document.getElementById('validation-status');
  if (row) row.classList.toggle('active', validationMode);
  if (badge) badge.textContent = validationMode ? 'ON' : 'OFF';
  if (statusBadge) statusBadge.style.display = validationMode ? 'inline-flex' : 'none';
}

const MODELS_FALLBACK = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', provider: 'Meta' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B', provider: 'Google' },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder', provider: 'Alibaba' },
  { id: 'qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B', provider: 'Alibaba' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron Super 120B', provider: 'Nvidia' },
  { id: 'openai/gpt-oss-120b:free', label: 'GPT OSS 120B', provider: 'OpenAI' },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B', provider: 'Mistral' },
];

let MODELS = MODELS_FALLBACK.slice();

async function fetchFreeModels() {
  const apiKey = (document.getElementById('api-key-input')?.value || '').trim();
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
    if (!res.ok) return;
    const data = await res.json();
    const providerMap = {
      'meta-llama': 'Meta', google: 'Google', mistralai: 'Mistral', qwen: 'Alibaba',
      deepseek: 'DeepSeek', microsoft: 'Microsoft', nvidia: 'Nvidia', anthropic: 'Anthropic',
      openai: 'OpenAI', nousresearch: 'Nous', cohere: 'Cohere',
    };
    const free = (data.data || [])
      .filter(m => m.id.endsWith(':free') && m.context_length > 0)
      .map(m => {
        const slug = m.id.split('/')[0];
        return { id: m.id, label: m.name || m.id.split('/')[1], provider: providerMap[slug] || slug };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    if (free.length > 0) {
      MODELS = free;
      populateAllSelects();
    }
  } catch (e) {}
}

async function fetchAndRefreshModels() {
  const btn = document.querySelector('.settings-btn.primary');
  if (btn) btn.textContent = 'Refreshing…';
  await fetchFreeModels();
  if (btn) btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13 8A5 5 0 103 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M13 5v3h-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Refresh model list';
}

function populateSelectsCustom() {
  const openaiModels = [
    { id: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'OpenAI' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'o1', label: 'o1', provider: 'OpenAI' },
    { id: 'o1-mini', label: 'o1-mini', provider: 'OpenAI' },
    { id: 'o3-mini', label: 'o3-mini', provider: 'OpenAI' },
  ];
  if (apiType === 'openai') MODELS = openaiModels;
  populateAllSelects();
}

function populateAllSelects() {
  const opts = MODELS.map(m => `<option value="${m.id}">${m.label} (${m.provider})</option>`).join('');
  const mainSel = document.getElementById('model-select');
  if (mainSel) mainSel.innerHTML = opts;
  const savedModel = localStorage.getItem('chat_model_selected') || '';
  if (mainSel && savedModel && MODELS.some((m) => m.id === savedModel)) {
    mainSel.value = savedModel;
    return;
  }
  const preferred = 'meta-llama/llama-3.3-70b-instruct:free';
  const m = MODELS.find(x => x.id === preferred);
  if (mainSel && m) mainSel.value = m.id;
  else if (mainSel && MODELS[0]) mainSel.value = MODELS[0].id;
}

function onMainModelChange() {
  const val = document.getElementById('model-select')?.value || '';
  if (val) localStorage.setItem('chat_model_selected', val);
  saveSettings();
}

function onModelChange(side) {
  onMainModelChange();
  return true;
}

function updateModelName(side) {
  const sel = document.getElementById('model-select');
  const val = sel?.value || '';
  const target = document.getElementById(`model-name-${side}`);
  if (target) target.textContent = val;
  return val;
}

function updateStatusDot(side, state) {
  return [side, state];
}

async function renderMarkdown(text) {
  if (!window.marked) return escHtml(text || '');
  if (typeof marked.parseSync === 'function') {
    return marked.parseSync(text || '');
  }
  const maybe = marked.parse(text || '');
  if (typeof maybe === 'string') return maybe;
  if (maybe && typeof maybe.then === 'function') return await maybe;
  return escHtml(text || '');
}
