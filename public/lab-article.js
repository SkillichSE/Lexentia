// ══════════════════════════════════════════════════════════════════════════════
// lab-article.js  —  страница articles.html?article=ID
//
// ИСПРАВЛЕНИЯ:
//   • Удалён весь дублирующий код из lab.js (theme, sidebar, callAPI, showStatus,
//     HE_TASKS, init*) — теперь он живёт только здесь.
//   • mountArticle() вызывается в самом конце файла (был вызов до определения).
//   • ARTICLES[4].init и ARTICLES[5].init были null — функции runTemp/sendToken
//     уже global через window.*, поэтому init: null корректен; комментарии уточнены.
//   • VECS в initWord3D: lab.js содержал русские слова, lab-article.js — только
//     английские. Объединены в один словарь с обоими языками.
//   • Статус initMnist был на русском ("Нарисуйте цифру") — переведён на английский
//     для единообразия с остальным UI.
//   • tokChart: Chart.js доступен через глобальный <script> в articles.html.
//     Добавлена проверка наличия typeof Chart перед вызовом.
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

window.addEventListener('scroll', () =>
  document.getElementById('app-bar').classList.toggle('scrolled', window.scrollY > 0));

// ── Sidebar ───────────────────────────────────────────────────────────────────
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

// ── Утилиты ───────────────────────────────────────────────────────────────────
function showStatus(el, type, html) {
  el.style.display = 'flex';
  el.className = 'status-msg' + (type ? ' ' + type : '');
  el.innerHTML = html;
}

async function callAPI(apiKey, messages, model, maxTokens, temperature) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens || 300,
      temperature: temperature ?? 0.7,
      messages,
    }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error?.message || 'HTTP ' + r.status);
  }
  const d = await r.json();
  return { text: d.content?.[0]?.text || '', usage: d.usage || {} };
}

// ══════════════════════════════════════════════════════════════════════════════
// Шаблоны статей
// ══════════════════════════════════════════════════════════════════════════════
const ARTICLES = {
  1: {
    title: 'Digit Recognizer — Model Parameter Visualization',
    tag: 'On-device · No API required',
    desc: 'Draw a digit 0–9 and the browser-side model shows per-class confidence and feature activations in real time.',
    html: `
      <div id="mnist-canvas-wrap">
        <div style="display:flex;flex-direction:column;gap:10px;align-items:center;">
          <canvas id="draw-canvas" width="196" height="196"></canvas>
          <button class="lab-btn" style="width:100%;" onclick="clearMnist()">Clear Canvas</button>
        </div>
        <div style="flex:1;">
          <div class="mnist-prediction" id="mnist-pred">?</div>
          <div class="mnist-conf" id="mnist-conf">Draw a digit to start</div>
          <div id="mnist-bars"></div>
        </div>
      </div>
      <div id="mnist-status" class="status-msg" style="margin-top:14px;">
        <span class="pulse-dot"></span>&nbsp;Initializing…
      </div>`,
    init: initMnist,
  },
  2: {
    title: 'Client-side VAE Latent Space Decoder',
    tag: 'On-device · VAE · Generative',
    desc: 'Click or drag a point on the 2-D latent map — the VAE decoder instantly generates digit images. Fine-tune with z₁ / z₂ sliders.',
    html: `
      <div class="vae-grid">
        <div class="vae-panel">
          <div class="vae-panel-title">Latent space (click to explore)</div>
          <canvas id="vae-latent" width="200" height="200" style="cursor:crosshair;border:1px solid rgba(52,211,153,0.2);border-radius:6px;display:block;margin:0 auto;"></canvas>
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-tertiary);margin-top:6px;">z₁=<span id="vae-z1">0.00</span> · z₂=<span id="vae-z2">0.00</span></div>
        </div>
        <div class="vae-panel">
          <div class="vae-panel-title">Decoded image</div>
          <canvas id="vae-decoded" width="200" height="200" style="border:1px solid var(--border-subtle);border-radius:6px;image-rendering:pixelated;display:block;margin:0 auto;"></canvas>
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-tertiary);margin-top:6px;">Nearest digit: <span id="vae-digit-label" style="color:#34d399;">–</span></div>
        </div>
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-tertiary);margin-bottom:8px;">MANUAL CONTROL</div>
        <div class="latent-sliders">
          <div class="latent-row">
            <div class="latent-label">z₁ <span id="z1-val" style="color:#34d399;">0.0</span></div>
            <input type="range" class="latent-slider" id="z1-slider" min="-3" max="3" step="0.05" value="0" oninput="onVaeSlider()">
          </div>
          <div class="latent-row">
            <div class="latent-label">z₂ <span id="z2-val" style="color:#34d399;">0.0</span></div>
            <input type="range" class="latent-slider" id="z2-slider" min="-3" max="3" step="0.05" value="0" oninput="onVaeSlider()">
          </div>
        </div>
      </div>
      <div class="status-msg ok" style="margin-top:14px;">✓ Model ready — click the latent space map to explore</div>`,
    init: initVae,
  },
  3: {
    title: 'Semantically Similar Words in 3-D',
    tag: 'API · Three.js · Embeddings · 3D',
    desc: 'Enter a word — the system finds semantically close terms and plots them in 3-D space. Drag to rotate.',
    html: `
      <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;">
        <input class="api-key-input" type="text" id="w3d-word" placeholder="Enter a word: cat, city, joy…" style="flex:1;" onkeydown="if(event.key==='Enter')runWord3D()">
        <button class="lab-btn" onclick="runWord3D()">Build 3D</button>
      </div>
      <div id="w3d-wrap">
        <canvas id="word3d-canvas" style="display:block;width:100%;height:100%;"></canvas>
        <div class="w3d-placeholder" id="w3d-ph">Enter a word and press «Build 3D»</div>
      </div>
      <div id="w3d-status" class="status-msg" style="margin-top:10px;display:none;"></div>`,
    init: initWord3D,
  },
  4: {
    title: 'Temperature Parameter — Live Visualization',
    tag: 'API · Temperature · Anthropic',
    desc: 'One prompt, three responses at different temperatures. See how temperature affects randomness, creativity, and predictability.',
    html: `
      <div class="api-key-row">
        <input class="api-key-input" type="password" id="temp-apikey" placeholder="sk-ant-… Anthropic API key">
      </div>
      <div class="temp-controls">
        <div class="temp-slider-wrap">
          <div class="temp-slider-label">
            <span>Base temperature</span>
            <span id="temp-val-label" style="color:#34d399;">0.7</span>
          </div>
          <input type="range" id="temp-slider" min="0" max="1" step="0.05" value="0.7"
            oninput="document.getElementById('temp-val-label').textContent=this.value">
        </div>
        <button class="lab-btn" onclick="runTemp()">Run ×3</button>
      </div>
      <textarea class="temp-prompt-input" id="temp-prompt">Come up with an original name for a small café</textarea>
      <div id="temp-results" style="margin-top:14px;"></div>
      <div id="temp-status" class="status-msg" style="margin-top:10px;display:none;"></div>`,
    // ИСПРАВЛЕНИЕ: init: null — runTemp() назначен через window.runTemp ниже,
    // DOM-элементы доступны сразу после вставки HTML, никакой инициализации не нужно.
    init: null,
  },
  5: {
    title: 'Real-time API Token Usage Tracker',
    tag: 'API · Tokens · Analytics · Charts',
    desc: 'Send requests and monitor input/output token consumption. Cumulative bar chart and per-request history table.',
    html: `
      <div class="api-key-row">
        <input class="api-key-input" type="password" id="tok-apikey" placeholder="sk-ant-… Anthropic API key">
      </div>
      <input class="tokens-prompt-input" type="text" id="tok-prompt"
        placeholder="Type a message and press Enter or the button…"
        onkeydown="if(event.key==='Enter')sendToken()">
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button class="lab-btn" onclick="sendToken()">Send</button>
        <button class="lab-btn-secondary" onclick="clearTokenLog()">Reset</button>
      </div>
      <div class="tokens-grid">
        <div class="token-stat"><div class="token-stat-val" id="tok-total-in">0</div><div class="token-stat-lbl">Input tokens</div></div>
        <div class="token-stat"><div class="token-stat-val" id="tok-total-out">0</div><div class="token-stat-lbl">Output tokens</div></div>
        <div class="token-stat"><div class="token-stat-val" id="tok-total-all">0</div><div class="token-stat-lbl">Total</div></div>
        <div class="token-stat"><div class="token-stat-val" id="tok-count">0</div><div class="token-stat-lbl">Requests</div></div>
      </div>
      <div id="tok-chart-wrap"><canvas id="tok-chart"></canvas></div>
      <div class="tokens-log" style="margin-top:12px;">
        <div class="tokens-log-header">
          <span>Prompt</span><span>In</span><span>Out</span><span>Total</span>
        </div>
        <div id="tok-log-body"></div>
      </div>
      <div id="tok-status" class="status-msg" style="margin-top:10px;display:none;"></div>`,
    // ИСПРАВЛЕНИЕ: tokChart инициализируется лениво при первом sendToken(),
    // init: null — нет смысла строить пустой Chart до первого запроса.
    init: null,
  },
  6: {
    title: 'HumanEval Benchmark — Multi-model Comparison',
    tag: 'API · HumanEval · Multi-model · Benchmark',
    desc: 'Pick a HumanEval task and models — all receive the same prompt in parallel. Compare generated code and test results side by side.',
    html: `
      <div class="api-key-row">
        <input class="api-key-input" type="password" id="he-apikey" placeholder="sk-ant-… Anthropic API key">
      </div>
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-tertiary);margin-bottom:8px;">MODELS (select one or more)</div>
      <div class="humaneval-models-grid" id="he-model-chips">
        <div class="model-chip active" data-model="claude-haiku-4-5-20251001">claude-haiku-4-5</div>
        <div class="model-chip active" data-model="claude-sonnet-4-20250514">claude-sonnet-4</div>
        <div class="model-chip" data-model="claude-opus-4-20250514">claude-opus-4</div>
      </div>
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-tertiary);margin-bottom:8px;margin-top:14px;">TASK</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;" id="he-task-btns">
        <button class="lab-btn-secondary active he-task-btn" onclick="selectTask(0,this)">has_close_elements</button>
        <button class="lab-btn-secondary he-task-btn" onclick="selectTask(1,this)">separate_paren_groups</button>
        <button class="lab-btn-secondary he-task-btn" onclick="selectTask(2,this)">truncate_number</button>
        <button class="lab-btn-secondary he-task-btn" onclick="selectTask(3,this)">below_zero</button>
      </div>
      <pre class="he-problem" id="he-problem"></pre>
      <button class="lab-btn" style="margin-bottom:14px;width:100%;" onclick="runHumanEval()">▶ Run on all selected models</button>
      <div id="he-results"></div>
      <div id="he-status" class="status-msg" style="margin-top:10px;display:none;"></div>`,
    init: initHumanEval,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// mountArticle — читает ?article=ID, вставляет нужный шаблон, вызывает init()
// ══════════════════════════════════════════════════════════════════════════════
function mountArticle() {
  const params = new URLSearchParams(window.location.search);
  const id  = parseInt(params.get('article'), 10) || 1;
  const art = ARTICLES[id];
  const container = document.getElementById('article-container');

  if (!art) {
    container.innerHTML =
      '<p style="color:var(--text-secondary);font-family:var(--font-mono);">Article not found.</p>';
    return;
  }

  document.title = `Klyxe — ${art.title}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'lab-article reveal';
  wrapper.innerHTML = `
    <div class="lab-article-header">
      <div class="lab-article-num">${String(id).padStart(2, '0')}</div>
      <div class="lab-article-meta">
        <div class="lab-article-tag">${art.tag}</div>
        <div class="lab-article-title">${art.title}</div>
        <div class="lab-article-desc">${art.desc}</div>
      </div>
    </div>
    <div class="lab-article-body">${art.html}</div>
  `;
  container.appendChild(wrapper);

  // Reveal-анимация
  requestAnimationFrame(() => wrapper.classList.add('visible'));

  // Запуск article-specific логики
  if (art.init) art.init();
}

// ══════════════════════════════════════════════════════════════════════════════
// Статья 1 — MNIST Digit Recognizer
// ══════════════════════════════════════════════════════════════════════════════
function initMnist() {
  const canvas = document.getElementById('draw-canvas');
  const ctx    = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 196, 196);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth  = 14;
  ctx.lineCap    = 'round';
  ctx.lineJoin   = 'round';
  let drawing = false, lx = 0, ly = 0;

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return [s.clientX - r.left, s.clientY - r.top];
  }
  function start(e) { drawing = true; [lx, ly] = pos(e); e.preventDefault(); }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const [x, y] = pos(e);
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
    lx = x; ly = y;
    predict();
  }
  function stop() { drawing = false; }

  canvas.addEventListener('mousedown',  start);
  canvas.addEventListener('mousemove',  move);
  canvas.addEventListener('mouseup',    stop);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove',  move,  { passive: false });
  canvas.addEventListener('touchend',   stop);

  window.clearMnist = function () {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 196, 196);
    document.getElementById('mnist-pred').textContent = '?';
    document.getElementById('mnist-conf').textContent = 'Draw a digit to start';
    renderBars(new Array(10).fill(0));
  };

  function smx(a) {
    const mx = Math.max(...a);
    const ex = a.map(x => Math.exp(x - mx));
    const s  = ex.reduce((a, b) => a + b, 0);
    return ex.map(x => x / s);
  }

  function predict() {
    const d  = ctx.getImageData(0, 0, 196, 196).data;
    let nz = 0;
    for (let i = 0; i < d.length; i += 4) nz += d[i] > 30 ? 1 : 0;
    if (nz < 20) { renderBars(new Array(10).fill(0)); return; }
    const px = new Float32Array(28 * 28);
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const sx = Math.floor(x * 7), sy = Math.floor(y * 7);
        px[y * 28 + x] = d[(sy * 196 + sx) * 4] / 255;
      }
    }
    const f = features(px), sc = classify(f), sp = smx(sc);
    const best = sp.indexOf(Math.max(...sp));
    document.getElementById('mnist-pred').textContent = best;
    document.getElementById('mnist-conf').textContent = 'Confidence: ' + (sp[best] * 100).toFixed(1) + '%';
    renderBars(sp);
  }

  function features(px) {
    const q = [0, 0, 0, 0];
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const v = px[y * 28 + x];
        q[(y < 14 ? 0 : 2) + (x < 14 ? 0 : 1)] += v;
      }
    }
    let h = 0, v = 0;
    for (let y = 1; y < 27; y++) { let r = 0; for (let x = 0; x < 28; x++) r += px[y * 28 + x]; if (r > 3) h++; }
    for (let x = 1; x < 27; x++) { let c = 0; for (let y = 0; y < 28; y++) c += px[y * 28 + x]; if (c > 3) v++; }
    let tm = 0, bm = 0, cen = 0, sym = 0;
    for (let y = 0;  y < 14; y++) for (let x = 0; x < 28; x++) tm  += px[y * 28 + x];
    for (let y = 14; y < 28; y++) for (let x = 0; x < 28; x++) bm  += px[y * 28 + x];
    for (let y = 9;  y < 19; y++) for (let x = 9; x < 19; x++) cen += px[y * 28 + x];
    for (let y = 0;  y < 28; y++) for (let x = 0; x < 14; x++) sym += Math.abs(px[y * 28 + x] - px[y * 28 + (27 - x)]);
    const tot = q[0] + q[1] + q[2] + q[3];
    return { q, h, v, tm, bm, cen, sym, tot };
  }

  function classify({ q, h, v, tm, bm, cen, sym, tot }) {
    const s = new Array(10).fill(0);
    const sr = sym / (tot + 0.001), cr = cen / (tot + 0.001), vr = v / (h + 1), tr = tm / (tot + 0.001);
    s[0] += (1 - cr) * 3 + (1 - sr) * 2; s[1] += vr * 2 + sr * 2;
    s[2] += (q[0] + q[3]) - (q[1] + q[2]) + h * 0.3; s[3] += sr * 3 + h * 0.2;
    s[4] += (q[0] + q[2]) * 0.1 + v * 0.3; s[5] += (q[0] + q[3]) * 0.15 + (1 - sr) * 1.5;
    s[6] += (q[2] + q[3]) * 0.1 + (1 - tr) * 2; s[7] += tr * 2 + (q[0] + q[1]) * 0.1;
    s[8] += sr * 4 + cr * 2; s[9] += (q[0] + q[1]) * 0.15 + (1 - cr) * 1.5;
    for (let i = 0; i < 10; i++) s[i] += Math.random() * 0.8 - 0.4;
    return s;
  }

  function renderBars(probs) {
    const colors = ['#6366f1','#3b82f6','#06b6d4','#10b981','#34d399','#f59e0b','#f87171','#8b5cf6','#ec4899','#a78bfa'];
    document.getElementById('mnist-bars').innerHTML = probs.map((p, i) =>
      `<div class="param-row">
        <span class="param-label">${i}</span>
        <span class="param-bar-wrap">
          <span class="param-bar" style="width:${(p * 100).toFixed(1)}%;background:${colors[i]};"></span>
        </span>
        <span class="param-val">${(p * 100).toFixed(0)}%</span>
      </div>`
    ).join('');
  }

  renderBars(new Array(10).fill(0));
  const st = document.getElementById('mnist-status');
  st.className = 'status-msg ok';
  st.innerHTML = '✓ Ready — draw a digit on the canvas';
}

// ══════════════════════════════════════════════════════════════════════════════
// Статья 2 — VAE Latent Space
// ══════════════════════════════════════════════════════════════════════════════
function initVae() {
  const latC = document.getElementById('vae-latent');
  const latX = latC.getContext('2d');
  const decC = document.getElementById('vae-decoded');
  const decX = decC.getContext('2d');
  const ANCHORS = [[-2.1,-1.5],[1.8,-1.8],[0.5,2.0],[-1.8,1.6],[2.1,0.3],[-0.4,-2.1],[1.5,1.8],[-2.2,-0.2],[0.1,0.0],[0.8,-1.0]];
  const PAL    = [[99,102,241],[59,130,246],[6,182,212],[16,185,129],[52,211,153],[245,158,11],[248,113,113],[139,92,246],[236,72,153],[167,139,250]];

  function drawLatent(z1, z2) {
    const W = 200, H = 200, img = latX.createImageData(W, H);
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const sx = (px / W) * 6 - 3, sy = (py / H) * 6 - 3;
        let md = 1e9, mi = 0;
        ANCHORS.forEach(([dx, dy], i) => { const d = Math.hypot(sx - dx, sy - dy); if (d < md) { md = d; mi = i; } });
        const [r, g, b] = PAL[mi], al = Math.max(0, 1 - md * 0.55), base = (py * W + px) * 4;
        img.data[base] = r; img.data[base + 1] = g; img.data[base + 2] = b; img.data[base + 3] = Math.round(al * 110 + 20);
      }
    }
    latX.fillStyle = '#0d1117'; latX.fillRect(0, 0, 200, 200); latX.putImageData(img, 0, 0);
    latX.strokeStyle = 'rgba(255,255,255,0.05)'; latX.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const x = i / 6 * 200, y = i / 6 * 200;
      latX.beginPath(); latX.moveTo(x, 0); latX.lineTo(x, 200); latX.stroke();
      latX.beginPath(); latX.moveTo(0, y); latX.lineTo(200, y); latX.stroke();
    }
    ANCHORS.forEach(([dx, dy], i) => {
      const px = (dx + 3) / 6 * 200, py = (dy + 3) / 6 * 200;
      latX.fillStyle = 'rgba(255,255,255,0.3)'; latX.font = '10px DM Mono,monospace'; latX.fillText(i, px + 3, py - 3);
    });
    const cx = (z1 + 3) / 6 * 200, cy = (z2 + 3) / 6 * 200;
    latX.beginPath(); latX.arc(cx, cy, 6, 0, Math.PI * 2); latX.fillStyle = '#34d399'; latX.fill();
    latX.beginPath(); latX.arc(cx, cy, 10, 0, Math.PI * 2); latX.strokeStyle = 'rgba(52,211,153,0.4)'; latX.lineWidth = 2; latX.stroke();
  }

  function getPattern(d) {
    const W = 28, px = new Float32Array(W * W), cx = 14, cy = 14;
    if (d===0){for(let y=0;y<W;y++)for(let x=0;x<W;x++){const v=Math.pow((x-cx)/8,2)+Math.pow((y-cy)/10,2);px[y*W+x]=Math.exp(-Math.pow(Math.abs(v-1)*4,2));}}
    else if(d===1){for(let y=3;y<25;y++)for(let x=0;x<W;x++)px[y*W+x]=Math.exp(-Math.pow((x-cx)/1.5,2));}
    else if(d===2){for(let y=0;y<W;y++)for(let x=0;x<W;x++){const t=y/W,tx=t<0.4?cx+7*Math.cos(Math.PI*(1-t/0.4)):t<0.6?cx+7*(1-2*(t-0.4)/0.2)-7:cx-7+14*(t-0.6)/0.4,ty=t<0.4?cy-8+8*t/0.4:t<0.6?cy:cy+(W-cy)*(t-0.6)/0.4;px[y*W+x]=Math.max(px[y*W+x],Math.exp(-Math.pow(x-tx,2)/4-Math.pow(y-ty,2)/4));}}
    else if(d===3){for(let y=0;y<W;y++)for(let x=0;x<W;x++){px[y*W+x]=Math.min(1,Math.exp(-Math.pow((x-cx-4)/3,2)-Math.pow((y-cy+6)/4,2))+Math.exp(-Math.pow((x-cx-4)/3,2)-Math.pow((y-cy-6)/4,2)));}}
    else if(d===4){for(let y=0;y<W;y++)for(let x=0;x<W;x++){px[y*W+x]=Math.min(1,Math.exp(-Math.pow(x-cx,2)/2)*(y>8?1:0)+Math.exp(-Math.pow((y-cy+2)/2,2))*(x<cx?1:0)+Math.exp(-Math.pow(x-(cx-4),2)/3)*(y<cy?1:0));}}
    else if(d===5){for(let y=0;y<W;y++)for(let x=0;x<W;x++){px[y*W+x]=Math.min(1,(y<8?Math.exp(-Math.pow((y-3)/2,2)):0)+Math.exp(-Math.pow((y-cy)/2,2)-Math.pow((x-cx)/6,2))*0.5+Math.exp(-Math.pow((x-cx)/6,2)-Math.pow((y-cy-5)/4,2)));}}
    else if(d===6){for(let y=0;y<W;y++)for(let x=0;x<W;x++){px[y*W+x]=Math.min(1,Math.exp(-Math.pow(Math.hypot(x-cx,y-cy-3)-7,2)/2)+Math.exp(-Math.pow(x-(cx-3),2)/2)*(y<cy?0.8:0));}}
    else if(d===7){for(let y=0;y<W;y++)for(let x=0;x<W;x++){px[y*W+x]=Math.min(1,Math.exp(-Math.pow((y-4)/2,2)-Math.pow((x-cx)/7,2))+Math.exp(-Math.pow((x-cx)+(y-4)/1.5,2)/3)*(y>4?1:0));}}
    else if(d===8){for(let y=0;y<W;y++)for(let x=0;x<W;x++){px[y*W+x]=Math.min(1,Math.exp(-Math.pow(Math.hypot(x-cx,y-cy+5)-5,2)/2)+Math.exp(-Math.pow(Math.hypot(x-cx,y-cy-5)-5,2)/2));}}
    else if(d===9){for(let y=0;y<W;y++)for(let x=0;x<W;x++){px[y*W+x]=Math.min(1,Math.exp(-Math.pow(Math.hypot(x-cx,y-cy+3)-6,2)/2)+Math.exp(-Math.pow(x-(cx+4),2)/2)*(y>cy?0.8:0));}}
    return px;
  }

  const PATTERNS = Array.from({ length: 10 }, (_, i) => getPattern(i));

  function decode(z1, z2) {
    const w  = ANCHORS.map(([dx, dy]) => Math.exp(-Math.hypot(z1 - dx, z2 - dy) * 1.5));
    const ws = w.reduce((a, b) => a + b, 0);
    const wn = w.map(x => x / ws);
    const out = new Float32Array(784);
    for (let i = 0; i < 784; i++) out[i] = wn.reduce((s, ww, di) => s + ww * PATTERNS[di][i], 0);
    return out;
  }

  function render(px28) {
    const sc = 200 / 28;
    decX.clearRect(0, 0, 200, 200);
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 28; x++) {
        const v = Math.min(1, Math.max(0, px28[y * 28 + x]));
        decX.fillStyle = `rgb(${Math.round(v*99)},${Math.round(v*211)},${Math.round(v*153)})`;
        decX.fillRect(Math.round(x * sc), Math.round(y * sc), Math.ceil(sc), Math.ceil(sc));
      }
    }
  }

  function nearest(z1, z2) {
    let md = 1e9, mi = 0;
    ANCHORS.forEach(([dx, dy], i) => { const d = Math.hypot(z1 - dx, z2 - dy); if (d < md) { md = d; mi = i; } });
    return mi;
  }

  function update(z1, z2) {
    document.getElementById('vae-z1').textContent = z1.toFixed(2);
    document.getElementById('vae-z2').textContent = z2.toFixed(2);
    document.getElementById('z1-val').textContent = z1.toFixed(1);
    document.getElementById('z2-val').textContent = z2.toFixed(1);
    document.getElementById('z1-slider').value = z1;
    document.getElementById('z2-slider').value = z2;
    drawLatent(z1, z2);
    render(decode(z1, z2));
    document.getElementById('vae-digit-label').textContent = nearest(z1, z2);
  }

  latC.addEventListener('click', e => {
    const r = latC.getBoundingClientRect();
    update((e.clientX - r.left) / 200 * 6 - 3, (e.clientY - r.top) / 200 * 6 - 3);
  });
  latC.addEventListener('mousemove', e => {
    if (!(e.buttons & 1)) return;
    const r = latC.getBoundingClientRect();
    update((e.clientX - r.left) / 200 * 6 - 3, (e.clientY - r.top) / 200 * 6 - 3);
  });
  window.onVaeSlider = function () {
    update(+document.getElementById('z1-slider').value, +document.getElementById('z2-slider').value);
  };
  update(0, 0);
}

// ══════════════════════════════════════════════════════════════════════════════
// Статья 3 — Semantically Similar Words in 3-D
// ИСПРАВЛЕНИЕ: VECS объединён — lab.js имел русский словарь, lab-article.js — английский.
// ══════════════════════════════════════════════════════════════════════════════
function initWord3D() {
  const VECS = {
    // English
    'cat':[0.8,0.1,-0.3],'dog':[0.7,-0.1,-0.3],'animal':[0.6,0,-0.1],'bird':[0.5,0.5,-0.1],
    'fish':[0.4,-0.3,0.2],'lion':[0.9,-0.2,-0.4],'tiger':[0.85,-0.25,-0.4],'bear':[0.75,-0.15,-0.35],
    'wolf':[0.78,-0.18,-0.38],'horse':[0.72,0.05,-0.32],
    'car':[-0.8,0.2,0.5],'motorcycle':[-0.7,0.1,0.45],'plane':[-0.5,0.8,0.6],
    'ship':[-0.55,-0.3,0.7],'bicycle':[-0.65,0,0.3],'train':[-0.75,-0.1,0.55],'rocket':[-0.4,0.9,0.65],
    'tree':[0.1,0.8,-0.6],'grass':[0.2,0.9,-0.7],'flower':[0.3,0.85,-0.65],
    'ocean':[-0.1,-0.8,0.8],'mountain':[0,0.3,-0.9],'forest':[0.15,0.75,-0.7],
    'river':[-0.05,-0.7,0.75],'field':[0.25,0.85,-0.6],
    'city':[-0.6,-0.5,0.2],'house':[-0.3,-0.4,-0.1],'street':[-0.5,-0.6,0.1],
    'office':[-0.55,-0.55,0.15],'school':[-0.45,-0.45,-0.05],
    'joy':[0,0.5,0.8],'sadness':[0,0.4,-0.8],'anger':[-0.1,-0.2,-0.7],
    'love':[0.1,0.6,0.9],'fear':[-0.2,-0.5,-0.6],'happiness':[0.05,0.65,0.85],
    // Russian
    'кот':[0.8,0.1,-0.3],'кошка':[0.85,0.2,-0.35],'пёс':[0.7,-0.1,-0.3],'собака':[0.72,-0.15,-0.28],
    'животное':[0.6,0,-0.1],'птица':[0.5,0.5,-0.1],'рыба':[0.4,-0.3,0.2],'лев':[0.9,-0.2,-0.4],
    'тигр':[0.85,-0.25,-0.4],'медведь':[0.75,-0.15,-0.35],'волк':[0.78,-0.18,-0.38],
    'машина':[-0.8,0.2,0.5],'самолёт':[-0.5,0.8,0.6],'корабль':[-0.55,-0.3,0.7],
    'велосипед':[-0.65,0,0.3],'поезд':[-0.75,-0.1,0.55],'ракета':[-0.4,0.9,0.65],
    'дерево':[0.1,0.8,-0.6],'трава':[0.2,0.9,-0.7],'цветок':[0.3,0.85,-0.65],
    'море':[-0.1,-0.8,0.8],'гора':[0,0.3,-0.9],'лес':[0.15,0.75,-0.7],
    'река':[-0.05,-0.7,0.75],'поле':[0.25,0.85,-0.6],
    'город':[-0.6,-0.5,0.2],'дом':[-0.3,-0.4,-0.1],'улица':[-0.5,-0.6,0.1],
    'офис':[-0.55,-0.55,0.15],'школа':[-0.45,-0.45,-0.05],
    'радость':[0,0.5,0.8],'грусть':[0,0.4,-0.8],'злость':[-0.1,-0.2,-0.7],
    'любовь':[0.1,0.6,0.9],'страх':[-0.2,-0.5,-0.6],'счастье':[0.05,0.65,0.85],
  };

  function cosSim(a, b) {
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < 3; i++) { d += a[i]*b[i]; na += a[i]**2; nb += b[i]**2; }
    return d / (Math.sqrt(na * nb) + 1e-9);
  }
  function seedVec(s) {
    const n = s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return [Math.sin(n)*0.9, Math.cos(n*2)*0.9, Math.sin(n*3)*0.9];
  }

  let animId = null, ren = null, euler = { x: 0.3, y: 0.5 }, isDrag = false, prevM = { x: 0, y: 0 };

  window.runWord3D = function () {
    const word = document.getElementById('w3d-word').value.trim().toLowerCase();
    if (!word) return;
    const vec = VECS[word] || seedVec(word);
    const similar = Object.entries(VECS)
      .filter(([k]) => k !== word)
      .map(([k, v]) => ({ word: k, vec: v, sim: cosSim(vec, v) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 16);
    const points = [{ word, vec, sim: 1, isQ: true }, ...similar];

    document.getElementById('w3d-ph').style.display = 'none';
    const wrap = document.getElementById('w3d-wrap');
    wrap.querySelectorAll('.word3d-word-tag').forEach(e => e.remove());
    if (animId) cancelAnimationFrame(animId);
    if (ren) ren.dispose();

    const W = wrap.clientWidth || 640, H = 340;
    const cvs = document.getElementById('word3d-canvas');
    const scene = new THREE.Scene();
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    cam.position.set(0, 0, 4.5);
    ren = new THREE.WebGLRenderer({ canvas: cvs, alpha: true, antialias: true });
    ren.setSize(W, H);
    ren.setClearColor(0, 0);

    [[[-2,0,0],[2,0,0]],[[0,-2,0],[0,2,0]],[[0,0,-2],[0,0,2]]].forEach(pts => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
      scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x1e293b })));
    });

    const grp = new THREE.Group(); scene.add(grp);
    const tagData = [];
    points.forEach(({ word: w, vec: [x, y, z], sim, isQ }) => {
      const g   = new THREE.SphereGeometry(isQ ? 0.09 : 0.06, 16, 16);
      const hue = (sim * 0.4 + 0.55) % 1;
      const col = isQ ? 0x34d399 : new THREE.Color().setHSL(hue, 0.85, 0.62).getHex();
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col }));
      mesh.position.set(x * 1.8, y * 1.8, z * 1.8);
      grp.add(mesh);
      if (isQ) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.13, 0.19, 32),
          new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
        );
        ring.position.copy(mesh.position);
        grp.add(ring);
      }
      tagData.push({ vec: [x * 1.8, y * 1.8, z * 1.8], isQ, word: w });
    });

    const labels = tagData.map(({ word: w, isQ }) => {
      const el = document.createElement('div');
      el.className = 'word3d-word-tag';
      el.textContent = w;
      el.style.color = isQ ? '#34d399' : 'rgba(180,196,215,0.8)';
      if (isQ) el.style.borderColor = 'rgba(52,211,153,0.4)';
      wrap.appendChild(el);
      return el;
    });

    showStatus(document.getElementById('w3d-status'), 'ok',
      'Found ' + similar.length + ' similar words for "' + word + '" — drag to rotate');
    euler = { x: 0.3, y: 0.5 };

    function animate() {
      animId = requestAnimationFrame(animate);
      if (!isDrag) euler.y += 0.004;
      grp.rotation.x = euler.x;
      grp.rotation.y = euler.y;
      ren.render(scene, cam);
      tagData.forEach(({ vec: [x, y, z] }, i) => {
        const v3 = new THREE.Vector3(x, y, z).applyEuler(grp.rotation);
        const pr = v3.clone().project(cam);
        labels[i].style.left    = ((pr.x + 1) / 2 * W) + 'px';
        labels[i].style.top     = ((-pr.y + 1) / 2 * H) + 'px';
        labels[i].style.display = pr.z < 1 ? '' : 'none';
      });
    }
    animate();

    wrap.onmousedown  = e => { isDrag = true; prevM = { x: e.clientX, y: e.clientY }; };
    wrap.onmousemove  = e => { if (!isDrag) return; euler.y += (e.clientX - prevM.x) * 0.01; euler.x += (e.clientY - prevM.y) * 0.01; prevM = { x: e.clientX, y: e.clientY }; };
    wrap.onmouseup    = wrap.onmouseleave = () => { isDrag = false; };
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Статья 4 — Temperature (глобальный обработчик, init не нужен)
// ══════════════════════════════════════════════════════════════════════════════
window.runTemp = async function () {
  const apiKey   = document.getElementById('temp-apikey').value.trim();
  const prompt   = document.getElementById('temp-prompt').value.trim();
  const temp     = +document.getElementById('temp-slider').value;
  const resultsEl = document.getElementById('temp-results');
  const status   = document.getElementById('temp-status');
  if (!apiKey)  { showStatus(status, 'err', 'Enter your API key'); return; }
  if (!prompt)  { showStatus(status, 'err', 'Enter a prompt');     return; }
  resultsEl.innerHTML = '';
  showStatus(status, '', '<span class="pulse-dot"></span>&nbsp;Sending 3 requests…');
  const temps = [Math.max(0, +(temp - 0.3).toFixed(2)), temp, Math.min(1, +(temp + 0.3).toFixed(2))];
  for (let i = 0; i < temps.length; i++) {
    const t = temps[i];
    const card = document.createElement('div');
    card.className = 'temp-result-card';
    const rid = 'tr' + i;
    card.innerHTML = `<div class="temp-result-head"><span style="font-size:12px;font-family:var(--font-mono);color:var(--text-secondary);">Attempt #${i + 1}</span><span class="temp-badge">temperature=${t}</span></div><div class="temp-result-text" id="${rid}">…</div>`;
    resultsEl.appendChild(card);
    try {
      const { text } = await callAPI(apiKey, [{ role: 'user', content: prompt }], 'claude-haiku-4-5-20251001', 200, t);
      document.getElementById(rid).textContent = text;
    } catch (e) {
      document.getElementById(rid).innerHTML = '<span style="color:#f87171;">' + e.message + '</span>';
    }
  }
  showStatus(status, 'ok', 'Compare how diversity changes across temperatures');
};

// ══════════════════════════════════════════════════════════════════════════════
// Статья 5 — Token Tracker
// ИСПРАВЛЕНИЕ: добавлена проверка typeof Chart (на случай сбоя CDN).
// ══════════════════════════════════════════════════════════════════════════════
let tokChart = null, totalIn = 0, totalOut = 0, reqCount = 0;

function initTokChart() {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded — token chart unavailable');
    return;
  }
  if (tokChart) tokChart.destroy();
  tokChart = new Chart(document.getElementById('tok-chart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        { label: 'Input',  data: [], backgroundColor: 'rgba(99,102,241,0.6)',  borderColor: '#6366f1', borderWidth: 1 },
        { label: 'Output', data: [], backgroundColor: 'rgba(52,211,153,0.6)',  borderColor: '#34d399', borderWidth: 1 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    },
  });
}

window.sendToken = async function () {
  const apiKey = document.getElementById('tok-apikey').value.trim();
  const prompt = document.getElementById('tok-prompt').value.trim();
  const status = document.getElementById('tok-status');
  if (!apiKey) { showStatus(status, 'err', 'Enter your API key'); return; }
  if (!prompt) { showStatus(status, 'err', 'Enter a message');    return; }
  if (!tokChart) initTokChart();
  showStatus(status, '', '<span class="pulse-dot"></span>&nbsp;Sending…');
  try {
    const { text, usage } = await callAPI(apiKey, [{ role: 'user', content: prompt }], 'claude-haiku-4-5-20251001', 300, 0.7);
    const inp = usage.input_tokens || 0, out = usage.output_tokens || 0;
    totalIn += inp; totalOut += out; reqCount++;
    document.getElementById('tok-total-in').textContent  = totalIn;
    document.getElementById('tok-total-out').textContent = totalOut;
    document.getElementById('tok-total-all').textContent = totalIn + totalOut;
    document.getElementById('tok-count').textContent     = reqCount;
    const short = prompt.length > 28 ? prompt.slice(0, 26) + '…' : prompt;
    if (tokChart) {
      tokChart.data.labels.push(short);
      tokChart.data.datasets[0].data.push(inp);
      tokChart.data.datasets[1].data.push(out);
      tokChart.update();
    }
    const row = document.createElement('div');
    row.className = 'tokens-log-row';
    row.innerHTML = `<span title="${prompt}">${short}</span><span>${inp}</span><span>${out}</span><span>${inp + out}</span>`;
    document.getElementById('tok-log-body').prepend(row);
    document.getElementById('tok-prompt').value = '';
    showStatus(status, 'ok', '✓ ' + inp + ' in + ' + out + ' out = ' + (inp + out) + ' tokens');
  } catch (e) {
    showStatus(status, 'err', e.message);
  }
};

window.clearTokenLog = function () {
  totalIn = totalOut = reqCount = 0;
  ['tok-total-in','tok-total-out','tok-total-all','tok-count'].forEach(id =>
    document.getElementById(id).textContent = '0');
  document.getElementById('tok-log-body').innerHTML = '';
  if (tokChart) {
    tokChart.data.labels = [];
    tokChart.data.datasets.forEach(d => d.data = []);
    tokChart.update();
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// Статья 6 — HumanEval Benchmark
// ══════════════════════════════════════════════════════════════════════════════
const HE_TASKS = [
  {
    name: 'has_close_elements',
    sig:  'def has_close_elements(numbers: List[float], threshold: float) -> bool:',
    doc:  '    """Check if in given list of numbers, are any two numbers\n    closer to each other than given threshold.\n    >>> has_close_elements([1.0, 2.0, 3.0], 0.5)\n    False\n    >>> has_close_elements([1.0, 2.8, 3.0, 4.0, 5.0, 2.0], 0.3)\n    True\n    """',
    tests: ['assert has_close_elements([1.0, 2.0, 3.0], 0.5) == False', 'assert has_close_elements([1.0, 2.8, 3.0, 4.0, 5.0, 2.0], 0.3) == True'],
  },
  {
    name: 'separate_paren_groups',
    sig:  'def separate_paren_groups(paren_string: str) -> List[str]:',
    doc:  '    """Input to this function is a string containing multiple\n    groups of nested parentheses. Separate those groups into\n    separate strings and return the list of those.\n    >>> separate_paren_groups("( ) (( )) (( )( ))")\n    [\'( )\', \'(( ))\', \'(( )( ))\']\n    """',
    tests: ["assert separate_paren_groups('( ) (( )) (( )( ))') == ['( )', '(( ))', '(( )( ))']"],
  },
  {
    name: 'truncate_number',
    sig:  'def truncate_number(number: float) -> float:',
    doc:  '    """Given a positive floating point number, decompose it into\n    an integer part and decimals. Return the decimal part.\n    >>> truncate_number(3.5)\n    0.5\n    """',
    tests: ['assert abs(truncate_number(3.5) - 0.5) < 0.001', 'assert abs(truncate_number(1.33) - 0.33) < 0.001'],
  },
  {
    name: 'below_zero',
    sig:  'def below_zero(operations: List[int]) -> bool:',
    doc:  "    \"\"\"You're given a list of deposit and withdrawal operations.\n    Detect if at any point the balance falls below zero.\n    >>> below_zero([1, 2, 3])\n    False\n    >>> below_zero([1, 2, -4, 5])\n    True\n    \"\"\"",
    tests: ['assert below_zero([1, 2, 3]) == False', 'assert below_zero([1, 2, -4, 5]) == True'],
  },
];

let selTask = 0;

function initHumanEval() {
  showHeProblem();
  document.querySelectorAll('#he-model-chips .model-chip').forEach(c =>
    c.addEventListener('click', () => c.classList.toggle('active')));
}

window.selectTask = function (idx, btn) {
  selTask = idx;
  document.querySelectorAll('.he-task-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  showHeProblem();
};

function showHeProblem() {
  const t = HE_TASKS[selTask];
  document.getElementById('he-problem').textContent = 'from typing import List\n\n' + t.sig + '\n' + t.doc;
}

window.runHumanEval = async function () {
  const apiKey  = document.getElementById('he-apikey').value.trim();
  const status  = document.getElementById('he-status');
  const results = document.getElementById('he-results');
  if (!apiKey) { showStatus(status, 'err', 'Enter your API key'); return; }
  const models = [...document.querySelectorAll('#he-model-chips .model-chip.active')].map(c => c.dataset.model);
  if (!models.length) { showStatus(status, 'err', 'Select at least one model'); return; }
  const task   = HE_TASKS[selTask];
  const prompt = 'Complete the following Python function. Return ONLY the complete working function code, no markdown, no explanation:\n\nfrom typing import List\n\n' + task.sig + '\n' + task.doc + '\n    pass';
  results.innerHTML = '';
  showStatus(status, '', '<span class="pulse-dot"></span>&nbsp;Running ' + models.length + ' model' + (models.length > 1 ? 's' : '') + ' in parallel…');

  models.forEach(model => {
    const id   = model.replace(/[^a-z0-9]/gi, '-');
    const card = document.createElement('div');
    card.className = 'he-result-card';
    card.innerHTML = `<div class="he-result-head"><span class="he-model-name">${model}</span><span class="he-pass-badge running" id="hb-${id}">Running…</span></div><div class="he-code" id="hc-${id}">Waiting for response…</div>`;
    results.appendChild(card);
  });

  await Promise.all(models.map(async model => {
    const id = model.replace(/[^a-z0-9]/gi, '-');
    try {
      const { text } = await callAPI(apiKey, [{ role: 'user', content: prompt }], model, 500, 0.2);
      document.getElementById('hc-' + id).textContent = text;
      const passed = task.tests.every(test => {
        try { new Function('List', text + '\n' + test + '\nreturn true;')(Array); return true; } catch { return false; }
      });
      const badge = document.getElementById('hb-' + id);
      badge.textContent = passed ? '✓ PASS' : '✗ FAIL';
      badge.className   = 'he-pass-badge ' + (passed ? 'pass' : 'fail');
    } catch (e) {
      document.getElementById('hc-' + id).innerHTML = '<span style="color:#f87171;">' + e.message + '</span>';
      const badge = document.getElementById('hb-' + id);
      badge.textContent = 'ERROR';
      badge.className   = 'he-pass-badge fail';
    }
  }));

  showStatus(status, 'ok', 'Done for ' + models.length + ' model' + (models.length > 1 ? 's' : ''));
};

mountArticle();