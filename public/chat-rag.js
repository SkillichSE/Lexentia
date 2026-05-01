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
  let baseUrl, model;
  let apiKeys = [];

  if (provider) {
    baseUrl = provider.url;
    const inputKey = (document.getElementById('api-key-input')?.value || localStorage.getItem('or_api_key') || '').trim();
    const providerKey = (provider.key || '').trim();
    apiKeys = Array.from(new Set([providerKey, inputKey].filter(Boolean)));
    model = document.getElementById('model-select').value || provider.model;
  } else {
    baseUrl = getBaseUrl();
    apiKeys = [(document.getElementById('api-key-input')?.value || '').trim()].filter(Boolean);
    model = document.getElementById('model-select').value;
  }
  if (!baseUrl) {
    showError('set base url in settings before sending');
    openSettings();
    return;
  }

  if (!apiKeys.length) {
    if (provider) addRagMessage('system', '⚠ Provider has no API key.');
    else openSettings();
    return;
  }

  const activeDocs = uploadedDocs.filter(d => d.active && d.status === 'ready');
  const runtime = window.KlyxeChatRuntime || {};
  const backendMode = !!runtime.backendReady;
  if (ragMode === 'sources' && !backendMode && !activeDocs.length) {
    addRagMessage('user', prompt);
    addRagMessage('assistant', 'No active documents. Upload files or enable sources with the checkboxes.');
    return;
  }

  addRagMessage('user', prompt);
  updateRagStatus(prompt.split(/\s+/).filter(Boolean).length * 1.3, 0);
  setRagSearching(true);
  document.getElementById('main-prompt').value = '';
  if (typeof setSendState === 'function') setSendState(true);

  if (backendMode && window.streamChatFromBackend) {
    if (window.__klyxeAbortBackendStream) {
      try { window.__klyxeAbortBackendStream(); } catch {}
      window.__klyxeAbortBackendStream = null;
    }
    const loadingId = 'loading-' + Date.now();
    addRagMessage('assistant', '<span class="stream-cursor"></span>', loadingId);
    const msgEl = document.getElementById(loadingId);
    const bubble = msgEl ? msgEl.querySelector('.rag-bubble') : null;
    let streamedText = '';
    let finished = false;
    const startedAt = Date.now();
    const statusTimer = setInterval(() => {
      if (finished) return;
      const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const meter = document.getElementById('rag-cost-status');
      if (meter) meter.textContent = `waiting ${secs}s for backend`;
    }, 1000);
    const timeoutId = setTimeout(() => {
      if (finished) return;
      if (bubble) bubble.textContent = 'backend is taking too long try again';
      clearInterval(statusTimer);
      setRagSearching(false);
      if (typeof setSendState === 'function') setSendState(false);
    }, 25000);
    const selectedSourceIds = uploadedDocs
      .filter(d => d.active)
      .map(d => Number(d.id))
      .filter(n => Number.isFinite(n));
    window.__klyxeAbortBackendStream = streamChatFromBackend(
      {
        session_id: runtime.sessionId || 1,
        notebook_id: runtime.notebookId || 1,
        prompt,
        selected_source_ids: selectedSourceIds.length ? selectedSourceIds : null,
        model,
      },
      {
        onToken: (data) => {
          streamedText += data.delta || '';
          if (bubble) bubble.textContent = streamedText;
        },
        onDone: async (data) => {
          finished = true;
          clearTimeout(timeoutId);
          clearInterval(statusTimer);
          if (bubble) {
            if (!streamedText.trim()) {
              bubble.textContent = '[Error] empty response from backend stream';
              setRagSearching(false);
              if (typeof setSendState === 'function') setSendState(false);
              return;
            }
            const rendered = await renderMarkdown(streamedText);
            bubble.innerHTML = rendered;
            const citations = data.citations || [];
            if (citations.length) {
              const srcDiv = document.createElement('div');
              srcDiv.className = 'rag-sources';
              citations.forEach((c, idx) => {
                const chip = document.createElement('span');
                chip.className = 'rag-source-chip';
                chip.textContent = `📄 ${c.source_name || `Source ${idx + 1}`}`;
                chip.title = 'Click to preview source';
                if (typeof c.source_id === 'number') {
                  chip.onclick = () => viewDoc(String(c.source_id));
                }
                srcDiv.appendChild(chip);
              });
              bubble.appendChild(srcDiv);
            }
          }
          ragHistory.push({ role: 'user', content: prompt });
          ragHistory.push({ role: 'assistant', content: streamedText });
          if (window.persistLocalSessions) persistLocalSessions();
          setRagSearching(false);
          if (typeof setSendState === 'function') setSendState(false);
          window.__klyxeAbortBackendStream = null;
        },
        onError: (err) => {
          finished = true;
          clearTimeout(timeoutId);
          clearInterval(statusTimer);
          if (bubble) {
            if (err?.name === 'AbortError') bubble.textContent = 'aborted';
            else bubble.textContent = `[Error] ${err.message}`;
          }
          setRagSearching(false);
          if (typeof setSendState === 'function') setSendState(false);
          window.__klyxeAbortBackendStream = null;
        },
      }
    );
    return;
  }

  const useSources = ragMode !== 'model';
  const contextChunks = (useSources ? retrieveTopChunks(prompt, activeDocs, MAX_CHUNKS) : []).map(c => ({
    docId: c.docId,
    docName: c.docName,
    chunkIdx: c.chunkIndex,
    text: c.text,
    tokenCount: c.tokenCount,
    score: c.score,
  }));

  const contextBlock = contextChunks.map((c, i) =>
    `[SOURCE ${i + 1} | ${c.docName} | chunk ${c.chunkIdx + 1}]\n${c.text}`
  ).join('\n\n---\n\n');
  const sysPrompt = ragMode === 'model'
    ? 'You are a precise helpful assistant.'
    : (ragMode === 'hybrid'
      ? `You are a document assistant. Use sources first and supplement with model knowledge when needed. Cite sources as [1], [2] when used.\n\nSOURCES:\n${contextBlock}`
      : `You are a precise document assistant. Answer ONLY based on the provided sources. When you reference information, insert citations like [1], [2]. If the answer is not in sources, say so clearly.\n\nSOURCES:\n${contextBlock}`);

  const loadingId = 'loading-' + Date.now();
  addRagMessage('assistant', '<span class="stream-cursor"></span>', loadingId);
  const msgEl = document.getElementById(loadingId);
  const bubble = msgEl ? msgEl.querySelector('.rag-bubble') : null;

  try {
    const payload = {
      model,
      messages: [
        { role: 'system', content: sysPrompt },
        ...ragHistory.slice(-6),
        { role: 'user', content: prompt },
      ],
      stream: true,
      temperature: 0.2,
    };
    if ((baseUrl || '').toLowerCase().includes('groq.com')) payload.max_completion_tokens = 1500;
    else payload.max_tokens = 1500;

    let res = null;
    for (let i = 0; i < apiKeys.length; i += 1) {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys[i]}`,
      };
      if (baseUrl.includes('openrouter')) {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'Klyxe RAG';
      }
      const candidate = await fetch(baseUrl + '/chat/completions', {
        method: 'POST', headers,
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
      const retryAfterSec = typeof parseRetryAfterSec === 'function' ? parseRetryAfterSec(res, raw, parsed) : 20;
      if (typeof renderHttpError === 'function') renderHttpError(bubble, res.status, details, retryAfterSec);
      else if (bubble) bubble.textContent = `request failed http ${res.status}`;
      if (res.status === 401) {
        const errBox = document.getElementById('input-error');
        const errText = document.getElementById('input-error-text');
        if (errBox) errBox.classList.remove('hidden');
        if (errText) errText.textContent = 'invalid api key for active provider';
      }
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
      if (!text.trim()) {
        bubble.textContent = '[Error] empty response from provider';
        return;
      }
      const outputTokens = estimateTokenCount(text);
      const inputTokens = estimateTokenCount(prompt) + estimateTokenCount(contextBlock);
      const estCost = ((inputTokens + outputTokens) / 1000000) * 0.7;
      updateRagStatus(inputTokens + outputTokens, estCost);

      const rendered = await renderMarkdown(text);
      const withCites = rendered.replace(/\[(\d+)\]/g, (_, n) => {
        const idx = parseInt(n, 10) - 1;
        const chunk = contextChunks[idx];
        if (!chunk) return `[${n}]`;
        return `<span class="rag-cite-num" title="${escHtml(chunk.docName)}" onclick="viewDoc('${chunk.docId}', ${chunk.chunkIdx})">${n}</span>`;
      });
      bubble.innerHTML = withCites;

      const usedDocIds = new Set();
      text.match(/\[(\d+)\]/g)?.forEach(m => {
        const idx = parseInt(m.slice(1, -1), 10) - 1;
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
        const activeKey = apiKeys[0] || '';
        const valHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`,
        };
        if (baseUrl.includes('openrouter')) {
          valHeaders['HTTP-Referer'] = window.location.origin;
          valHeaders['X-Title'] = 'Klyxe RAG';
        }
        validateResponse(text, contextBlock.slice(0, 2000), activeKey, model, valDiv, baseUrl, valHeaders);
      }

      ragHistory.push({ role: 'user', content: prompt });
      ragHistory.push({ role: 'assistant', content: text });
      if (window.persistLocalSessions) persistLocalSessions();
    }
    const msgsEl = document.getElementById('rag-messages');
    if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
  } catch (err) {
    if (bubble) bubble.textContent = '[Error] ' + err.message;
  } finally {
    setRagSearching(false);
    if (typeof setSendState === 'function') setSendState(false);
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
