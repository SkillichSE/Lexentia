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
  const overlay = document.getElementById('sidebar-overlay');
  const mobileBtn = document.getElementById('sidebar-mobile-toggle');
  const getSidebar = () => document.getElementById('left-sidebar');

  function openSidebar() {
    const sidebar = getSidebar();
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }
  function closeSidebar() {
    const sidebar = getSidebar();
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
  if (window.customElements?.whenDefined) {
    customElements.whenDefined('lex-sidebar').then(checkWidth).catch(() => {});
  }
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



if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}


const uploadedDocs = [];
window.KlyxeChatRuntime = window.KlyxeChatRuntime || {
  backendReady: false,
  notebookId: null,
  sessionId: 1,
};
const CHUNK_TOKEN_TARGET = 500;
const CHUNK_TOKEN_OVERLAP = 100;
const MAX_CHUNKS = 12;
const KlyxeRagEngine = window.KlyxeRagEngine || {};
const estimateTokenCount = KlyxeRagEngine.estimateTokenCount || (text =>
  Math.max(1, Math.round(String(text || '').split(/\s+/).filter(Boolean).length * 1.3))
);
const buildSmartChunks = KlyxeRagEngine.buildSmartChunks || ((text, sourceId) => [{
  id: `${sourceId}_chunk_0`,
  chunkIndex: 0,
  text: String(text || ''),
  tokenCount: estimateTokenCount(text),
}]);
const retrieveTopChunks = KlyxeRagEngine.retrieveTopChunks || ((query, docs, topK = MAX_CHUNKS) =>
  docs.flatMap(doc => (doc.chunks || []).map(ch => ({
    ...ch,
    docId: doc.id,
    docName: doc.name,
    text: typeof ch === 'string' ? ch : ch.text,
    chunkIndex: typeof ch === 'string' ? 0 : ch.chunkIndex,
    tokenCount: typeof ch === 'string' ? estimateTokenCount(ch) : ch.tokenCount,
    score: 0,
  }))).slice(0, topK)
);

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


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

async function init() {
  if (window.bootstrapChatSessions) window.bootstrapChatSessions();
  loadKey();
  loadSettings();
  populateAllSelects();
  fetchFreeModels();
  renderProvidersList();
  if (window.refreshModelsForActiveProvider) refreshModelsForActiveProvider();
  updateRagStatus();
  activeProviderId = localStorage.getItem(DB_KEY_ACTIVE_PROV);
  const runtime = window.KlyxeChatRuntime;
  try {
    const backendUp = window.detectBackend ? await detectBackend() : false;
    runtime.backendReady = !!backendUp;
    if (backendUp && window.ensureNotebookFromBackend) {
      const currentTitle = document.getElementById('notebook-title')?.textContent?.trim() || 'Untitled notebook';
      const notebook = await ensureNotebookFromBackend(currentTitle);
      runtime.notebookId = notebook?.id || null;
      if (notebook?.title && document.getElementById('notebook-title')) {
        document.getElementById('notebook-title').textContent = notebook.title;
      }
      if (runtime.notebookId && window.fetchSourcesFromBackend && window.hydrateSourcesFromBackend) {
        const rows = await fetchSourcesFromBackend(runtime.notebookId);
        hydrateSourcesFromBackend(rows || []);
        if (window.startBackendSourcesPolling) startBackendSourcesPolling();
      }
      if (window.loadChatSessionsFromBackend) await loadChatSessionsFromBackend();
    }
  } catch (_) {
    runtime.backendReady = false;
  }
  if (!runtime.backendReady) {
    if (window.loadLocalSources) await loadLocalSources();
    if (window.loadLocalChatSessions) await loadLocalChatSessions();
  }
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
