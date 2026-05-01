// ══════════════════════════════════════════════════════════════════════════════
// lab-index.js  —  страница Lab (список карточек)
//
// ИСПРАВЛЕНИЯ:
//   • Файл полностью самодостаточен (тема + sidebar + карточки).
//   • Удалена зависимость от lab.js: тот файл вызывал loadArticles() → fetch('articles.html')
//     → парсил <template> теги, которых там нет → падал с ошибками.
//   • Все init*() (initMnist, initVae, initHumanEval) перенесены в lab-article.js,
//     где живут нужные DOM-элементы (#draw-canvas, #vae-latent и т.д.).
// ══════════════════════════════════════════════════════════════════════════════

// ── Тема ─────────────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const themeLabel  = document.getElementById('theme-label');

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  const l = t === 'light';
  themeToggle.checked = l;
  themeLabel.textContent = l ? 'Light' : 'Dark';
}
applyTheme(localStorage.getItem('theme') || 'dark');
themeToggle.addEventListener('change', () =>
  applyTheme(themeToggle.checked ? 'light' : 'dark'));

// ── Scroll-shadow на хедере ───────────────────────────────────────────────────
window.addEventListener('scroll', () =>
  document.getElementById('app-bar').classList.toggle('scrolled', window.scrollY > 0));

// ── Sidebar (мобильный тоггл) ─────────────────────────────────────────────────
(function () {
  const sidebar   = document.getElementById('left-sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  const mobileBtn = document.getElementById('sidebar-mobile-toggle');
  const open  = () => { sidebar?.classList.add('open');    overlay?.classList.add('open'); };
  const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); };
  mobileBtn?.addEventListener('click', open);
  overlay?.addEventListener('click', close);
  function check() {
    const isMobile = window.innerWidth <= 768;
    if (mobileBtn) mobileBtn.style.display = isMobile ? 'flex' : 'none';
    if (!isMobile) close();
  }
  check();
  window.addEventListener('resize', check);
})();

// ── Метаданные статей ─────────────────────────────────────────────────────────
// Единственный источник правды для списка Lab-статей.
// Полный контент (HTML + init) хранится в lab-article.js → объект ARTICLES.
const ARTICLES = [
  {
    id: 1,
    tag: 'On-device · No API required',
    title: 'Digit Recognizer — Model Parameter Visualization',
    desc: 'Draw a digit 0–9 and watch a browser-side model show per-class confidence and feature activations in real time.',
  },
  {
    id: 2,
    tag: 'On-device · VAE · Generative',
    title: 'Client-side VAE Latent Space Decoder',
    desc: 'Click or drag a point on the 2-D latent map — the VAE decoder instantly generates digit images. Fine-tune with z₁ / z₂ sliders.',
  },
  {
    id: 3,
    tag: 'API · Three.js · Embeddings · 3D',
    title: 'Semantically Similar Words in 3-D',
    desc: 'Enter a word — the system finds semantically close terms and plots them in 3-D space. Drag to rotate. Extended search requires an API key.',
  },
  {
    id: 4,
    tag: 'API · Temperature · Anthropic',
    title: 'Temperature Parameter — Live Visualization',
    desc: 'One prompt, three responses at different temperatures. See how the temperature setting affects randomness, creativity, and predictability.',
  },
  {
    id: 5,
    tag: 'API · Tokens · Analytics · Charts',
    title: 'Real-time API Token Usage Tracker',
    desc: 'Send requests and monitor input/output token consumption. Cumulative bar chart and per-request history table.',
  },
  {
    id: 6,
    tag: 'API · HumanEval · Multi-model · Benchmark',
    title: 'HumanEval Benchmark — Multi-model Comparison',
    desc: 'Pick a HumanEval task and models — all receive the same prompt in parallel. Compare generated code and test results side by side.',
  },
];

// ── Рендер карточек ───────────────────────────────────────────────────────────
// ТЗ-улучшения:
//   • Hover-эффект через класс lab-card-hover (карточка "оживает" при наведении).
//   • Теги оформлены как pill-бабблы через класс lab-article-tag.
//   • Номер статьи (01–06) вынесен влево как визуальный якорь.
//   • Стрелка → подчёркивает, что вся карточка кликабельна (не только текст).
function renderCards() {
  const grid = document.getElementById('lab-cards');
  if (!grid) return;

  grid.innerHTML = ARTICLES.map(a => `
    <a href="articles.html?article=${a.id}" class="lab-card-link" style="text-decoration:none;">
      <div class="lab-article lab-card-hover">
        <div class="lab-article-header">
          <div class="lab-article-num">${String(a.id).padStart(2, '0')}</div>
          <div class="lab-article-meta">
            <div class="lab-article-tag">${a.tag}</div>
            <div class="lab-article-title">${a.title}</div>
            <div class="lab-article-desc">${a.desc}</div>
          </div>
          <div style="flex-shrink:0;display:flex;align-items:center;padding-left:8px;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="color:var(--text-tertiary);">
              <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </a>
  `).join('');

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

renderCards();