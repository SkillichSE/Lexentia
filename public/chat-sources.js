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

const TEXT_LIKE_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv',
  'py', 'ts', 'tsx', 'js', 'jsx',
  'json', 'yaml', 'yml', 'xml', 'html', 'css',
  'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp',
  'sh', 'sql', 'log', 'ini', 'toml', 'env',
]);

async function extractDocxText(arrayBuffer) {
  if (typeof mammoth === 'undefined') throw new Error('docx parser is not loaded');
  const out = await mammoth.extractRawText({ arrayBuffer });
  return String(out?.value || '').trim();
}

async function handleFileUpload(files) {
  Array.from(files).forEach(async file => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isTextLike = TEXT_LIKE_EXTENSIONS.has(ext) || (file.type || '').startsWith('text/');
    const allowed = ext === 'pdf' || ext === 'docx' || isTextLike;
    if (!allowed) {
      addRagMessage('system', `⚠ unsupported file type: ${ext || 'unknown'}`);
      return;
    }
    const runtime = window.KlyxeChatRuntime || {};
    if (runtime.backendReady && runtime.notebookId && window.uploadSourceFileToBackend) {
      try {
        const created = await uploadSourceFileToBackend(runtime.notebookId, file);
        uploadedDocs.unshift({
          id: created.id,
          name: created.name || file.name,
          size: formatBytes(file.size),
          type: created.type || file.name.split('.').pop().toLowerCase(),
          status: created.status || 'indexing',
          content: null,
          chunks: Array.from({ length: created.chunk_count || 0 }, (_, i) => ({
            id: `${created.id}_${i}`,
            chunkIndex: i,
            text: '',
            tokenCount: 0,
          })),
          active: true,
        });
        renderDocList();
        updateDocBadge();
        updateContextBudget();
        persistLocalSources();
        return;
      } catch (e) {
        addRagMessage('system', '⚠ Backend upload failed, fallback to local indexing: ' + e.message);
      }
    }
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
      else if (doc.type === 'docx') text = await extractDocxText(ab);
      else if (doc.type === 'csv') {
        text = await file.text();
      } else {
        text = await file.text();
      }
      if (!text.trim()) throw new Error('empty text extracted');
      doc.content = text;
      doc.chunks = buildSmartChunks(text, doc.id, CHUNK_TOKEN_TARGET, CHUNK_TOKEN_OVERLAP);
      doc.status = 'ready';
    } catch (e) {
      doc.status = 'error';
      doc.error = e.message;
    }
    renderDocList();
    updateContextBudget();
    persistLocalSources();
  });
}

async function fetchUrlSource() {
  const input = document.getElementById('url-fetch-input');
  const btn = document.getElementById('url-fetch-btn');
  const rawUrl = (input.value || '').trim();
  if (!rawUrl) return;
  const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let url = '';
  try {
    url = new URL(normalized).toString();
  } catch (_) {
    addRagMessage('system', '⚠ invalid url format');
    return;
  }
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const runtime = window.KlyxeChatRuntime || {};
    if (runtime.backendReady && runtime.notebookId && window.fetchUrlSourceOnBackend) {
      const created = await fetchUrlSourceOnBackend(
        runtime.notebookId,
        url,
        url.replace(/^https?:\/\//, '').slice(0, 80),
      );
      uploadedDocs.unshift({
        id: created.id,
        name: created.name,
        size: 'remote',
        type: created.type || 'url',
        status: created.status || 'indexing',
        content: null,
        chunks: Array.from({ length: created.chunk_count || 0 }, (_, i) => ({
          id: `${created.id}_${i}`,
          chunkIndex: i,
          text: '',
          tokenCount: 0,
        })),
        active: true,
      });
      input.value = '';
      renderDocList();
      updateDocBadge();
      updateContextBudget();
      persistLocalSources();
      return;
    }
    const fetchWithTimeout = async (target, asJson = true, timeoutMs = 15000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(target, { signal: controller.signal });
        if (!res.ok) throw new Error(`http ${res.status}`);
        return asJson ? res.json() : res.text();
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let html = '';
    let lastErr = null;
    const strategies = [
      async () => {
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const data = await fetchWithTimeout(proxy, true, 15000);
        return String(data?.contents || '');
      },
      async () => {
        const alt = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, '')}`;
        return await fetchWithTimeout(alt, false, 18000);
      },
    ];
    for (const run of strategies) {
      try {
        html = await run();
        if (html && html.trim()) break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!html || !html.trim()) {
      throw new Error(lastErr?.message || 'url fetch failed');
    }

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('script,style,nav,footer,header').forEach(el => el.remove());
    const text = (tmp.textContent || '').replace(/\s{3,}/g, '\n\n').trim();
    if (!text) throw new Error('No text extracted');
    const sourceId = 'doc_url_' + Date.now();
    const doc = {
      id: sourceId,
      name: url.replace(/^https?:\/\//, '').slice(0, 50),
      size: formatBytes(text.length),
      type: 'url',
      status: 'ready',
      content: text,
      chunks: buildSmartChunks(text, sourceId, CHUNK_TOKEN_TARGET, CHUNK_TOKEN_OVERLAP),
      active: true,
    };
    uploadedDocs.push(doc);
    input.value = '';
    renderDocList();
    updateDocBadge();
    updateContextBudget();
    persistLocalSources();
  } catch (e) {
    addRagMessage('system', '⚠ URL fetch failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Fetch';
  }
}

function hydrateSourcesFromBackend(rows) {
  if (!Array.isArray(rows)) return;
  const existingById = new Map(uploadedDocs.map(d => [String(d.id), d]));
  uploadedDocs.length = 0;
  rows.forEach((row) => {
    const prev = existingById.get(String(row.id));
    uploadedDocs.push({
      id: row.id,
      name: row.name,
      size: prev?.size || 'remote',
      type: row.type || prev?.type || 'text',
      status: row.status || prev?.status || 'indexing',
      content: prev?.content || null,
      chunks: prev?.chunks || Array.from({ length: row.chunk_count || 0 }, (_, i) => ({
        id: `${row.id}_${i}`,
        chunkIndex: i,
        text: '',
        tokenCount: 0,
      })),
      active: prev?.active ?? true,
    });
  });
  renderDocList();
  updateDocBadge();
  updateContextBudget();
  persistLocalSources();
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
  if (doc) {
    doc.active = active;
    updateContextBudget();
    persistLocalSources();
  }
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
  persistLocalSources();
}

async function viewDoc(id, highlightChunkIdx) {
  const doc = uploadedDocs.find(d => d.id === id);
  if (!doc) return;
  const runtime = window.KlyxeChatRuntime || {};
  if (!doc.content && runtime.backendReady && window.fetchSourceContentFromBackend) {
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      try {
        const data = await fetchSourceContentFromBackend(numericId);
        doc.content = data?.content || '';
        if (doc.content && (!doc.chunks || !doc.chunks.length)) {
          doc.chunks = buildSmartChunks(doc.content, String(doc.id), CHUNK_TOKEN_TARGET, CHUNK_TOKEN_OVERLAP);
        }
      } catch (_) {}
    }
  }
  if (!doc.content) return;
  openPreviewPanel();
  document.getElementById('rp-viewer-empty').classList.add('hidden');
  document.getElementById('rp-viewer-content').classList.remove('hidden');
  document.getElementById('viewer-doc-name').textContent = doc.name;

  const MAX_PREVIEW = 8000;
  let previewText = doc.content.slice(0, MAX_PREVIEW);
  if (doc.content.length > MAX_PREVIEW) previewText += '\n\n[… truncated for preview]';

  if (highlightChunkIdx !== undefined && doc.chunks[highlightChunkIdx]) {
    const rawChunk = doc.chunks[highlightChunkIdx];
    const chunkTxt = typeof rawChunk === 'string' ? rawChunk : (rawChunk?.text || '');
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
  const estTokens = usedChunks * CHUNK_TOKEN_TARGET;
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

let backendSourcesPollHandle = null;
function stopBackendSourcesPolling() {
  if (!backendSourcesPollHandle) return;
  clearInterval(backendSourcesPollHandle);
  backendSourcesPollHandle = null;
}
function startBackendSourcesPolling() {
  const runtime = window.KlyxeChatRuntime || {};
  if (!runtime.backendReady || !runtime.notebookId || !window.fetchSourcesFromBackend) return;
  stopBackendSourcesPolling();
  backendSourcesPollHandle = setInterval(async () => {
    try {
      const rows = await fetchSourcesFromBackend(runtime.notebookId);
      hydrateSourcesFromBackend(rows || []);
    } catch (_) {}
  }, 5000);
}

function serializeSourceForLocal(source) {
  return {
    id: String(source.id),
    name: source.name,
    size: source.size,
    type: source.type,
    status: source.status,
    content: source.content || null,
    chunks: (source.chunks || []).map((chunk) => ({
      id: chunk.id,
      chunkIndex: chunk.chunkIndex || 0,
      text: chunk.text || '',
      tokenCount: chunk.tokenCount || 0,
    })),
    active: source.active !== false,
  };
}

async function persistLocalSources() {
  const runtime = window.KlyxeChatRuntime || {};
  if (runtime.backendReady || !window.KlyxeLocalStore) return;
  try {
    const payload = uploadedDocs.map(serializeSourceForLocal);
    await window.KlyxeLocalStore.saveSources(payload);
  } catch (_) {}
}

async function loadLocalSources() {
  const runtime = window.KlyxeChatRuntime || {};
  if (runtime.backendReady || !window.KlyxeLocalStore) return;
  try {
    const rows = await window.KlyxeLocalStore.loadSources();
    if (!Array.isArray(rows) || !rows.length) return;
    uploadedDocs.length = 0;
    rows.forEach((row) => uploadedDocs.push({
      id: row.id,
      name: row.name,
      size: row.size || 'local',
      type: row.type || 'text',
      status: row.status || 'ready',
      content: row.content || null,
      chunks: row.chunks || [],
      active: row.active !== false,
    }));
    renderDocList();
    updateDocBadge();
    updateContextBudget();
  } catch (_) {}
}
