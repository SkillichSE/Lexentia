function openSettings() {
  document.getElementById('settings-drawer').classList.add('open');
  document.getElementById('settings-scrim').classList.add('open');
}

function closeSettings() {
  document.getElementById('settings-drawer').classList.remove('open');
  document.getElementById('settings-scrim').classList.remove('open');
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
  const selectedModel = document.getElementById('model-select')?.value || '';
  localStorage.setItem('chat_settings', JSON.stringify({
    apiType,
    customBaseUrl: document.getElementById('custom-base-url').value,
    temp: document.getElementById('temp-slider').value,
    maxTok: document.getElementById('maxtok-slider').value,
    selectedModel,
    validationMode,
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
      document.getElementById('maxtok-display').textContent = parseInt(s.maxTok, 10);
    }
    if (s.selectedModel) localStorage.setItem('chat_model_selected', s.selectedModel);
    if (s.validationMode || s.prosecutorMode) {
      validationMode = true;
      updateValidationUI();
    }
  } catch (e) {}
}

function clearAllData() {
  const gate = prompt('type CLEAR to remove saved key and settings');
  if (gate !== 'CLEAR') return;
  localStorage.removeItem('or_api_key');
  localStorage.removeItem('chat_settings');
  localStorage.removeItem('chat_model_selected');
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
    <details class="provider-item provider-accordion ${p.id === activeProviderId ? 'active-provider' : ''}" ${p.id === activeProviderId ? 'open' : ''}>
      <summary class="provider-summary">
        <div class="provider-name"><div class="provider-dot ${p._status || ''}"></div>${escHtml(p.name)}</div>
        <div class="provider-summary-right">
          <span class="provider-chip">${p.id === activeProviderId ? 'active' : 'saved'}</span>
          <span class="provider-model">${escHtml(p.model || 'model not set')}</span>
        </div>
      </summary>
      <div class="provider-body">
        <div class="provider-url">${escHtml(p.url)}</div>
        <div class="provider-note">provider specific endpoint and key are stored locally in this browser</div>
      </div>
      <div class="provider-actions">
        <button class="prov-btn use" onclick="activateProvider('${p.id}')">Use provider</button>
        <button class="prov-btn test" onclick="testProvider('${p.id}')">Test</button>
        <button class="prov-btn" onclick="openProviderModal('${p.id}')">Edit</button>
        <button class="prov-btn del" onclick="deleteProvider('${p.id}')">Delete</button>
      </div>
    </details>
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
  if (e) {
    const scrim = document.getElementById('prov-modal-scrim');
    if (e.target !== scrim) return;
  }
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
  const active = getRagProvider();
  if (active && active.id === (editId || activeProviderId)) refreshModelsForActiveProvider();
}

function activateProvider(id, silent) {
  activeProviderId = id;
  localStorage.setItem(DB_KEY_ACTIVE_PROV, id);
  renderProvidersList();
  refreshModelsForActiveProvider();
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
    const base = p.url.replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (p.key) headers.Authorization = 'Bearer ' + p.key;
    const modelsRes = await fetch(base + '/models', { headers });
    let modelId = p.model || '';
    if (modelsRes.ok) {
      const data = await modelsRes.json().catch(() => ({}));
      const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const first = rows.find((m) => m?.id)?.id;
      if (!modelId && first) modelId = first;
    }
    if (!modelId) modelId = 'llama-3.1-8b-instant';
    const payload = {
      model: modelId,
      messages: [{ role: 'user', content: 'ping' }],
      max_completion_tokens: 8,
      temperature: 0,
      stream: false,
    };
    const chatRes = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!chatRes.ok) {
      const raw = await chatRes.text().catch(() => '');
      throw new Error(`chat test http ${chatRes.status} ${raw.slice(0, 140)}`);
    }
    p._status = 'ok';
    addRagMessage('system', 'provider test passed');
  } catch {
    p._status = 'err';
    addRagMessage('system', 'provider test failed check key model and endpoint');
  }
  saveProviders(list);
  renderProvidersList();
}

async function refreshModelsForActiveProvider() {
  const provider = getRagProvider();
  if (!provider || !provider.url) return;
  const base = provider.url.replace(/\/$/, '');
  const requests = [base + '/models'];
  if (!base.endsWith('/openai/v1')) requests.push(base + '/openai/v1/models');

  function mapModelRows(raw, providerName) {
    const fromData = Array.isArray(raw?.data) ? raw.data : null;
    const fromModels = Array.isArray(raw?.models) ? raw.models : null;
    const fromArray = Array.isArray(raw) ? raw : null;
    const rows = fromData || fromModels || fromArray || [];
    return rows
      .map((m) => {
        if (typeof m === 'string') {
          const id = m.trim();
          if (!id) return null;
          return { id, label: id, provider: providerName };
        }
        const id = String(m?.id || m?.name || m?.model || '').trim();
        if (!id) return null;
        const label = String(m?.name || m?.id || m?.model || id);
        return { id, label, provider: providerName };
      })
      .filter(Boolean);
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (provider.key) headers.Authorization = 'Bearer ' + provider.key;
    let mapped = [];
    let lastError = null;
    for (const endpoint of requests) {
      try {
        const res = await fetch(endpoint, { headers });
        if (!res.ok) throw new Error('http ' + res.status);
        const data = await res.json().catch(() => ({}));
        mapped = mapModelRows(data, String(provider.name || 'custom'));
        if (mapped.length) break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!mapped.length && provider.model) {
      mapped = [{ id: provider.model, label: provider.model, provider: String(provider.name || 'custom') }];
    }
    if (!mapped.length) throw (lastError || new Error('provider returned empty model list'));
    MODELS = mapped;
    populateAllSelects();
    const sel = document.getElementById('model-select');
    if (sel) {
      if (provider.model && mapped.some((m) => m.id === provider.model)) sel.value = provider.model;
      else sel.value = mapped[0].id;
    }
  } catch (err) {
    if (provider.model) {
      MODELS = [{ id: provider.model, label: provider.model, provider: String(provider.name || 'custom') }];
      populateAllSelects();
      const sel = document.getElementById('model-select');
      if (sel) sel.value = provider.model;
      addRagMessage('system', '⚠ model list unavailable using provider default model');
      return;
    }
    addRagMessage('system', '⚠ could not load provider models ' + (err?.message || String(err)));
  }
}

function getRagProvider() {
  const list = loadProviders();
  activeProviderId = localStorage.getItem(DB_KEY_ACTIVE_PROV);
  return list.find(p => p.id === activeProviderId) || list[0] || null;
}
