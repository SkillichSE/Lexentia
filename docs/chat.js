(function () {
  const themeToggle = document.getElementById('theme-toggle');
  const themeLabel = document.getElementById('theme-label');

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    const isLight = t === 'light';
    if (themeToggle) themeToggle.checked = isLight;
    if (themeLabel) themeLabel.textContent = isLight ? 'Light' : 'Dark';
  }

  applyTheme(localStorage.getItem('theme') || 'dark');
  if (themeToggle) themeToggle.addEventListener('change', () => {
    applyTheme(themeToggle.checked ? 'light' : 'dark');
  });
})();

(function () {
  const sidebar = document.getElementById('left-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mobileBtn = document.getElementById('sidebar-mobile-toggle');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  if (mobileBtn) mobileBtn.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  function checkWidth() {
    if (!mobileBtn) return;
    mobileBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    if (window.innerWidth > 768) closeSidebar();
  }

  checkWidth();
  window.addEventListener('resize', checkWidth);
})();

if (window.marked) {
  if (window.markedHighlight) {
    marked.use(markedHighlight.markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        if (window.hljs && lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return window.hljs ? hljs.highlightAuto(code).value : code;
      }
    }));
  }
  marked.use({ breaks: true, gfm: true });
}

function openSettings() {
  document.getElementById('settings-drawer').classList.add('open');
  document.getElementById('settings-scrim').classList.add('open');
}

function closeSettings() {
  document.getElementById('settings-drawer').classList.remove('open');
  document.getElementById('settings-scrim').classList.remove('open');
}

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

let apiType = 'openrouter';

const API_BASE_URLS = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  custom: '',
};

const KEY_HINTS = {
  openrouter: 'Your OpenRouter key (sk-or-…). Stored only in your browser.',
  openai: 'Your OpenAI key (sk-…). Stored only in your browser.',
  custom: 'API key for your custom endpoint. Stored only in your browser.',
};

function setApiType(type) {
  apiType = type;
  ['openrouter', 'openai', 'custom'].forEach(t => {
    document.getElementById('type-' + t).classList.toggle('active', t === type);
  });
  document.getElementById('custom-base-url-field').style.display = type === 'custom' ? 'flex' : 'none';
  document.getElementById('key-hint').textContent = KEY_HINTS[type];
  document.getElementById('model-fetch-field').style.display = type === 'openrouter' ? 'block' : 'none';
  saveSettings();
  if (type !== 'openrouter') populateSelectsCustom();
  else fetchFreeModels();
}

function getBaseUrl() {
  if (apiType === 'custom') {
    return (document.getElementById('custom-base-url').value || '').trim().replace(/\/$/, '');
  }
  return API_BASE_URLS[apiType];
}

function saveSettings() {
  localStorage.setItem('chat_settings', JSON.stringify({
    apiType,
    customBaseUrl: document.getElementById('custom-base-url').value,
    temp: document.getElementById('temp-slider').value,
    maxTok: document.getElementById('maxtok-slider').value,
    validationMode,
    compareMode,
  }));
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('chat_settings') || '{}');
    if (s.apiType) setApiType(s.apiType);
    if (s.customBaseUrl) document.getElementById('custom-base-url').value = s.customBaseUrl;
    if (s.temp) {
      document.getElementById('temp-slider').value = s.temp;
      document.getElementById('temp-display').textContent = parseFloat(s.temp).toFixed(2);
    }
    if (s.maxTok) {
      document.getElementById('maxtok-slider').value = s.maxTok;
      document.getElementById('maxtok-display').textContent = parseInt(s.maxTok);
    }
    if (s.validationMode || s.prosecutorMode) {
      validationMode = true;
      updateValidationUI();
    }
    if (s.compareMode) {
      compareMode = true;
      updateCompareUI();
    }
  } catch (e) {}
}

function clearAllData() {
  if (!confirm('Clear saved API key and settings?')) return;
  localStorage.removeItem('or_api_key');
  localStorage.removeItem('chat_settings');
  const inp = document.getElementById('api-key-input');
  if (inp) inp.value = '';
  updateKeyUI('');
  closeSettings();
}

function handleKeyInput(val) {
  localStorage.setItem('or_api_key', val.trim());
  updateKeyUI(val.trim());
}

function updateKeyUI(val) {
  const dot = document.getElementById('key-dot');
  const pill = document.getElementById('key-status-pill');
  const label = document.getElementById('key-pill-label');
  const hasKey = !!val;
  if (dot) dot.className = 'key-dot' + (hasKey ? ' ok' : '');
  if (pill) pill.classList.toggle('has-key', hasKey);
  if (label) label.textContent = hasKey ? (val.slice(0, 8) + '…') : 'Configure API';
}

function toggleKeyVis() {
  const inp = document.getElementById('api-key-input');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

function loadKey() {
  const k = localStorage.getItem('or_api_key') || '';
  const inp = document.getElementById('api-key-input');
  if (inp) inp.value = k;
  updateKeyUI(k);
}

let compareMode = false;

function toggleCompareMode() {
  compareMode = !compareMode;
  updateCompareUI();
  saveSettings();
}

function updateCompareUI() {
  const btn = document.getElementById('compare-toggle-btn');
  const modelRow = document.getElementById('model-row');
  const singleWrap = document.getElementById('single-model-wrap');
  const compareSlots = document.getElementById('compare-slots');
  const responsesArea = document.getElementById('responses-area');
  const respColRight = document.getElementById('resp-col-right');
  const diffBtn = document.getElementById('diff-btn');

  if (btn) btn.classList.toggle('active', compareMode);
  if (modelRow) modelRow.style.display = compareMode ? 'flex' : 'none';
  if (singleWrap) singleWrap.style.display = compareMode ? 'none' : 'flex';
  if (compareSlots) compareSlots.classList.toggle('visible', compareMode);
  if (diffBtn) diffBtn.style.display = compareMode ? 'flex' : 'none';

  if (compareMode) {
    if (responsesArea) responsesArea.classList.add('compare-mode');
    if (respColRight) respColRight.style.display = 'flex';
    const mainSel = document.getElementById('model-select');
    const leftSel = document.getElementById('model-left');
    if (mainSel && leftSel) leftSel.value = mainSel.value;
    updateModelName('left');
  } else {
    if (responsesArea) responsesArea.classList.remove('compare-mode');
    if (respColRight) respColRight.style.display = 'none';
    const colMain = document.getElementById('resp-col-main');
    if (colMain && document.getElementById('resp-col-left-header')) {
      colMain.style.borderRight = 'none';
      colMain.innerHTML = buildEmptyState();
    }
    const proxy = document.getElementById('response-left');
    if (proxy && proxy.style.display === 'none' && proxy.parentNode === document.body) {
      proxy.remove();
    }
  }
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
          <div class="suggestion-card__label">Compare</div>
          <div class="suggestion-card__text">How do the sources differ on this topic?</div>
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
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
    if (!res.ok) return;
    const data = await res.json();
    const providerMap = {
      'meta-llama': 'Meta', 'google': 'Google', 'mistralai': 'Mistral', 'qwen': 'Alibaba',
      'deepseek': 'DeepSeek', 'microsoft': 'Microsoft', 'nvidia': 'Nvidia', 'anthropic': 'Anthropic',
      'openai': 'OpenAI', 'nousresearch': 'Nous', 'cohere': 'Cohere',
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
  ['model-single', 'model-left', 'model-right'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
  const preferred = 'meta-llama/llama-3.3-70b-instruct:free';
  const m = MODELS.find(x => x.id === preferred);
  ['model-select', 'model-single', 'model-left'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el && m) el.value = m.id;
  });
  const preferredB = 'google/gemini-2.0-flash-exp:free';
  const mB = MODELS.find(x => x.id === preferredB);
  const elB = document.getElementById('model-right');
  if (elB && mB) elB.value = mB.id;
  else if (elB && MODELS[3]) elB.value = MODELS[3].id;
  ['single', 'left', 'right'].forEach(side => updateModelName(side));
}

function onMainModelChange() {
  const mainVal = document.getElementById('model-select').value;
  const single = document.getElementById('model-single');
  const left = document.getElementById('model-left');
  if (single) single.value = mainVal;
  if (left && !compareMode) left.value = mainVal;
  updateModelName('single');
  updateModelName('left');
}

function onModelChange(side) {
  updateModelName(side);
  updateStatusDot(side, null);
  if (!compareMode && side === 'single') {
    const leftEl = document.getElementById('model-left');
    const singleEl = document.getElementById('model-single');
    if (leftEl && singleEl) leftEl.value = singleEl.value;
    updateModelName('left');
  }
}

function updateModelName(side) {
  const selId = side === 'single' ? 'model-single' : 'model-' + side;
  const sel = document.getElementById(selId);
  if (!sel) return;
  const m = MODELS.find(x => x.id === sel.value);
  const nameId = side === 'single' ? 'name-left' : 'name-' + side;
  const nameEl = document.getElementById(nameId);
  if (m && nameEl) nameEl.textContent = m.label;
}

function updateStatusDot(side, state) {
  const dotId = 'dot-' + (side === 'single' ? 'left' : side);
  const dot = document.getElementById(dotId);
  if (!dot) return;
  dot.className = 'resp-status-dot' + (state ? ' ' + state : '');
}

let abortLeft = null, abortRight = null;
const sessionLog = [];

function sendMessage() {
  const activeDocs = uploadedDocs.filter(d => d.active && d.status === 'ready');
  if (activeDocs.length > 0) {
    sendRagQuery();
  } else {
    sendComparePrompt();
  }
}

function showError(msg) {
  const el = document.getElementById('input-error');
  const txt = document.getElementById('input-error-text');
  if (el) el.classList.remove('hidden');
  if (txt) txt.textContent = msg;
}

function setSendState(busy) {
  const btn = document.getElementById('send-btn');
  if (btn) btn.disabled = busy;
}

async function sendComparePrompt() {
  const apiKey = (document.getElementById('api-key-input')?.value || localStorage.getItem('or_api_key') || '').trim();
  const prompt = (document.getElementById('main-prompt')?.value || '').trim();
  const sysPrompt = (document.getElementById('sys-drawer-text') || {}).value?.trim() || '';

  document.getElementById('input-error')?.classList.add('hidden');
  if (!apiKey) { showError('No API key — click the key pill or ⚙ to configure'); openSettings(); return; }
  if (!prompt) { showError('Type a prompt first.'); return; }

  if (abortLeft) abortLeft.abort();
  if (abortRight) abortRight.abort();

  const mainSel = document.getElementById('model-select');
  const modelLeft = compareMode
    ? document.getElementById('model-left').value
    : (mainSel ? mainSel.value : document.getElementById('model-single').value);
  const modelRight = document.getElementById('model-right').value;

  setSendState(true);

  const emptyState = document.getElementById('rag-empty-state');
  if (emptyState) emptyState.style.display = 'none';
  const ragMsgs = document.getElementById('rag-messages');
  if (ragMsgs) ragMsgs.style.display = 'flex';

  if (compareMode) {
    document.getElementById('responses-area')?.classList.add('compare-mode');
    const rcr = document.getElementById('resp-col-right');
    if (rcr) rcr.style.display = 'flex';

    const colMain = document.getElementById('resp-col-main');
    if (colMain) colMain.style.borderRight = '1px solid var(--border)';
    if (colMain && !document.getElementById('resp-col-left-header')) {
      colMain.innerHTML = `
        <div class="resp-col-header" id="resp-col-left-header">
          <div class="resp-status-dot" id="dot-left"></div>
          <span class="resp-model-name" id="name-left">—</span>
          <div class="resp-meta" id="meta-left" style="display:none;">
            <span id="time-left" class="resp-meta-val">–</span>s·<span id="tps-left" class="resp-meta-val">–</span>t/s·TTFT <span id="ttft-left" class="resp-meta-val">–</span>
          </div>
        </div>
        <div class="resp-body" id="response-left"><div class="resp-empty">Select a model and send a prompt</div></div>
        <div class="resp-tags" id="tags-left">
          <button class="resp-tag-btn" onclick="toggleTag('left','hallucination')">⚠ Hallucination</button>
          <button class="resp-tag-btn" onclick="toggleTag('left','truncated')">✂ Truncated</button>
          <button class="resp-tag-btn" onclick="toggleTag('left','formatting')">✦ Formatting</button>
          <button class="resp-tag-btn" onclick="saveToNotebook('left')" style="margin-left:auto;color:var(--accent);border-color:rgba(99,102,241,0.3);">+ Notebook</button>
        </div>
        <div class="msg-actions-bar" id="actions-left">
          <button class="msg-act-btn" onclick="copyResponse('left')">Copy</button>
          <button class="msg-act-btn" onclick="regenResponse('left')">Regen</button>
          <button class="msg-act-btn" onclick="saveToNotebook('left')">+ Notebook</button>
          <div class="msg-act-spacer"></div>
          <button class="msg-act-btn thumb" id="thumb-up-left" onclick="rateResponse('left','up')">👍</button>
          <button class="msg-act-btn thumb" id="thumb-down-left" onclick="rateResponse('left','down')">👎</button>
        </div>`;
    }
  } else {
    const userDiv = document.createElement('div');
    userDiv.className = 'rag-msg user';
    userDiv.innerHTML = `<div class="rag-avatar">You</div><div class="rag-bubble">${escHtml(prompt)}</div>`;
    ragMsgs.appendChild(userDiv);

    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'rag-msg assistant';
    assistantDiv.innerHTML = `
      <div class="rag-avatar">✦</div>
      <div class="rag-bubble" id="response-left-bubble">
        <span class="stream-cursor"></span>
      </div>`;
    ragMsgs.appendChild(assistantDiv);
    ragMsgs.scrollTop = ragMsgs.scrollHeight;

    let proxyEl = document.getElementById('response-left');
    if (!proxyEl) {
      proxyEl = document.createElement('div');
      proxyEl.id = 'response-left';
      proxyEl.style.display = 'none';
      document.body.appendChild(proxyEl);
    }
    proxyEl._bubbleTarget = document.getElementById('response-left-bubble');
  }

  const sides = compareMode ? ['left', 'right'] : ['left'];

  sides.forEach(side => {
    const r = document.getElementById('response-' + side);
    if (r) {
      const savedBubbleTarget = r._bubbleTarget || null;
      r.innerHTML = '';
      r.classList.remove('rendered');
      if (savedBubbleTarget) r._bubbleTarget = savedBubbleTarget;
    }
    const m = document.getElementById('meta-' + side);
    if (m) m.style.display = 'none';
    const t = document.getElementById('tags-' + side);
    if (t) t.classList.remove('show');
    updateStatusDot(side, null);
  });

  abortLeft = new AbortController();
  abortRight = new AbortController();

  const messages = [];
  if (sysPrompt) messages.push({ role: 'system', content: sysPrompt });
  messages.push({ role: 'user', content: prompt });

  const temperature = parseFloat(document.getElementById('temp-slider').value);
  const maxTokens = parseInt(document.getElementById('maxtok-slider').value);
  const baseUrl = getBaseUrl();

  const promises = [
    streamResponse('left', modelLeft, messages, apiKey, abortLeft.signal, temperature, maxTokens, baseUrl)
  ];
  if (compareMode) {
    promises.push(
      streamResponse('right', modelRight, messages, apiKey, abortRight.signal, temperature, maxTokens, baseUrl)
    );
  }
  await Promise.allSettled(promises);

  setSendState(false);
  document.getElementById('main-prompt').value = '';
  updateTokenCount('');

  sessionLog.push({
    timestamp: new Date().toISOString(),
    side: 'left',
    model: modelLeft,
    prompt,
    response: document.getElementById('response-left')?.textContent || '',
    tags: [],
  });
}

async function streamResponse(side, modelId, messages, apiKey, signal, temperature, maxTokens, baseUrl) {
  const respEl = document.getElementById('response-' + side);
  if (!respEl) return;
  const bubbleTarget = respEl._bubbleTarget || null;
  const renderTarget = bubbleTarget || respEl;

  const cursor = document.createElement('span');
  cursor.className = 'stream-cursor';
  renderTarget.innerHTML = '';
  renderTarget.appendChild(cursor);

  updateStatusDot(side, null);

  const t0 = performance.now();
  let ttft = null, completionTokens = 0, text = '', lastDomUpdate = 0;

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    if (baseUrl.includes('openrouter')) {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Klyxe Chat';
    }

    const res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST', headers, signal,
      body: JSON.stringify({ model: modelId, messages, stream: true, temperature, max_tokens: maxTokens }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      cursor.remove();
      renderTarget.innerHTML = `<div style="color:#f87171;font-size:13px;">[Error] ${d?.error?.message || `HTTP ${res.status}`}</div>`;
      updateStatusDot(side, 'err');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();
        if (raw === '[DONE]') continue;
        try {
          const chunk = JSON.parse(raw);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            if (ttft === null) ttft = performance.now() - t0;
            text += delta;
            completionTokens++;
            const now = performance.now();
            if (now - lastDomUpdate > 16) {
              renderTarget.textContent = text;
              renderTarget.appendChild(cursor);
              lastDomUpdate = now;
              if (bubbleTarget) {
                const container = document.getElementById('rag-messages');
                if (container) container.scrollTop = container.scrollHeight;
              }
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    cursor.remove();
    if (err.name === 'AbortError') {
      renderMarkdownSide(side, text ? text + '\n\n*[Stopped]*' : '*[Stopped]*', bubbleTarget);
    } else {
      renderTarget.innerHTML = `<div style="color:#f87171;font-size:13px;">[Error] ${err.message}</div>`;
      updateStatusDot(side, 'err');
    }
    return;
  }

  cursor.remove();
  renderMarkdownSide(side, text, bubbleTarget);
  showStats(side, t0, completionTokens, text, ttft);
  updateStatusDot(side, ttft && ttft < 2000 ? 'ok' : 'slow');
  if (bubbleTarget) {
    const container = document.getElementById('rag-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }
}

function renderMarkdownSide(side, text, customTarget) {
  const respEl = customTarget || document.getElementById('response-' + side);
  if (!text || !respEl) return;
  if (window.marked) {
    respEl.classList.add('rendered');
    respEl.innerHTML = marked.parse(text);
    respEl.querySelectorAll('pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'resp-copy-btn';
      btn.textContent = 'copy';
      btn.onclick = () => {
        navigator.clipboard.writeText(pre.querySelector('code')?.textContent || '');
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = 'copy', 1500);
      };
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
    if (window.hljs) {
      respEl.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    }
  } else {
    respEl.textContent = text;
  }
  const tags = document.getElementById('tags-' + side);
  if (tags) tags.classList.add('show');
}

function showStats(side, t0, completionTokens, text, ttft) {
  const elapsed = (performance.now() - t0) / 1000;
  const tokens = completionTokens > 0
    ? completionTokens
    : Math.round(text.split(/\s+/).filter(Boolean).length * 1.3);
  const tps = tokens > 0 && elapsed > 0 ? (tokens / elapsed).toFixed(1) : '–';
  const timeEl = document.getElementById('time-' + side);
  const tpsEl = document.getElementById('tps-' + side);
  const ttftEl = document.getElementById('ttft-' + side);
  const metaEl = document.getElementById('meta-' + side);
  if (timeEl) timeEl.textContent = elapsed.toFixed(2);
  if (tpsEl) tpsEl.textContent = tps;
  if (ttftEl) ttftEl.textContent = ttft ? (ttft / 1000).toFixed(2) + 's' : '–';
  if (metaEl) metaEl.style.display = 'flex';
}

function toggleTag(side, tag) {
  const btns = document.querySelectorAll(`#tags-${side} .resp-tag-btn`);
  const tagMap = { hallucination: 0, truncated: 1, formatting: 2 };
  const btn = btns[tagMap[tag]];
  if (!btn) return;
  btn.classList.toggle('on');
}

const notebookCards = [];

function saveToNotebook(side) {
  const respEl = document.getElementById('response-' + side);
  const text = respEl ? (respEl.innerText || respEl.textContent || '').trim() : '';
  if (!text) {
    const last = [...sessionLog].reverse().find(e => e.side === side || (!compareMode && side === 'left'));
    if (!last || !last.response) return;
    _appendToNotebook(side, last.model, last.response);
    return;
  }
  const modelSel = side === 'right'
    ? document.getElementById('model-right')
    : (compareMode ? document.getElementById('model-left') : document.getElementById('model-select'));
  const model = modelSel ? modelSel.value : '—';
  _appendToNotebook(side, model, text);
}

function _appendToNotebook(side, model, text) {
  const card = { id: Date.now(), model, text, ts: new Date().toISOString() };
  notebookCards.push(card);
  const ta = document.getElementById('nb-quick');
  if (ta) {
    ta.value += (ta.value ? '\n\n---\n\n' : '') + `[${model}]\n${text}`;
  }
}

let diffActive = false;

function toggleDiff() {
  diffActive = !diffActive;
  const btn = document.getElementById('diff-btn');
  if (btn) btn.classList.toggle('active', diffActive);
  if (diffActive) {
    applyDiff();
  } else {
    const l = [...sessionLog].reverse().find(e => e.side === 'left');
    const r = [...sessionLog].reverse().find(e => e.side === 'right');
    if (l) renderMarkdownSide('left', l.response);
    if (r) renderMarkdownSide('right', r.response);
  }
}

function applyDiff() {
  const lEl = document.getElementById('response-left');
  const rEl = document.getElementById('response-right');
  if (!lEl || !rEl) return;
  const lWords = (lEl.innerText || '').split(/\s+/);
  const rWords = (rEl.innerText || '').split(/\s+/);
  const lcs = buildLCS(lWords, rWords);
  lEl.innerHTML = diffHighlight(lWords, lcs, 'left');
  rEl.innerHTML = diffHighlight(rWords, lcs, 'right');
  lEl.classList.add('rendered');
  rEl.classList.add('rendered');
}

function buildLCS(a, b) {
  const m = Math.min(a.length, 200), n = Math.min(b.length, 200);
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { lcs.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return new Set(lcs);
}

function diffHighlight(words, lcs, side) {
  return words.map(w => {
    const esc = w.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (lcs.has(w)) return esc;
    const cls = side === 'left' ? 'diff-del' : 'diff-add';
    return `<mark class="${cls}">${esc}</mark>`;
  }).join(' ');
}

function exportJSON() {
  if (!sessionLog.length) { alert('No data yet. Send a prompt first.'); return; }
  const blob = new Blob([JSON.stringify(sessionLog, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `klyxe-chat-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyResponse(side) {
  const el = document.getElementById('response-' + side);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText || el.textContent || '').then(() => {
    const btn = event.target.closest('.msg-act-btn');
    if (!btn) return;
    const prev = btn.innerHTML;
    btn.innerHTML = '✓ Copied';
    setTimeout(() => btn.innerHTML = prev, 1500);
  });
}

function regenResponse(side) {
  const modelSel = side === 'right'
    ? document.getElementById('model-right')
    : document.getElementById(compareMode ? 'model-left' : 'model-select');
  if (!modelSel) return;
  const prompt = document.getElementById('main-prompt').value.trim();
  if (!prompt) { alert('No prompt to regenerate'); return; }
  const apiKey = (document.getElementById('api-key-input')?.value || '').trim();
  if (!apiKey) { showError('No API key'); openSettings(); return; }
  const sysPrompt = document.getElementById('sys-drawer-text')?.value?.trim() || '';
  const temperature = parseFloat(document.getElementById('temp-slider').value);
  const maxTokens = parseInt(document.getElementById('maxtok-slider').value);
  const baseUrl = getBaseUrl();
  const messages = [];
  if (sysPrompt) messages.push({ role: 'system', content: sysPrompt });
  messages.push({ role: 'user', content: prompt });
  const r = document.getElementById('response-' + side);
  if (r) { r.innerHTML = ''; r.classList.remove('rendered'); }
  const m = document.getElementById('meta-' + side);
  if (m) m.style.display = 'none';
  const t = document.getElementById('tags-' + side);
  if (t) t.classList.remove('show');
  const ac = new AbortController();
  if (side === 'left') abortLeft = ac;
  else abortRight = ac;
  streamResponse(side, modelSel.value, messages, apiKey, ac.signal, temperature, maxTokens, baseUrl);
}

function rateResponse(side, vote) {
  const upBtn = document.getElementById('thumb-up-' + side);
  const downBtn = document.getElementById('thumb-down-' + side);
  if (!upBtn || !downBtn) return;
  const isActive = (vote === 'up' ? upBtn : downBtn).classList.contains('active-' + vote);
  upBtn.classList.remove('active-up');
  downBtn.classList.remove('active-down');
  if (!isActive) {
    (vote === 'up' ? upBtn : downBtn).classList.add('active-' + vote);
  }
}

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const DB_KEY_PROVIDERS = 'rag_providers_v2';
const DB_KEY_ACTIVE_PROV = 'rag_active_provider';
let activeProviderId = null;

function loadProviders() {
  try { return JSON.parse(localStorage.getItem(DB_KEY_PROVIDERS) || '[]'); } catch { return []; }
}

function saveProviders(list) {
  localStorage.setItem(DB_KEY_PROVIDERS, JSON.stringify(list));
}

function renderProvidersList() {
  const el = document.getElementById('providers-list-el');
  if (!el) return;
  const list = loadProviders();
  activeProviderId = localStorage.getItem(DB_KEY_ACTIVE_PROV);
  if (!list.length) {
    el.innerHTML = `<div class="docs-empty-hint" style="padding:12px 0;">No providers yet.</div>`;
    return;
  }
  el.innerHTML = list.map(p => `
    <div class="provider-item ${p.id === activeProviderId ? 'active-provider' : ''}">
      <div class="provider-name"><div class="provider-dot ${p._status || ''}"></div>${escHtml(p.name)}</div>
      <div class="provider-url">${escHtml(p.url)}</div>
      <div class="provider-model">${escHtml(p.model || '—')}</div>
      <div class="provider-actions">
        <button class="prov-btn test" onclick="testProvider('${p.id}')">Test</button>
        <button class="prov-btn use" onclick="activateProvider('${p.id}')">Use</button>
        <button class="prov-btn" onclick="openProviderModal('${p.id}')">Edit</button>
        <button class="prov-btn del" onclick="deleteProvider('${p.id}')">Del</button>
      </div>
    </div>
  `).join('');
}

function openProviderModal(editId) {
  const list = loadProviders();
  const p = editId ? list.find(x => x.id === editId) : null;
  document.getElementById('prov-modal-title').textContent = p ? 'Edit Provider' : 'Add Provider';
  document.getElementById('prov-edit-id').value = editId || '';
  document.getElementById('prov-name').value = p?.name || '';
  document.getElementById('prov-url').value = p?.url || 'https://openrouter.ai/api/v1';
  document.getElementById('prov-key').value = p?.key || '';
  document.getElementById('prov-model').value = p?.model || '';
  document.getElementById('prov-modal-scrim').classList.add('open');
  setTimeout(() => document.getElementById('prov-name').focus(), 50);
}

function closeProviderModal(e) {
  if (e && e.target !== document.getElementById('prov-modal-scrim')) return;
  document.getElementById('prov-modal-scrim').classList.remove('open');
}

function saveProvider() {
  const editId = document.getElementById('prov-edit-id').value;
  const name = document.getElementById('prov-name').value.trim();
  const url = document.getElementById('prov-url').value.trim().replace(/\/$/, '');
  const key = document.getElementById('prov-key').value.trim();
  const model = document.getElementById('prov-model').value.trim();
  if (!name || !url) { alert('Name and Base URL are required.'); return; }
  const list = loadProviders();
  if (editId) {
    const idx = list.findIndex(x => x.id === editId);
    if (idx >= 0) list[idx] = { ...list[idx], name, url, key, model };
  } else {
    list.push({ id: 'prov_' + Date.now(), name, url, key, model, _status: '' });
    if (!activeProviderId) activateProvider(list[list.length - 1].id, true);
  }
  saveProviders(list);
  document.getElementById('prov-modal-scrim').classList.remove('open');
  renderProvidersList();
}

function activateProvider(id, silent) {
  activeProviderId = id;
  localStorage.setItem(DB_KEY_ACTIVE_PROV, id);
  renderProvidersList();
  if (!silent) addRagMessage('system', '✓ Provider activated.');
}

function deleteProvider(id) {
  if (!confirm('Delete this provider?')) return;
  const list = loadProviders().filter(x => x.id !== id);
  saveProviders(list);
  if (activeProviderId === id) {
    activeProviderId = list[0]?.id || null;
    localStorage.setItem(DB_KEY_ACTIVE_PROV, activeProviderId || '');
  }
  renderProvidersList();
}

async function testProvider(id) {
  const list = loadProviders();
  const p = list.find(x => x.id === id);
  if (!p) return;
  p._status = 'testing';
  saveProviders(list);
  renderProvidersList();
  try {
    const res = await fetch(p.url + '/models', { headers: { 'Authorization': 'Bearer ' + p.key } });
    p._status = res.ok ? 'ok' : 'err';
  } catch {
    p._status = 'err';
  }
  saveProviders(list);
  renderProvidersList();
}

function getRagProvider() {
  const list = loadProviders();
  activeProviderId = localStorage.getItem(DB_KEY_ACTIVE_PROV);
  return list.find(p => p.id === activeProviderId) || list[0] || null;
}

const uploadedDocs = [];
const CHUNK_SIZE = 800;
const MAX_CHUNKS = 20;

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function chunkText(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

async function extractPdfText(arrayBuffer) {
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js not loaded');
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n\n';
  }
  return text;
}

async function handleFileUpload(files) {
  Array.from(files).forEach(async file => {
    const doc = {
      id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      name: file.name,
      size: formatBytes(file.size),
      type: file.name.split('.').pop().toLowerCase(),
      status: 'indexing',
      content: null,
      chunks: [],
      active: true,
    };
    uploadedDocs.push(doc);
    renderDocList();
    updateDocBadge();
    try {
      const ab = await file.arrayBuffer();
      let text = '';
      if (doc.type === 'pdf') text = await extractPdfText(ab);
      else text = new TextDecoder().decode(ab);
      doc.content = text;
      doc.chunks = chunkText(text, CHUNK_SIZE);
      doc.status = 'ready';
    } catch (e) {
      doc.status = 'error';
      doc.error = e.message;
    }
    renderDocList();
    updateContextBudget();
  });
}

async function fetchUrlSource() {
  const input = document.getElementById('url-fetch-input');
  const btn = document.getElementById('url-fetch-btn');
  const url = input.value.trim();
  if (!url) return;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const data = await res.json();
    const html = data.contents || '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('script,style,nav,footer,header').forEach(el => el.remove());
    const text = (tmp.textContent || '').replace(/\s{3,}/g, '\n\n').trim();
    if (!text) throw new Error('No text extracted');
    const doc = {
      id: 'doc_url_' + Date.now(),
      name: url.replace(/^https?:\/\//, '').slice(0, 50),
      size: formatBytes(text.length),
      type: 'url',
      status: 'ready',
      content: text,
      chunks: chunkText(text, CHUNK_SIZE),
      active: true,
    };
    uploadedDocs.push(doc);
    input.value = '';
    renderDocList();
    updateDocBadge();
    updateContextBudget();
  } catch (e) {
    addRagMessage('system', '⚠ URL fetch failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Fetch';
  }
}

function renderDocList() {
  const el = document.getElementById('docs-list-el');
  if (!el) return;
  if (!uploadedDocs.length) {
    el.innerHTML = `<div class="docs-empty-hint">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="opacity:0.3;margin:0 auto 8px;display:block;">
        <path d="M4 4h10l4 4v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M14 4v4h4" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      Add your sources to start
    </div>`;
    return;
  }
  const icons = { pdf: '📄', txt: '📝', md: '📝', docx: '📋', csv: '📈', url: '🌐' };
  el.innerHTML = uploadedDocs.map(doc => `
    <div class="doc-item">
      <input type="checkbox" class="doc-checkbox" ${doc.active ? 'checked' : ''}
        onclick="toggleDocActive('${doc.id}', this.checked); event.stopPropagation();">
      <div class="doc-icon ${doc.type === 'url' ? 'url' : ''}">
        ${icons[doc.type] || '📄'}
      </div>
      <div class="doc-info" onclick="viewDoc('${doc.id}')">
        <div class="doc-name" title="${escHtml(doc.name)}">${escHtml(doc.name)}</div>
        <div class="doc-meta">${doc.size}${doc.chunks?.length ? ' · ' + doc.chunks.length + ' chunks' : ''}</div>
      </div>
      <div class="doc-status-dot ${doc.status}"></div>
      <div class="source-item-actions">
        <button class="source-gear-btn" onclick="openSourceSettings('${doc.id}');event.stopPropagation();">⚙</button>
        <button class="doc-del-btn" onclick="removeDoc('${doc.id}')">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
  `).join('');
  updateSourcesCount();
}

function toggleDocActive(id, active) {
  const doc = uploadedDocs.find(d => d.id === id);
  if (doc) { doc.active = active; updateContextBudget(); }
}

function openSourceSettings(id) {
  const doc = uploadedDocs.find(d => d.id === id);
  if (!doc) return;
  const chunkSize = prompt('chunk size tokens', String(doc.chunkSize || 512));
  if (chunkSize) doc.chunkSize = Math.max(64, parseInt(chunkSize, 10) || 512);
  const overlap = prompt('overlap percent', String(doc.overlap || 20));
  if (overlap) doc.overlap = Math.min(80, Math.max(0, parseInt(overlap, 10) || 20));
}

function removeDoc(id) {
  const idx = uploadedDocs.findIndex(d => d.id === id);
  if (idx >= 0) uploadedDocs.splice(idx, 1);
  renderDocList();
  updateDocBadge();
  updateContextBudget();
}

function viewDoc(id, highlightChunkIdx) {
  const doc = uploadedDocs.find(d => d.id === id);
  if (!doc || !doc.content) return;
  openPreviewPanel();
  document.getElementById('rp-viewer-empty').classList.add('hidden');
  document.getElementById('rp-viewer-content').classList.remove('hidden');
  document.getElementById('viewer-doc-name').textContent = doc.name;

  const MAX_PREVIEW = 8000;
  let previewText = doc.content.slice(0, MAX_PREVIEW);
  if (doc.content.length > MAX_PREVIEW) previewText += '\n\n[… truncated for preview]';

  if (highlightChunkIdx !== undefined && doc.chunks[highlightChunkIdx]) {
    const chunkTxt = doc.chunks[highlightChunkIdx];
    document.getElementById('viewer-chunk-info').textContent = `chunk ${highlightChunkIdx + 1}/${doc.chunks.length}`;
    const escaped = escHtml(previewText);
    const escapedChunk = escHtml(chunkTxt.slice(0, 200));
    const highlighted = escaped.replace(escapedChunk, `<mark class="highlight-chunk">${escapedChunk}</mark>`);
    document.getElementById('viewer-text').innerHTML = highlighted;
    setTimeout(() => {
      const mark = document.getElementById('viewer-text').querySelector('.highlight-chunk');
      if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  } else {
    document.getElementById('viewer-chunk-info').textContent = doc.chunks.length + ' chunks';
    document.getElementById('viewer-text').textContent = previewText;
  }
}

function updateDocBadge() {
  updateSourcesCount();
}

function updateContextBudget() {
  const activeDocs = uploadedDocs.filter(d => d.active && d.status === 'ready');
  const totalChunks = activeDocs.reduce((s, d) => s + (d.chunks?.length || 0), 0);
  const usedChunks = Math.min(totalChunks, MAX_CHUNKS);
  const estTokens = usedChunks * CHUNK_SIZE / 4;
  const maxTokens = 16000;
  const pct = Math.min(100, (estTokens / maxTokens) * 100);
  const fill = document.getElementById('ctx-budget-fill');
  const label = document.getElementById('ctx-budget-label');
  if (fill) {
    fill.style.width = pct + '%';
    fill.className = 'ctx-budget-fill' + (pct > 85 ? ' over' : pct > 60 ? ' warn' : '');
  }
  if (label) label.textContent = `~${Math.round(estTokens / 1000)}k / 16k tokens`;
  const bar = document.getElementById('rag-status-bar');
  if (bar) bar.classList.toggle('visible', activeDocs.length > 0);
  updateSourcesCount();
}

let ragMode = 'hybrid';
let ragHistory = [];

function setRagMode(mode) {
  ragMode = mode;
  document.querySelectorAll('.rag-mode-btn').forEach(b => b.classList.remove('active'));
  const map = { sources: 'rag-mode-only', hybrid: 'rag-mode-hybrid', model: 'rag-mode-model' };
  const btn = document.getElementById(map[mode]);
  if (btn) btn.classList.add('active');
  updateRagStatus();
}

async function sendRagQuery() {
  const prompt = document.getElementById('main-prompt').value.trim();
  if (!prompt) return;

  const provider = getRagProvider();
  let baseUrl, apiKey, model;

  if (provider) {
    baseUrl = provider.url;
    apiKey = provider.key;
    model = document.getElementById('model-select').value || provider.model;
  } else {
    baseUrl = getBaseUrl();
    apiKey = (document.getElementById('api-key-input')?.value || '').trim();
    model = document.getElementById('model-select').value;
  }

  if (!apiKey) {
    if (provider) addRagMessage('system', '⚠ Provider has no API key.');
    else openSettings();
    return;
  }

  const activeDocs = uploadedDocs.filter(d => d.active && d.status === 'ready');
  if (!activeDocs.length) {
    addRagMessage('user', prompt);
    addRagMessage('assistant', 'No active documents. Upload files or enable sources with the checkboxes.');
    document.getElementById('main-prompt').value = '';
    return;
  }

  addRagMessage('user', prompt);
  updateRagStatus(prompt.split(/\s+/).filter(Boolean).length * 1.3, 0);
  setRagSearching(true);
  document.getElementById('main-prompt').value = '';
  document.getElementById('send-btn').disabled = true;

  const contextChunks = [];
  let chunkCount = 0;
  for (const doc of activeDocs) {
    for (let ci = 0; ci < doc.chunks.length && chunkCount < MAX_CHUNKS; ci++, chunkCount++) {
      contextChunks.push({ docId: doc.id, docName: doc.name, chunkIdx: ci, text: doc.chunks[ci] });
    }
  }

  const contextBlock = contextChunks.map((c, i) =>
    `[SOURCE ${i + 1} | ${c.docName} | chunk ${c.chunkIdx + 1}]\n${c.text}`
  ).join('\n\n---\n\n');

  const sysPrompt = `You are a precise document assistant. Answer ONLY based on the provided sources.
When you reference information, insert citations like [1], [2] matching the SOURCE number.
If the answer is not in the documents, say so clearly.

SOURCES:
${contextBlock}`;

  const loadingId = 'loading-' + Date.now();
  addRagMessage('assistant', '<span class="stream-cursor"></span>', loadingId);
  const msgEl = document.getElementById(loadingId);
  const bubble = msgEl ? msgEl.querySelector('.rag-bubble') : null;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  if (baseUrl.includes('openrouter')) {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Klyxe RAG';
  }

  try {
    const res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST', headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sysPrompt },
          ...ragHistory.slice(-6),
          { role: 'user', content: prompt },
        ],
        stream: true, max_tokens: 1500, temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (bubble) bubble.textContent = '[Error] ' + (d?.error?.message || `HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', text = '';
    if (bubble) bubble.innerHTML = '<span class="stream-cursor"></span>';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();
        if (raw === '[DONE]') continue;
        try {
          const chunk = JSON.parse(raw);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            text += delta;
            if (bubble) {
              bubble.textContent = text;
              const cur = document.createElement('span');
              cur.className = 'stream-cursor';
              bubble.appendChild(cur);
            }
          }
        } catch {}
      }
    }

    if (bubble) {
      const outputTokens = text.split(/\s+/).filter(Boolean).length * 1.3;
      const inputTokens = (prompt.split(/\s+/).filter(Boolean).length + contextBlock.split(/\s+/).filter(Boolean).length) * 1.1;
      const estCost = ((inputTokens + outputTokens) / 1000000) * 0.7;
      updateRagStatus(inputTokens + outputTokens, estCost);

      const rendered = window.marked ? marked.parse(text) : escHtml(text);
      const withCites = rendered.replace(/\[(\d+)\]/g, (_, n) => {
        const idx = parseInt(n) - 1;
        const chunk = contextChunks[idx];
        if (!chunk) return `[${n}]`;
        return `<span class="rag-cite-num" title="${escHtml(chunk.docName)}" onclick="viewDoc('${chunk.docId}', ${chunk.chunkIdx})">${n}</span>`;
      });
      bubble.innerHTML = withCites;

      const usedDocIds = new Set();
      text.match(/\[(\d+)\]/g)?.forEach(m => {
        const idx = parseInt(m.slice(1, -1)) - 1;
        if (contextChunks[idx]) usedDocIds.add(contextChunks[idx].docId);
      });
      if (usedDocIds.size) {
        const srcDiv = document.createElement('div');
        srcDiv.className = 'rag-sources';
        usedDocIds.forEach(id => {
          const doc = uploadedDocs.find(d => d.id === id);
          if (!doc) return;
          const chip = document.createElement('span');
          chip.className = 'rag-source-chip';
          chip.title = 'Click to view source';
          chip.textContent = '📄 ' + doc.name;
          chip.onclick = () => viewDoc(doc.id);
          srcDiv.appendChild(chip);
        });
        bubble.appendChild(srcDiv);
      }

      if (validationMode) {
        const valDiv = document.createElement('div');
        valDiv.className = 'rag-validation rag-val-text';
        valDiv.innerHTML = `<span style="color:#f59e0b;">⚖</span> Validating…`;
        bubble.appendChild(valDiv);
        validateResponse(text, contextBlock.slice(0, 2000), apiKey, model, valDiv, baseUrl, headers);
      }

      ragHistory.push({ role: 'user', content: prompt });
      ragHistory.push({ role: 'assistant', content: text });
    }
    document.getElementById('rag-messages').scrollTop = 9999;
  } catch (err) {
    if (bubble) bubble.textContent = '[Error] ' + err.message;
  } finally {
    setRagSearching(false);
    document.getElementById('send-btn').disabled = false;
  }
}

async function validateResponse(answer, context, apiKey, model, valDiv, baseUrl, headers) {
  try {
    const res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST', headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user',
          content: `Fact-check this answer against the sources.\n\nAnswer: "${answer.slice(0, 500)}"\n\nSources: "${context.slice(0, 1000)}"\n\nRespond ONLY with JSON: {"status":"ok" or "conflict","note":"one sentence"}`
        }],
        max_tokens: 150, temperature: 0,
      }),
    });
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '{}').replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    if (result.status === 'ok') {
      valDiv.className = 'rag-validation rag-val-ok';
      valDiv.innerHTML = `✓ ${result.note || 'Verified.'}`;
    } else {
      valDiv.className = 'rag-validation rag-val-warn';
      valDiv.innerHTML = `⚠ ${result.note || 'Possible conflict.'}`;
    }
  } catch {
    valDiv.className = 'rag-validation rag-val-text';
    valDiv.innerHTML = `⚖ Validation unavailable`;
  }
}

function addRagMessage(role, text, id) {
  const container = document.getElementById('rag-messages');
  if (!container) return;
  const empty = document.getElementById('rag-empty-state');
  if (empty) empty.style.display = 'none';
  container.style.display = 'flex';
  const div = document.createElement('div');
  div.className = `rag-msg ${role === 'system' ? 'assistant' : role}`;
  if (id) div.id = id;
  const bubbleStyle = role === 'system' ? 'opacity:0.7;font-size:12px;font-style:italic;' : '';
  div.innerHTML = `<div class="rag-avatar">${role === 'user' ? 'You' : '✦'}</div>
    <div class="rag-bubble" style="${bubbleStyle}">${text}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function updateRagStatus(tokens, cost) {
  const tokEl = document.getElementById('rag-token-status');
  const costEl = document.getElementById('rag-cost-status');
  if (tokEl && typeof tokens === 'number') tokEl.textContent = `~${Math.max(0, Math.round(tokens))} tokens`;
  if (costEl && typeof cost === 'number') costEl.textContent = `$${Math.max(0, cost).toFixed(4)}`;
}

function updateSourcesCount() {
  const items = uploadedDocs.length;
  const counter = document.getElementById('sources-count');
  if (counter) counter.textContent = '(' + items + ')';
}

function setRagSearching(active) {
  const ind = document.getElementById('rag-sources-indicator');
  if (!ind) return;
  const items = uploadedDocs.filter(d => d.active && d.status === 'ready').length;
  if (active && items > 0) {
    ind.textContent = '⟳ Searching ' + items + ' source' + (items !== 1 ? 's' : '') + '…';
    ind.classList.add('searching');
  } else {
    ind.textContent = '';
    ind.classList.remove('searching');
  }
}

function useSuggestion(btn) {
  const text = btn.querySelector('.suggestion-card__text').textContent;
  const ta = document.getElementById('main-prompt');
  if (ta) { ta.value = text; ta.focus(); updateTokenCount(text); }
}

let sysDrawerOpen = false;

function toggleSysDrawer() {
  sysDrawerOpen ? closeSysDrawer() : openSysDrawer();
}

function openSysDrawer() {
  sysDrawerOpen = true;
  document.getElementById('sys-drawer').classList.add('open');
  document.getElementById('sys-toggle-btn').classList.add('active');
  const saved = localStorage.getItem('klyxe_sys_prompt');
  const drawerTa = document.getElementById('sys-drawer-text');
  if (saved && drawerTa && !drawerTa.value) drawerTa.value = saved;
  updateSysDrawerTokenCount();
  setTimeout(() => { const ta = document.getElementById('sys-drawer-text'); if (ta) ta.focus(); }, 50);
}

function closeSysDrawer() {
  sysDrawerOpen = false;
  document.getElementById('sys-drawer').classList.remove('open');
  document.getElementById('sys-toggle-btn').classList.remove('active');
}

function closeSysDrawerScrim(e) {
  if (e && e.target === document.getElementById('sys-drawer')) closeSysDrawer();
}

function updateSysDrawerTokenCount() {
  const ta = document.getElementById('sys-drawer-text');
  const countEl = document.getElementById('sys-drawer-tokens');
  if (!ta || !countEl) return;
  const tokens = Math.round(ta.value.split(/\s+/).filter(Boolean).length * 1.3);
  countEl.textContent = '~' + tokens + ' tokens';
}

function clearSysPrompt() {
  const ta = document.getElementById('sys-drawer-text');
  if (ta) ta.value = '';
  updateSysDrawerTokenCount();
}

function saveSysPromptLS() {
  const ta = document.getElementById('sys-drawer-text');
  if (!ta) return;
  localStorage.setItem('klyxe_sys_prompt', ta.value);
  const btn = event.target;
  const prev = btn.textContent;
  btn.textContent = '✓ Saved';
  setTimeout(() => btn.textContent = prev, 1500);
}

function insertSysVar(variable) {
  const ta = document.getElementById('sys-drawer-text');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + variable + ta.value.slice(e);
  ta.selectionStart = ta.selectionEnd = s + variable.length;
  ta.focus();
  updateSysDrawerTokenCount();
}

const PROMPT_LIBRARY = [
  { name: '🔬 Researcher', text: 'You are a research assistant. Answer questions using only the provided {{sources}}. Cite your sources with [1], [2], etc. Be precise and factual. Today is {{today}}.' },
  { name: '📚 Teacher', text: 'You are a helpful teacher. Explain concepts clearly, use simple language, and provide examples. Base your answers on {{sources}} when available. Language: {{language}}.' },
  { name: '⚖️ Lawyer', text: 'You are a legal analysis assistant. Analyze documents objectively, identify key clauses, risks, and obligations. Use only the provided {{sources}}. Do not give personal legal advice.' },
  { name: '💻 Programmer', text: 'You are a senior software engineer. Provide clean, documented code solutions. Explain your approach. When referencing documentation, cite {{sources}}.' },
  { name: '📊 Data Analyst', text: 'You are a data analyst. Analyze the provided data and documents ({{sources}}), identify patterns, and summarize key insights. Be concise and use structured output.' },
  { name: '📝 Summarizer', text: 'You are a document summarization assistant. Create concise, structured summaries of {{sources}}. Use headers and bullet points. Always maintain factual accuracy.' },
  { name: '❓ FAQ Builder', text: 'Based on {{sources}}, generate a comprehensive FAQ. Format as Q: / A: pairs. Focus on the most commonly asked questions and important information.' },
];

function openPromptLibrary() {
  const list = document.getElementById('prompt-lib-list');
  if (!list) return;
  list.innerHTML = PROMPT_LIBRARY.map((p, i) => `
    <div class="prompt-lib-item" onclick="applyPromptTemplate(${i})">
      <div class="prompt-lib-name">${p.name}</div>
      <div class="prompt-lib-preview">${p.text.slice(0, 80)}…</div>
    </div>
  `).join('');
  document.getElementById('prompt-lib-modal').classList.add('open');
}

function closePromptLibrary(e) {
  if (e && e.target !== document.getElementById('prompt-lib-modal')) return;
  document.getElementById('prompt-lib-modal').classList.remove('open');
}

function applyPromptTemplate(idx) {
  const p = PROMPT_LIBRARY[idx];
  if (!p) return;
  const ta = document.getElementById('sys-drawer-text');
  if (ta) ta.value = p.text;
  updateSysDrawerTokenCount();
  closePromptLibrary(null);
}

let currentStudioTool = 'quiz';
let studioResult = '';
const studioNotebook = [];

const STUDIO_TOOLS = {
  flashcards: { name: 'Flashcards', prompt: 'Generate {count} flashcards from the documents. Format each as:\nQ: [question]\nA: [answer]\n\n{focus}', showType: false },
  quiz: { name: 'Quiz', prompt: 'Generate {count} quiz questions ({type}) from the documents. Format each as:\n[N]. Question?\na) b) c) d)\nAnswer: [letter]\n\n{focus}', showType: true },
  mindmap: { name: 'Mindmap', prompt: 'Create a structured mindmap outline from the documents. Use indentation.\n{focus}', showType: false, countLabel: 'Max depth', countVal: 3, countMax: 5 },
  report: { name: 'Report', prompt: 'Write a structured summary report with sections: Overview, Key Findings, Conclusions.\n{focus}', showType: false, countLabel: 'Max pages', countVal: 2 },
  podcast: { name: 'Podcast', prompt: 'Write a podcast script ({count} minutes) discussing key topics. Format as Host/Guest dialogue.\n{focus}', showType: false, countLabel: 'Minutes' },
  faq: { name: 'FAQ', prompt: 'Generate {count} FAQ entries. Format as:\nQ: [question]\nA: [answer]\n\n{focus}', showType: false },
};

function selectStudioTool(tool) {
  currentStudioTool = tool;
  const t = STUDIO_TOOLS[tool];
  document.getElementById('studio-cards-grid').style.display = 'none';
  document.getElementById('studio-result').classList.remove('visible');
  document.getElementById('studio-gen-form').classList.add('visible');
  document.getElementById('studio-form-title-text').textContent = t.name;
  const countInput = document.getElementById('studio-count');
  const countField = document.getElementById('studio-count-field');
  countField.querySelector('label').textContent = t.countLabel || 'Count';
  countInput.value = t.countVal || 5;
  countInput.max = t.countMax || 30;
  document.getElementById('studio-type-field').style.display = t.showType ? 'flex' : 'none';
}

function backToStudioCards() {
  document.getElementById('studio-cards-grid').style.display = 'grid';
  document.getElementById('studio-gen-form').classList.remove('visible');
  document.getElementById('studio-result').classList.remove('visible');
}

async function runStudioGen() {
  const activeDocs = uploadedDocs.filter(d => d.active && d.status === 'ready');
  if (!activeDocs.length) { alert('Upload at least one document first.'); return; }

  const provider = getRagProvider();
  const apiKey = provider?.key || (document.getElementById('api-key-input')?.value || '').trim();
  if (!apiKey) { alert('Configure an API key first.'); return; }

  const t = STUDIO_TOOLS[currentStudioTool];
  const count = document.getElementById('studio-count').value;
  const type = document.getElementById('studio-type').value;
  const focus = document.getElementById('studio-focus').value.trim();

  const typeLabels = { mcq: 'multiple choice', truefalse: 'true/false', open: 'open-ended' };
  const promptText = t.prompt
    .replace('{count}', count)
    .replace('{type}', typeLabels[type] || type)
    .replace('{focus}', focus ? 'Focus on: ' + focus : '');

  const contextParts = activeDocs.slice(0, 3).map(d =>
    `[${d.name}]\n${d.content?.slice(0, 2000) || ''}`
  ).join('\n\n---\n\n');

  const btn = document.getElementById('studio-gen-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="mini-spinner"></div> Generating…';

  const resultBox = document.getElementById('studio-result-box');
  const resultDiv = document.getElementById('studio-result');
  resultBox.textContent = '';
  resultDiv.classList.add('visible');
  document.getElementById('studio-gen-form').classList.remove('visible');

  const baseUrl = provider ? provider.url : getBaseUrl();
  const model = document.getElementById('model-select').value;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + apiKey,
  };
  if (!provider && apiType === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Klyxe Studio';
  }

  try {
    const res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST', headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a content generation assistant. Use ONLY the provided documents.' },
          { role: 'user', content: promptText + '\n\nDocuments:\n\n' + contextParts },
        ],
        stream: true, max_tokens: 2000, temperature: 0.5,
      }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      resultBox.textContent = '[Error] ' + (d?.error?.message || `HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', text = '';
    resultBox.innerHTML = '<span class="stream-cursor"></span>';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();
        if (raw === '[DONE]') continue;
        try {
          const chunk = JSON.parse(raw);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            text += delta;
            resultBox.textContent = text;
            const cur = document.createElement('span');
            cur.className = 'stream-cursor';
            resultBox.appendChild(cur);
          }
        } catch {}
      }
    }
    resultBox.textContent = text;
    studioResult = text;
  } catch (err) {
    resultBox.textContent = '[Error] ' + err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4h4l-3 2.5 1 4L8 9l-4 2.5 1-4L2 5h4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" opacity="0.7"/></svg> Generate';
  }
}

function copyStudioResult() {
  navigator.clipboard.writeText(studioResult).then(() => {
    const btn = event.target;
    const p = btn.textContent;
    btn.textContent = '✓ Copied';
    setTimeout(() => btn.textContent = p, 1500);
  });
}

function regenStudio() {
  document.getElementById('studio-result').classList.remove('visible');
  document.getElementById('studio-gen-form').classList.add('visible');
}

function saveStudioToNotebook() {
  if (!studioResult) return;
  studioNotebook.push({ id: Date.now(), tool: currentStudioTool, text: studioResult, ts: new Date().toISOString() });
  const ta = document.getElementById('nb-quick');
  if (ta) {
    ta.value += (ta.value ? '\n\n---\n\n' : '') + `[Studio:${currentStudioTool}]\n${studioResult}`;
  }
  const btn = event.target;
  const p = btn.textContent;
  btn.textContent = '✓ Saved';
  setTimeout(() => btn.textContent = p, 1500);
}

let chatSessions = [];

(function loadChatSessions() {
  try { chatSessions = JSON.parse(localStorage.getItem('klyxe_chat_sessions') || '[]'); } catch { chatSessions = []; }
  renderChatHistory();
})();

function saveChatSession() {
  if (!ragHistory.length && !sessionLog.length) return;
  const firstMsg = ragHistory[0]?.content || sessionLog[0]?.prompt || 'Untitled';
  const session = {
    id: 'sess_' + Date.now(),
    name: firstMsg.slice(0, 40) + (firstMsg.length > 40 ? '…' : ''),
    ts: new Date().toISOString(),
    log: sessionLog.slice(),
  };
  chatSessions.unshift(session);
  if (chatSessions.length > 20) chatSessions = chatSessions.slice(0, 20);
  localStorage.setItem('klyxe_chat_sessions', JSON.stringify(chatSessions));
  renderChatHistory();
}

function renderChatHistory() {
  const el = document.getElementById('chat-hist-items');
  if (!el) return;
  if (!chatSessions.length) {
    el.innerHTML = '<div style="padding:6px 10px;font-size:11px;color:var(--text-secondary);">No saved sessions yet</div>';
    return;
  }
  el.innerHTML = chatSessions.slice(0, 8).map(s => `
    <div class="chat-hist-item" title="${escHtml(s.name)}">
      <span class="chat-hist-icon">💬</span>
      <div class="chat-hist-info">
        <div class="chat-hist-name">${escHtml(s.name)}</div>
        <div class="chat-hist-date">${formatRelativeDate(s.ts)}</div>
      </div>
    </div>
  `).join('');
}

function formatRelativeDate(ts) {
  const d = new Date(ts);
  const diff = (new Date() - d) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString();
}

function filterChatSessions(query) {
  const q = (query || '').trim().toLowerCase();
  document.querySelectorAll('.chat-hist-item').forEach(el => {
    const t = (el.textContent || '').toLowerCase();
    el.style.display = !q || t.includes(q) ? 'flex' : 'none';
  });
}

function newChatSession() {
  if (ragHistory.length || sessionLog.length) saveChatSession();
  ragHistory.length = 0;
  sessionLog.length = 0;

  const colMain = document.getElementById('resp-col-main');
  if (colMain) {
    colMain.style.borderRight = 'none';
    colMain.innerHTML = `
      <div id="rag-empty-state" class="empty-state">
        <div>
          <div class="empty-state__title">What would you like to explore?</div>
          <div class="empty-state__hint">Add a source on the left, or ask anything.</div>
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
            <div class="suggestion-card__label">Deep dive</div>
            <div class="suggestion-card__text">Explain the methodology in detail.</div>
          </button>
          <button class="suggestion-card" onclick="useSuggestion(this)">
            <div class="suggestion-card__label">Critique</div>
            <div class="suggestion-card__text">What are the weaknesses of this argument?</div>
          </button>
        </div>
      </div>
      <div class="rag-messages" id="rag-messages" style="display:none;"></div>`;
  }

  const proxy = document.getElementById('response-left');
  if (proxy && proxy.style.display === 'none' && proxy.parentNode === document.body) {
    proxy.remove();
  }

  const ta = document.getElementById('main-prompt');
  if (ta) ta.value = '';
  updateTokenCount('');
  renderChatHistory();
}

window.addEventListener('beforeunload', () => {
  if (ragHistory.length || sessionLog.length) saveChatSession();
});

function renameNotebook(el) {
  const old = el.textContent;
  el.contentEditable = 'true';
  el.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
  el.onblur = function () {
    el.contentEditable = 'false';
    if (!el.textContent.trim()) el.textContent = old;
    localStorage.setItem('klyxe_notebook_title', el.textContent.trim());
  };
  el.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
}

(function () {
  const saved = localStorage.getItem('klyxe_notebook_title');
  const el = document.getElementById('notebook-title');
  if (saved && el) el.textContent = saved;
})();

document.getElementById('main-prompt').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    const btn = document.getElementById('send-btn');
    if (!btn.disabled) sendMessage();
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    const s = this.selectionStart, en = this.selectionEnd;
    this.value = this.value.slice(0, s) + '\n' + this.value.slice(en);
    this.selectionStart = this.selectionEnd = s + 1;
    updateTokenCount(this.value);
  }
});

document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    const input = document.getElementById('chat-search-input');
    if (!input) return;
    e.preventDefault();
    input.focus();
    input.select();
  }
});

(function () {
  const zone = document.getElementById('drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files);
  });
})();

function init() {
  loadKey();
  loadSettings();
  populateAllSelects();
  fetchFreeModels();
  renderProvidersList();
  updateRagStatus();
  activeProviderId = localStorage.getItem(DB_KEY_ACTIVE_PROV);
  setTimeout(() => {
    const provider = getRagProvider();
    const sel = document.getElementById('model-select');
    if (sel && provider?.model) {
      const existing = Array.from(sel.options).find(o => o.value === provider.model);
      if (!existing) {
        const opt = document.createElement('option');
        opt.value = opt.textContent = provider.model;
        sel.insertBefore(opt, sel.firstChild);
        sel.value = provider.model;
      }
    }
  }, 800);
}

init();
