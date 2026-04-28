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

  const studioQuery = [promptText, focus].filter(Boolean).join(' ');
  const contextParts = retrieveTopChunks(studioQuery, activeDocs, MAX_CHUNKS)
    .map((c, i) => `[SOURCE ${i + 1} | ${c.docName} | chunk ${c.chunkIndex + 1}]\n${c.text}`)
    .join('\n\n---\n\n');

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
