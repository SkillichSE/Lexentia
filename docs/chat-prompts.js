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
  setTimeout(() => { btn.textContent = prev; }, 1500);
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
