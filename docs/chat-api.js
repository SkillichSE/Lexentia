const KLYXE_API_BASE = (window.KLYXE_API_BASE || localStorage.getItem('klyxe_api_base') || 'http://localhost:8000').replace(/\/$/, '');
let klyxeBackendAvailable = false;

async function apiGet(path) {
  const res = await fetch(`${KLYXE_API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${KLYXE_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPostForm(path, formData) {
  const res = await fetch(`${KLYXE_API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function detectBackend() {
  try {
    await apiGet('/health');
    klyxeBackendAvailable = true;
  } catch (_) {
    klyxeBackendAvailable = false;
  }
  return klyxeBackendAvailable;
}

async function ensureNotebookFromBackend(titleFallback) {
  const list = await apiGet('/notebooks');
  if (Array.isArray(list) && list.length) return list[0];
  return apiPost('/notebooks', { title: titleFallback || 'Untitled notebook' });
}

async function fetchSourcesFromBackend(notebookId) {
  return apiGet(`/sources/${notebookId}`);
}

async function createSourceOnBackend(payload) {
  return apiPost('/sources', payload);
}

async function uploadSourceFileToBackend(notebookId, file) {
  const fd = new FormData();
  fd.append('notebook_id', String(notebookId));
  fd.append('file', file);
  return apiPostForm('/sources/upload', fd);
}

async function fetchUrlSourceOnBackend(notebookId, url, name) {
  return apiPost('/sources/fetch-url', {
    notebook_id: notebookId,
    type: 'url',
    name,
    url,
  });
}

async function fetchSourceContentFromBackend(sourceId) {
  return apiGet(`/sources/item/${sourceId}/content`);
}

async function fetchChatSessionsFromBackend(notebookId) {
  return apiGet(`/chat/sessions/${notebookId}`);
}

async function fetchMessagesFromBackend(sessionId) {
  return apiGet(`/chat/messages/${sessionId}`);
}

function streamChatFromBackend(payload, handlers) {
  const url = `${KLYXE_API_BASE}/chat/stream`;
  const controller = new AbortController();
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal: controller.signal,
    body: JSON.stringify(payload),
  }).then(async (res) => {
    if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      let eventName = 'message';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('event:')) eventName = trimmed.slice(6).trim();
        if (trimmed.startsWith('data:')) {
          const raw = trimmed.slice(5).trim();
          try {
            const data = JSON.parse(raw);
            if (eventName === 'token' && handlers?.onToken) handlers.onToken(data);
            if (eventName === 'done' && handlers?.onDone) handlers.onDone(data);
          } catch {}
        }
      }
    }
  }).catch((err) => {
    if (handlers?.onError) handlers.onError(err);
  });
  return () => controller.abort();
}
