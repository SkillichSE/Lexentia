let chatSessions = [];

let chatSessionsBootstrapped = false;
function bootstrapChatSessions() {
  if (chatSessionsBootstrapped) return;
  chatSessionsBootstrapped = true;
  try { chatSessions = JSON.parse(localStorage.getItem('klyxe_chat_sessions') || '[]'); } catch { chatSessions = []; }
  renderChatHistory();
}

async function loadChatSessionsFromBackend() {
  const runtime = window.KlyxeChatRuntime || {};
  if (!runtime.backendReady || !runtime.notebookId || !window.fetchChatSessionsFromBackend) return;
  try {
    const rows = await fetchChatSessionsFromBackend(runtime.notebookId);
    chatSessions = (rows || []).map((s) => ({
      id: s.id,
      name: s.title || `session ${s.id}`,
      ts: s.created_at || new Date().toISOString(),
      backend: true,
    }));
    renderChatHistory();
  } catch (_) {}
}

function saveChatSession() {
  if (!ragHistory.length && !sessionLog.length) return;
  const runtime = window.KlyxeChatRuntime || {};
  const currentId = String(runtime.sessionId || ('sess_' + Date.now()));
  const firstMsg = ragHistory[0]?.content || sessionLog[0]?.prompt || 'Untitled';
  const transcript = [];
  for (let i = 0; i < ragHistory.length; i += 1) {
    transcript.push({
      role: ragHistory[i].role,
      content: ragHistory[i].content,
    });
  }
  const session = {
    id: currentId,
    name: firstMsg.slice(0, 40) + (firstMsg.length > 40 ? '…' : ''),
    ts: new Date().toISOString(),
    log: sessionLog.slice(),
    transcript,
  };
  const existingIdx = chatSessions.findIndex((s) => String(s.id) === currentId);
  if (existingIdx >= 0) chatSessions.splice(existingIdx, 1);
  chatSessions.unshift(session);
  if (chatSessions.length > 20) chatSessions = chatSessions.slice(0, 20);
  localStorage.setItem('klyxe_chat_sessions', JSON.stringify(chatSessions));
  if (window.persistLocalSessions) window.persistLocalSessions();
  renderChatHistory();
}

function renderChatHistory() {
  const el = document.getElementById('chat-hist-items');
  if (!el) return;
  if (!chatSessions.length) {
    el.innerHTML = '<div style="padding:6px 10px;font-size:11px;color:var(--text-secondary);">No saved sessions yet</div>';
    return;
  }
  el.innerHTML = chatSessions.map(s => `
    <div class="chat-hist-item" title="${escHtml(s.name)}" onclick="openChatSession('${s.id}')">
      <span class="chat-hist-icon">💬</span>
      <div class="chat-hist-info">
        <div class="chat-hist-name">${escHtml(s.name)}</div>
        <div class="chat-hist-date">${formatRelativeDate(s.ts)}</div>
      </div>
    </div>
  `).join('');
}

async function openChatSession(sessionId) {
  const runtime = window.KlyxeChatRuntime || {};
  if (!runtime.backendReady || !window.fetchMessagesFromBackend) {
    const localSession = chatSessions.find((s) => String(s.id) === String(sessionId));
    if (!localSession) return;
    const container = document.getElementById('rag-messages');
    const empty = document.getElementById('rag-empty-state');
    if (empty) empty.style.display = 'none';
    if (!container) return;
    container.style.display = 'flex';
    container.innerHTML = '';
    ragHistory.length = 0;
    runtime.sessionId = sessionId;
    (localSession.transcript || []).forEach((m) => {
      addRagMessage(m.role, m.content);
      ragHistory.push({ role: m.role, content: m.content });
    });
    return;
  }
  try {
    const sid = Number(sessionId);
    if (!Number.isFinite(sid)) return;
    const messages = await fetchMessagesFromBackend(sid);
    const container = document.getElementById('rag-messages');
    const empty = document.getElementById('rag-empty-state');
    if (empty) empty.style.display = 'none';
    if (!container) return;
    container.style.display = 'flex';
    container.innerHTML = '';
    ragHistory.length = 0;
    runtime.sessionId = sid;
    (messages || []).forEach((m) => {
      addRagMessage(m.role, m.content);
      ragHistory.push({ role: m.role, content: m.content });
    });
  } catch (_) {}
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
  if (window.stopBackendSourcesPolling) window.stopBackendSourcesPolling();
  ragHistory.length = 0;
  sessionLog.length = 0;
  const runtime = window.KlyxeChatRuntime || {};
  runtime.sessionId = 'sess_' + Date.now();

  const draftId = String(runtime.sessionId);
  const existingDraftIdx = chatSessions.findIndex((s) => String(s.id) === draftId);
  if (existingDraftIdx >= 0) chatSessions.splice(existingDraftIdx, 1);
  chatSessions.unshift({
    id: draftId,
    name: 'new chat',
    ts: new Date().toISOString(),
    log: [],
    transcript: [],
    draft: true,
  });
  if (chatSessions.length > 20) chatSessions = chatSessions.slice(0, 20);
  localStorage.setItem('klyxe_chat_sessions', JSON.stringify(chatSessions));
  if (window.persistLocalSessions) window.persistLocalSessions();

  if (Array.isArray(uploadedDocs) && uploadedDocs.length) {
    uploadedDocs.forEach((doc) => { doc.active = false; });
    if (window.renderDocList) renderDocList();
    if (window.updateDocBadge) updateDocBadge();
    if (window.updateContextBudget) updateContextBudget();
    if (window.persistLocalSources) persistLocalSources();
  }

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
  if (runtime.backendReady && window.startBackendSourcesPolling) window.startBackendSourcesPolling();
  renderChatHistory();
}

window.addEventListener('beforeunload', () => {
  if (ragHistory.length || sessionLog.length) saveChatSession();
});

async function persistLocalSessions() {
  const runtime = window.KlyxeChatRuntime || {};
  if (runtime.backendReady || !window.KlyxeLocalStore) return;
  try {
    await window.KlyxeLocalStore.saveSessions(chatSessions);
    await window.KlyxeLocalStore.saveState('session_id', runtime.sessionId || null);
  } catch (_) {}
}

async function loadLocalChatSessions() {
  const runtime = window.KlyxeChatRuntime || {};
  if (runtime.backendReady || !window.KlyxeLocalStore) return;
  try {
    const rows = await window.KlyxeLocalStore.loadSessions();
    if (Array.isArray(rows) && rows.length) {
      chatSessions = rows.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      renderChatHistory();
    }
    const savedSessionId = await window.KlyxeLocalStore.loadState('session_id');
    if (savedSessionId) runtime.sessionId = savedSessionId;
  } catch (_) {}
}

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

(function loadNotebookTitle() {
  const saved = localStorage.getItem('klyxe_notebook_title');
  const el = document.getElementById('notebook-title');
  if (saved && el) el.textContent = saved;
})();
