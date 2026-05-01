let activeAbortController = null;
const sessionLog = [];
let lastUiError = { text: '', at: 0 };
let streamInFlight = false;
let lastRateLimitAt = 0;
let rateLimitHits = 0;
let cooldownTimer = null;
let cooldownUntil = 0;

async function sendMessage() {
  if (streamInFlight || activeAbortController || window.__klyxeAbortBackendStream) {
    if (activeAbortController) {
      try { activeAbortController.abort(); } catch {}
      activeAbortController = null;
    }
    if (window.__klyxeAbortBackendStream) {
      try { window.__klyxeAbortBackendStream(); } catch {}
      window.__klyxeAbortBackendStream = null;
    }
    setSendState(false);
    return;
  }
  try {
    const mode = typeof ragMode === 'string' ? ragMode : 'hybrid';
    if (mode !== 'model' && typeof sendRagQuery === 'function') {
      await sendRagQuery();
      return;
    }
    await sendDirectPrompt();
  } catch (err) {
    showError('send failed: ' + (err?.message || String(err)));
  } finally {
    setSendState(false);
  }
}

function stopCooldownMeter() {
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = null;
  cooldownUntil = 0;
  document.getElementById('input-error-progress')?.classList.add('hidden');
  document.getElementById('input-error-meta')?.classList.add('hidden');
  const fill = document.getElementById('input-error-progress-fill');
  if (fill) fill.style.width = '0%';
}

function toggleErrorDetails() {
  const details = document.getElementById('input-error-details');
  if (!details) return;
  details.classList.toggle('hidden');
}

function startCooldownMeter(seconds) {
  const total = Math.max(1, Math.round(seconds || 0));
  const progress = document.getElementById('input-error-progress');
  const fill = document.getElementById('input-error-progress-fill');
  const meta = document.getElementById('input-error-meta');
  const label = document.getElementById('input-error-cooldown-label');
  if (!progress || !fill || !meta || !label) return;
  stopCooldownMeter();
  const startedAt = Date.now();
  cooldownUntil = startedAt + total * 1000;
  progress.classList.remove('hidden');
  meta.classList.remove('hidden');
  const tick = () => {
    const leftMs = Math.max(0, cooldownUntil - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const pct = Math.max(0, Math.min(100, ((total * 1000 - leftMs) / (total * 1000)) * 100));
    fill.style.width = `${pct}%`;
    label.textContent = `wait ${leftSec}s`;
    if (leftMs <= 0) stopCooldownMeter();
  };
  tick();
  cooldownTimer = setInterval(tick, 250);
}

function showError(msg, opts = {}) {
  const now = Date.now();
  if (lastUiError.text === msg && now - lastUiError.at < 2000) return;
  lastUiError = { text: msg, at: now };
  const el = document.getElementById('input-error');
  const txt = document.getElementById('input-error-text');
  const meta = document.getElementById('input-error-meta');
  const detailsBtn = document.getElementById('input-error-details-btn');
  const details = document.getElementById('input-error-details');
  if (el) el.classList.remove('hidden');
  if (txt) txt.textContent = msg;
  if (details) {
    details.textContent = opts.details || '';
    details.classList.add('hidden');
  }
  if (detailsBtn) detailsBtn.classList.toggle('hidden', !opts.details);
  if (meta && !opts.retryAfterSec) meta.classList.add('hidden');
  if (!opts.retryAfterSec) stopCooldownMeter();
  if (opts.retryAfterSec) startCooldownMeter(opts.retryAfterSec);
}

function parseRetryAfterSec(res, raw, parsed) {
  const fromHeader = res.headers.get('retry-after');
  if (fromHeader) {
    const asNum = Number(fromHeader);
    if (Number.isFinite(asNum) && asNum > 0) return Math.ceil(asNum);
  }
  const text = String(parsed?.error?.message || parsed?.message || raw || '');
  const m = text.match(/(\d+(?:\.\d+)?)\s*s(ec(ond)?s?)?/i);
  if (m) return Math.max(1, Math.ceil(Number(m[1])));
  return 20;
}

function renderHttpError(target, status, details, retryAfterSec) {
  if (!target) return;
  const compact = status === 429
    ? `rate limit exceeded try again in ${retryAfterSec}s`
    : `request failed http ${status}`;
  target.innerHTML = `<div style="color:#fca5a5;font-size:12px;">${escHtml(compact)}</div>`;
  if (status === 429) {
    const now = Date.now();
    if (now - lastRateLimitAt < 8000) rateLimitHits += 1;
    else rateLimitHits = 1;
    lastRateLimitAt = now;
    const repeat = rateLimitHits > 1 ? ` (${rateLimitHits}x)` : '';
    showError(`too many requests${repeat} try again in ${retryAfterSec}s`, { retryAfterSec, details });
  } else {
    showError(`request failed http ${status}`, { details });
  }
}

function setSendState(busy) {
  const btn = document.getElementById('send-btn');
  streamInFlight = !!busy;
  if (!btn) return;
  btn.classList.toggle('busy', !!busy);
  btn.title = busy ? 'click to stop' : 'send';
}

async function sendDirectPrompt() {
  const provider = typeof getRagProvider === 'function' ? getRagProvider() : null;
  const inputKey = (document.getElementById('api-key-input')?.value || localStorage.getItem('or_api_key') || '').trim();
  const providerKey = (provider?.key || '').trim();
  const apiKeys = Array.from(new Set([providerKey, inputKey].filter(Boolean)));
  const prompt = (document.getElementById('main-prompt')?.value || '').trim();
  const sysPrompt = (document.getElementById('sys-drawer-text') || {}).value?.trim() || '';
  const model = document.getElementById('model-select')?.value || provider?.model;

  document.getElementById('input-error')?.classList.add('hidden');
  if (!apiKeys.length) { showError('No API key. Open settings and configure it.'); openSettings(); return; }
  if (!prompt) { showError('Type a prompt first.'); return; }
  if (activeAbortController) activeAbortController.abort();

  const baseUrl = provider?.url || getBaseUrl();
  if (!baseUrl) {
    showError('set base url in settings before sending');
    openSettings();
    return;
  }
  setSendState(true);
  const emptyState = document.getElementById('rag-empty-state');
  if (emptyState) emptyState.style.display = 'none';
  let ragMsgs = document.getElementById('rag-messages');
  if (!ragMsgs) {
    const colMain = document.getElementById('resp-col-main');
    if (colMain) {
      colMain.innerHTML = buildEmptyState();
      ragMsgs = document.getElementById('rag-messages');
    }
  }
  if (!ragMsgs) {
    showError('chat container is not available');
    setSendState(false);
    return;
  }
  ragMsgs.style.display = 'flex';

  const userDiv = document.createElement('div');
  userDiv.className = 'rag-msg user';
  userDiv.innerHTML = `<div class="rag-avatar">You</div><div class="rag-bubble">${escHtml(prompt)}</div>`;
  ragMsgs.appendChild(userDiv);

  const assistantDiv = document.createElement('div');
  const bubbleId = 'response-left-bubble-' + Date.now();
  assistantDiv.className = 'rag-msg assistant';
  assistantDiv.innerHTML = `<div class="rag-avatar">✦</div><div class="rag-bubble" id="${bubbleId}"><span class="stream-cursor"></span></div>`;
  ragMsgs.appendChild(assistantDiv);
  ragMsgs.scrollTop = ragMsgs.scrollHeight;

  let proxyEl = document.getElementById('response-left');
  if (!proxyEl) {
    proxyEl = document.createElement('div');
    proxyEl.id = 'response-left';
    proxyEl.style.display = 'none';
    document.body.appendChild(proxyEl);
  }
  proxyEl._bubbleTarget = assistantDiv.querySelector('.rag-bubble');
  proxyEl.innerHTML = '';

  const messages = [];
  if (sysPrompt) messages.push({ role: 'system', content: sysPrompt });
  messages.push({ role: 'user', content: prompt });
  const temperature = parseFloat(document.getElementById('temp-slider').value);
  const maxTokens = parseInt(document.getElementById('maxtok-slider').value, 10);
  activeAbortController = new AbortController();

  await streamResponse('left', model, messages, apiKeys, activeAbortController.signal, temperature, maxTokens, baseUrl);
  activeAbortController = null;

  setSendState(false);
  document.getElementById('main-prompt').value = '';
  updateTokenCount('');
  sessionLog.push({
    timestamp: new Date().toISOString(),
    side: 'left',
    model,
    prompt,
    response: assistantDiv.querySelector('.rag-bubble')?.textContent || '',
    tags: [],
  });
}

async function streamResponse(side, modelId, messages, apiKeys, signal, temperature, maxTokens, baseUrl) {
  const respEl = document.getElementById('response-' + side);
  if (!respEl) return;
  const bubbleTarget = respEl._bubbleTarget || null;
  const renderTarget = bubbleTarget || respEl;

  const cursor = document.createElement('span');
  cursor.className = 'stream-cursor';
  renderTarget.innerHTML = '';
  renderTarget.appendChild(cursor);

  const t0 = performance.now();
  let completionTokens = 0;
  let text = '';
  let ttft = null;
  let lastDomUpdate = 0;

  try {
    const payload = { model: modelId, messages, stream: true, temperature };
    if ((baseUrl || '').toLowerCase().includes('groq.com')) payload.max_completion_tokens = maxTokens;
    else payload.max_tokens = maxTokens;
    let res = null;
    for (let i = 0; i < apiKeys.length; i += 1) {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys[i]}`,
      };
      if (baseUrl.includes('openrouter')) {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'Klyxe Chat';
      }
      const candidate = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify(payload),
      });
      if (candidate.ok || candidate.status !== 401 || i === apiKeys.length - 1) {
        res = candidate;
        break;
      }
    }
    if (!res) throw new Error('provider request failed');

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      let parsed = {};
      try { parsed = raw ? JSON.parse(raw) : {}; } catch {}
      const details = (parsed?.error?.message || parsed?.message || raw || '').toString().slice(0, 600);
      const retryAfterSec = parseRetryAfterSec(res, raw, parsed);
      cursor.remove();
      renderHttpError(renderTarget, res.status, details, retryAfterSec);
      if (res.status === 401) showError('invalid api key for active provider', { details });
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
            completionTokens += 1;
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

    const rendered = await renderMarkdown(text);
    if (!text.trim()) {
      renderTarget.innerHTML = '<div style="color:#f87171;font-size:13px;">[Error] empty response from provider</div>';
      return;
    }
    renderTarget.innerHTML = rendered;
    respEl.classList.add('rendered');

    const elapsed = (performance.now() - t0) / 1000;
    const tps = completionTokens > 0 ? (completionTokens / Math.max(0.01, elapsed)).toFixed(1) : '0.0';
    const time = elapsed.toFixed(2);
    const meter = document.getElementById('rag-cost-status');
    if (meter) meter.textContent = `${time}s · ${tps} t/s · ttft ${(ttft || 0).toFixed(0)}ms`;
  } catch (err) {
    if (err?.name === 'AbortError') {
      renderTarget.innerHTML = '<span style="opacity:0.65;">aborted</span>';
    } else {
      renderTarget.innerHTML = `<div style="color:#f87171;font-size:13px;">[Error] ${escHtml(err.message || String(err))}</div>`;
    }
  }
}

function exportJSON() {
  if (!sessionLog.length) { alert('No data yet. Send a prompt first.'); return; }
  const blob = new Blob([JSON.stringify(sessionLog, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `klyxe-chat-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
