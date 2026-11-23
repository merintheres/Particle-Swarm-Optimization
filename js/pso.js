/* ═══════════════════════════════════════════════════════
   PSO VISUAL GUIDE — Main JavaScript
   Hero canvas · Live Calc · PSO Engine · Quiz
   ═══════════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────────────
   SECTION A: Utility helpers
   ─────────────────────────────────────────────────────── */
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt   = v => typeof v === 'number' ? v.toFixed(4) : v;
const fmt2  = v => typeof v === 'number' ? v.toFixed(2) : v;

/* ───────────────────────────────────────────────────────
   SECTION B: Benchmark functions catalogue
   ─────────────────────────────────────────────────────── */
const FUNCTIONS = {
  sphere: {
    label: 'Sphere',
    fn: (x, y) => x*x + y*y,
    domain: [-5, 5],
    optimum: { x: 0, y: 0, f: 0 },
    info: 'Unimodal, convex bowl. Global min at (0,0) with f=0. Easiest benchmark — PSO always finds it.',
    formula: 'f(x,y) = x² + y²'
  },
  rastrigin: {
    label: 'Rastrigin',
    fn: (x, y) => 20 + x*x - 10*Math.cos(2*Math.PI*x) + y*y - 10*Math.cos(2*Math.PI*y),
    domain: [-5.12, 5.12],
    optimum: { x: 0, y: 0, f: 0 },
    info: 'Highly multimodal. Many local minima arranged on a grid. Classic PSO benchmark for exploring diverse landscapes.',
    formula: 'f(x,y) = 20 + Σ[xᵢ² − 10cos(2πxᵢ)]'
  },
  ackley: {
    label: 'Ackley',
    fn: (x, y) => {
      const a=20, b=0.2, c=2*Math.PI;
      return -a * Math.exp(-b*Math.sqrt((x*x+y*y)/2))
             - Math.exp((Math.cos(c*x)+Math.cos(c*y))/2)
             + a + Math.E;
    },
    domain: [-5, 5],
    optimum: { x: 0, y: 0, f: 0 },
    info: 'Nearly flat outer region with a steep central funnel and many cosine waves. Deceptive for greedy searchers.',
    formula: 'f(x,y) = −20e^(−0.2√(Σxᵢ²/n)) − e^(Σcos(2πxᵢ)/n) + 20 + e'
  },
  rosenbrock: {
    label: 'Rosenbrock',
    fn: (x, y) => 100*(y - x*x)**2 + (1 - x)**2,
    domain: [-2.5, 2.5],
    optimum: { x: 1, y: 1, f: 0 },
    info: 'The "banana valley" — a narrow, curved ridge. Easy to find the valley; hard to follow it to the minimum at (1,1).',
    formula: 'f(x,y) = 100(y−x²)² + (1−x)²'
  },
  booth: {
    label: 'Booth',
    fn: (x, y) => (x + 2*y - 7)**2 + (2*x + y - 5)**2,
    domain: [-10, 10],
    optimum: { x: 1, y: 3, f: 0 },
    info: 'Simple unimodal — global min at (1,3). Good for quick demos and verifying parameter tuning.',
    formula: 'f(x,y) = (x+2y−7)² + (2x+y−5)²'
  },
  himmelblau: {
    label: "Himmelblau",
    fn: (x, y) => (x*x + y - 11)**2 + (x + y*y - 5)**2,
    domain: [-5, 5],
    optimum: { x: 3, y: 2, f: 0 },
    info: 'Four global minima at (3,2), (−2.805,3.131), (−3.779,−3.283), (3.584,−1.848). Tests the swarm\'s ability to find multiple optima.',
    formula: 'f(x,y) = (x²+y−11)² + (x+y²−5)²'
  },
  schwefel: {
    label: 'Schwefel',
    fn: (x, y) => 418.9829*2 - x*Math.sin(Math.sqrt(Math.abs(x))) - y*Math.sin(Math.sqrt(Math.abs(y))),
    domain: [-500, 500],
    optimum: { x: 420.9687, y: 420.9687, f: 0 },
    info: 'Highly deceptive — the global minimum is geometrically distant from the next-best local minima. Very challenging.',
    formula: 'f(x,y) = 418.98·2 − x·sin(√|x|) − y·sin(√|y|)'
  },
  custom: {
    label: 'Custom',
    fn: null,
    domain: [-5, 5],
    optimum: null,
    info: 'Your own formula — use x, y, sin, cos, sqrt, abs, pi, e. Example: sin(x)*cos(y)+x^2/10',
    formula: 'f(x,y) = ...'
  }
};

/* ───────────────────────────────────────────────────────
   SECTION C: HERO CANVAS — ambient flocking swarm
   ─────────────────────────────────────────────────────── */
(function initHero() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, mouse = { x: 0, y: 0 };
  const N = 60;
  const particles = [];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < N; i++) {
      particles.push({
        x: rnd(0, W), y: rnd(0, H),
        vx: rnd(-1.2, 1.2), vy: rnd(-1.2, 1.2),
        pbx: rnd(0, W), pby: rnd(0, H),
        pbf: Infinity,
        trail: []
      });
    }
  }

  function dist2(ax, ay, bx, by) { return (ax-bx)**2 + (ay-by)**2; }

  let gbx = W/2, gby = H/2, totalIter = 0;
  const W_INERTIA = 0.6, C1 = 1.2, C2 = 1.5;

  function step() {
    // fitness = distance to mouse
    let bestF = Infinity, newGbx = gbx, newGby = gby;
    particles.forEach(p => {
      const f = Math.sqrt(dist2(p.x, p.y, mouse.x, mouse.y));
      if (f < p.pbf) { p.pbf = f; p.pbx = p.x; p.pby = p.y; }
      if (f < bestF) { bestF = f; newGbx = p.x; newGby = p.y; }
    });
    gbx = newGbx; gby = newGby;

    particles.forEach(p => {
      const r1 = Math.random(), r2 = Math.random();
      p.vx = W_INERTIA*p.vx + C1*r1*(p.pbx - p.x) + C2*r2*(gbx - p.x);
      p.vy = W_INERTIA*p.vy + C1*r1*(p.pby - p.y) + C2*r2*(gby - p.y);
      const spd = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if (spd > 3) { p.vx *= 3/spd; p.vy *= 3/spd; }
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 12) p.trail.shift();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      if (p.x > W) { p.x = W; p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
      if (p.y > H) { p.y = H; p.vy = -Math.abs(p.vy); }
    });
    totalIter++;

    // update hero stats
    const heroParticlesEl = document.getElementById('heroParticles');
    const heroIterEl = document.getElementById('heroIter');
    const heroGbestEl = document.getElementById('heroGbest');
    if (heroParticlesEl) heroParticlesEl.textContent = N;
    if (heroIterEl) heroIterEl.textContent = totalIter;
    if (heroGbestEl) heroGbestEl.textContent = Math.sqrt(dist2(gbx, gby, mouse.x, mouse.y)).toFixed(1);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // gradient bg
    const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.7);
    grad.addColorStop(0, 'rgba(255,112,67,0.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // connection lines to gbest
    particles.forEach(p => {
      const d = Math.sqrt(dist2(p.x, p.y, gbx, gby));
      if (d < 180) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(gbx, gby);
        ctx.strokeStyle = `rgba(255,112,67,${(1-d/180)*0.12})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    });

    // trails
    particles.forEach(p => {
      if (p.trail.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      p.trail.forEach(t => ctx.lineTo(t.x, t.y));
      ctx.strokeStyle = 'rgba(255,152,67,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,160,80,0.75)';
      ctx.fill();
    });

    // gbest glow
    const glow = ctx.createRadialGradient(gbx, gby, 0, gbx, gby, 24);
    glow.addColorStop(0, 'rgba(255,112,67,0.6)');
    glow.addColorStop(1, 'rgba(255,112,67,0)');
    ctx.beginPath(); ctx.arc(gbx, gby, 24, 0, Math.PI*2);
    ctx.fillStyle = glow; ctx.fill();
    ctx.beginPath(); ctx.arc(gbx, gby, 5, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // mouse crosshair
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1; ctx.stroke();
  }

  let raf;
  function loop() {
    step(); draw();
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { resize(); initParticles(); });
  window.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    mouse.x = t.clientX - r.left;
    mouse.y = t.clientY - r.top;
  }, { passive: true });

  resize();
  mouse.x = W/2; mouse.y = H/2;
  initParticles();
  loop();

  // pause hero when not in view
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      if (!raf) loop();
    } else {
      cancelAnimationFrame(raf); raf = null;
    }
  });
  obs.observe(canvas);
})();

/* ───────────────────────────────────────────────────────
   SECTION D: Sticky nav active section
   ─────────────────────────────────────────────────────── */
(function initNav() {
  const nav = document.getElementById('siteNav');
  const links = nav ? nav.querySelectorAll('.nav-link') : [];
  const sections = Array.from(links).map(l => document.querySelector(l.dataset.section ? '#'+l.dataset.section : l.getAttribute('href')));
  const hamburger = document.getElementById('navHamburger');
  const navLinks = nav ? nav.querySelector('.nav-links') : null;

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
    const scrollY = window.scrollY + 120;
    let active = 0;
    sections.forEach((s, i) => { if (s && s.offsetTop <= scrollY) active = i; });
    links.forEach((l, i) => l.classList.toggle('active', i === active));
  });
})();

/* ───────────────────────────────────────────────────────
   SECTION E: Scroll-triggered fade-in
   ─────────────────────────────────────────────────────── */
(function initFade() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
})();

/* ───────────────────────────────────────────────────────
   SECTION F: Live Equation Calculator (Section 02)
   ─────────────────────────────────────────────────────── */
(function initLiveCalc() {
  const ids = { w:'lcW', c1:'lcC1', c2:'lcC2', v:'lcV', x:'lcX', pb:'lcPb', gb:'lcGb' };
  const sliders = {
    w:  document.getElementById('lcWSlider'),
    c1: document.getElementById('lcC1Slider'),
    c2: document.getElementById('lcC2Slider'),
    v:  document.getElementById('lcVSlider'),
    x:  document.getElementById('lcXSlider'),
    pb: document.getElementById('lcPbSlider'),
    gb: document.getElementById('lcGbSlider')
  };
  const output = document.getElementById('calcOutput');
  if (!output) return;

  function update() {
    const vals = {};
    Object.keys(sliders).forEach(k => {
      if (!sliders[k]) return;
      const raw = sliders[k].value / 100;
      vals[k] = raw;
      const el = document.getElementById(ids[k]);
      if (el) el.textContent = raw.toFixed(2);
    });
    // random r1, r2 shown as fixed for display (refresh on change)
    const r1 = 0.47, r2 = 0.63;
    const inertia_term  = vals.w * vals.v;
    const cogn_term = vals.c1 * r1 * (vals.pb - vals.x);
    const soc_term  = vals.c2 * r2 * (vals.gb - vals.x);
    const v_new = inertia_term + cogn_term + soc_term;
    const x_new = vals.x + v_new;

    output.innerHTML = `
<span style="color:var(--text-muted)">— Velocity Update —</span>
<br>
<span style="color:#ef5350">w·v</span>
  = ${vals.w.toFixed(2)} × ${vals.v.toFixed(2)}
  = <strong style="color:#ef5350">${inertia_term.toFixed(4)}</strong>
<br>
<span style="color:#42a5f5">c₁·r₁·(pbest−x)</span>
  = ${vals.c1.toFixed(2)}×${r1}×(${vals.pb.toFixed(2)}−${vals.x.toFixed(2)})
  = <strong style="color:#42a5f5">${cogn_term.toFixed(4)}</strong>
<br>
<span style="color:#ab47bc">c₂·r₂·(gbest−x)</span>
  = ${vals.c2.toFixed(2)}×${r2}×(${vals.gb.toFixed(2)}−${vals.x.toFixed(2)})
  = <strong style="color:#ab47bc">${soc_term.toFixed(4)}</strong>
<br>
<span style="color:var(--text-muted)">─────────────────────</span>
<br>
v<sub>new</sub> = <strong style="color:var(--pso-primary); font-size:1.05em">${v_new.toFixed(4)}</strong>
<br>
x<sub>new</sub> = x + v = ${vals.x.toFixed(2)} + ${v_new.toFixed(4)}
     = <strong style="color:#66bb6a; font-size:1.05em">${x_new.toFixed(4)}</strong>
    `.trim();
  }

  Object.values(sliders).forEach(s => { if (s) s.addEventListener('input', update); });
  update();
})();

/* ───────────────────────────────────────────────────────
   SECTION G: PSO ENGINE + VISUALIZER PLAYGROUND
   ─────────────────────────────────────────────────────── */
(function initPSO() {
  /* ── DOM refs ── */
  const canvas   = document.getElementById('vizCanvas');
  if (!canvas) return;
  const ctx      = canvas.getContext('2d');

  const $ = id => document.getElementById(id);

  const funcSelect    = $('funcSelect');
  const funcInfo      = $('funcInfo');
  const customBox     = $('customFormulaBox');
  const customInput   = $('customFormulaInput');
  const formulaError  = $('formulaError');
  const applyBtn      = $('applyFormulaBtn');
  const goalMin       = $('goalMin');
  const goalMax       = $('goalMax');
  const boundaryEl    = $('boundarySelect');
  const swarmSizeEl   = $('swarmSize');
  const inertiaEl     = $('inertia');
  const c1El          = $('c1');
  const c2El          = $('c2');
  const maxIterEl     = $('maxIter');
  const speedEl       = $('speed');
  const playBtn       = $('playBtn');
  const pauseBtn      = $('pauseBtn');
  const stepBtn       = $('stepBtn');
  const resetBtn      = $('resetBtn');
  const progressFill  = $('progressFill');
  const explanation   = $('explanation');
  const tableWrap     = $('particleTableWrap');
  const tableBody     = $('particleTableBody');

  const statIteration = $('statIteration');
  const statSubstep   = $('statSubstep');
  const statGBestPos  = $('statGBestPos');
  const statGBestVal  = $('statGBestVal');
  const statAvgFit    = $('statAvgFit');
  const statAvgVel    = $('statAvgVel');
  const statStagnation= $('statStagnation');

  /* ── State ── */
  let state = {
    particles: [],
    gbest: null, gbestF: Infinity,
    iteration: 0,
    substep: 'init',   // init | eval | pbest | gbest | velocity | position | done
    running: false,
    intervalId: null,
    heatmap: null,
    convergence: [],
    stagnation: 0,
    prevGBestF: Infinity,
    activeTab: 'contour',
    shockwaves: [],
    fn: null,
    domain: [-5, 5],
    minimize: true
  };

  let W = 0, H = 0, dpr = 1;

  /* ── Canvas sizing ── */
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const newW = Math.round(rect.width) || canvas.clientWidth || 600;
    const newH = Math.round(rect.height) || 520;
    
    if (newW !== W || newH !== H) {
      W = newW;
      H = newH;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      heatmapDirty = true;
      heatmapImageCache = null;
      render();
    }
  }
  new ResizeObserver(resizeCanvas).observe(canvas);
  resizeCanvas();

  /* ── Function setup ── */
  function getCurrentFuncKey() { return funcSelect ? funcSelect.value : 'sphere'; }

  function setupFunction() {
    const key = getCurrentFuncKey();
    const def = FUNCTIONS[key];
    if (funcInfo) {
      funcInfo.textContent = def.info + ' | ' + def.formula;
      funcInfo.classList.add('visible');
    }
    if (key === 'custom') {
      if (customBox) customBox.style.display = 'block';
      return compileCustom();
    } else {
      if (customBox) customBox.style.display = 'none';
      state.fn = def.fn;
      state.domain = [...def.domain];
      return true;
    }
  }

  function compileCustom() {
    if (!window.MathParser) return false;
    const expr = customInput ? customInput.value.trim() : '';
    if (!expr) { showFormulaError('Please enter a formula.'); return false; }
    try {
      const minX = parseFloat($('customMinX').value) || -5;
      const maxX = parseFloat($('customMaxX').value) || 5;
      const minY = parseFloat($('customMinY').value) || -5;
      const maxY = parseFloat($('customMaxY').value) || 5;
      state.fn = window.MathParser.compile2D(expr);
      state.domain = [Math.min(minX, maxX), Math.max(minX, maxX)];
      state.domainY = [Math.min(minY, maxY), Math.max(minY, maxY)];
      clearFormulaError();
      return true;
    } catch(e) {
      showFormulaError('Parse error: ' + e.message);
      return false;
    }
  }
  function showFormulaError(msg) { if (formulaError) formulaError.textContent = msg; }
  function clearFormulaError()  { if (formulaError) formulaError.textContent = ''; }

  /* ── Heatmap ── */
  function buildHeatmap() {
    const STEPS = 70;
    const [dlo, dhi] = state.domain;
    const ylo = state.domainY ? state.domainY[0] : dlo;
    const yhi = state.domainY ? state.domainY[1] : dhi;
    const grid = [];
    let mn = Infinity, mx = -Infinity;
    for (let j = 0; j <= STEPS; j++) {
      const row = [];
      for (let i = 0; i <= STEPS; i++) {
        const x = dlo + (dhi - dlo) * i / STEPS;
        const y = ylo + (yhi - ylo) * j / STEPS;
        let v;
        try { v = state.fn(x, y); } catch(_) { v = 0; }
        if (!isFinite(v)) v = 0;
        row.push(v);
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      grid.push(row);
    }
    state.heatmap = { grid, mn, mx, steps: STEPS, dlo, dhi, ylo, yhi };
  }

  /* coordinate maps */
  function xToCanvas(x) {
    if (!state.heatmap) return 0;
    const { dlo, dhi } = state.heatmap;
    return ((x - dlo) / (dhi - dlo)) * W;
  }
  function yToCanvas(y) {
    if (!state.heatmap) return 0;
    const { ylo, yhi } = state.heatmap;
    return H - ((y - ylo) / (yhi - ylo)) * H;
  }
  function canvasToX(cx) {
    if (!state.heatmap) return 0;
    const { dlo, dhi } = state.heatmap;
    return dlo + (cx / W) * (dhi - dlo);
  }
  function canvasToY(cy) {
    if (!state.heatmap) return 0;
    const { ylo, yhi } = state.heatmap;
    return ylo + (1 - cy / H) * (yhi - ylo);
  }

  /* colour mapping for heatmap */
  function valToColor(v, mn, mx) {
    if (mx === mn) return [30, 100, 180];
    const t = (v - mn) / (mx - mn); // 0=best(cold), 1=worst(hot)
    // navy→cyan→green→yellow→red
    if (t < 0.25) {
      const s = t / 0.25;
      return [0 + 20*s, 0 + 160*s, 180 + 60*s];
    } else if (t < 0.5) {
      const s = (t-0.25)/0.25;
      return [20 + 100*s, 160 + 80*s, 240 - 100*s];
    } else if (t < 0.75) {
      const s = (t-0.5)/0.25;
      return [120 + 135*s, 240 - 60*s, 140 - 100*s];
    } else {
      const s = (t-0.75)/0.25;
      return [255, 180 - 100*s, 40 - 30*s];
    }
  }

  let heatmapImageCache = null;
  let heatmapDirty = true;

  function drawHeatmap() {
    if (!state.heatmap || W <= 0 || H <= 0) return;
    if (heatmapDirty || !heatmapImageCache) {
      const { grid, mn, mx, steps } = state.heatmap;
      const offscreen = document.createElement('canvas');
      offscreen.width  = W;
      offscreen.height = H;
      const octx = offscreen.getContext('2d');
      const idata = octx.createImageData(W, H);
      const data  = idata.data;
      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          const gi = Math.round((px / W) * steps);
          const gj = Math.round((1 - py / H) * steps);
          const v  = (grid[gj] || [])[gi] ?? mn;
          const eff = state.minimize ? v : (mn + mx - v);
          const [r, g, b] = valToColor(eff, mn, mx);
          const idx = (py * W + px) * 4;
          data[idx]   = r; data[idx+1] = g;
          data[idx+2] = b; data[idx+3] = 230;
        }
      }
      octx.putImageData(idata, 0, 0);
      heatmapImageCache = offscreen;
      heatmapDirty = false;
    }
    ctx.drawImage(heatmapImageCache, 0, 0, W, H);
  }

  /* ── Init swarm ── */
  function initSwarm() {
    const n = parseInt(swarmSizeEl ? swarmSizeEl.value : 20);
    const [dlo, dhi] = state.domain;
    const ylo = state.domainY ? state.domainY[0] : dlo;
    const yhi = state.domainY ? state.domainY[1] : dhi;
    const velScale = (dhi - dlo) * 0.1;
    state.particles = Array.from({ length: n }, () => {
      const x = rnd(dlo, dhi), y = rnd(ylo, yhi);
      return {
        x, y,
        vx: rnd(-velScale, velScale),
        vy: rnd(-velScale, velScale),
        pbx: x, pby: y,
        pbf: Infinity,
        trail: [],
        isGbest: false
      };
    });
    state.gbest = null; state.gbestF = state.minimize ? Infinity : -Infinity;
    state.iteration = 0; state.substep = 'init';
    state.convergence = []; state.stagnation = 0; state.prevGBestF = state.minimize ? Infinity : -Infinity;
    state.shockwaves = [];
    heatmapDirty = true;
    updateUI();
    render();
  }

  /* ── PSO sub-step state machine ── */
  const SUBSTEPS = ['eval', 'pbest', 'gbest', 'velocity', 'position'];
  const SUBSTEP_NAMES = {
    init:     'Initialise',
    eval:     'Evaluate Fitness',
    pbest:    'Update pBest',
    gbest:    'Update gBest',
    velocity: 'Update Velocity',
    position: 'Update Position',
    done:     'Done'
  };
  const SUBSTEP_DESC = {
    init:     'Particles scatter randomly. Each particle\'s velocity is a small random vector — no direction yet, just curiosity.',
    eval:     'f(xᵢ) is computed for every particle. The landscape speaks: each bird now knows how good its current spot is.',
    pbest:    'If a particle found a better spot than its personal memory (pBest), it updates that memory. Each bird remembers its own best.',
    gbest:    'The best pBest across the entire swarm becomes gBest — the global leader. Discovery spreads instantly.',
    velocity: 'Three forces pull each particle: inertia keeps it moving, cognitive pulls it back to its personal best, social pulls it toward gBest.',
    position: 'x ← x + v. Each particle jumps to its new position. The swarm has taken one step.',
    done:     'The swarm has converged or reached the maximum iterations. The best solution is stored in gBest.'
  };

  function doSubstep() {
    const ps = state.particles;
    const w  = (inertiaEl  ? inertiaEl.value  / 100 : 0.72);
    const c1 = (c1El       ? c1El.value       / 100 : 1.49);
    const c2 = (c2El       ? c2El.value       / 100 : 1.49);
    const boundary = boundaryEl ? boundaryEl.value : 'clamp';
    const [dlo, dhi] = state.domain;
    const ylo = state.domainY ? state.domainY[0] : dlo;
    const yhi = state.domainY ? state.domainY[1] : dhi;
    const better = (a, b) => state.minimize ? a < b : a > b;

    switch (state.substep) {
      case 'init':
        state.substep = 'eval';
        break;

      case 'eval':
        ps.forEach(p => {
          try { p.f = state.fn(p.x, p.y); }
          catch(_) { p.f = state.minimize ? Infinity : -Infinity; }
          if (!isFinite(p.f)) p.f = state.minimize ? 1e9 : -1e9;
        });
        state.substep = 'pbest';
        break;

      case 'pbest':
        ps.forEach(p => {
          if (better(p.f, p.pbf)) {
            p.pbx = p.x; p.pby = p.y; p.pbf = p.f;
          }
        });
        state.substep = 'gbest';
        break;

      case 'gbest': {
        let bestP = null;
        ps.forEach(p => { if (!bestP || better(p.pbf, bestP.pbf)) bestP = p; });
        ps.forEach(p => p.isGbest = false);
        if (bestP && better(bestP.pbf, state.gbestF)) {
          state.gbestF = bestP.pbf;
          state.gbest = { x: bestP.pbx, y: bestP.pby };
          bestP.isGbest = true;
          // shockwave
          state.shockwaves.push({
            cx: xToCanvas(state.gbest.x),
            cy: yToCanvas(state.gbest.y),
            r: 0, maxR: 50, alpha: 0.8
          });
        } else if (state.gbest) {
          const leader = ps.find(p => p.pbx === state.gbest.x && p.pby === state.gbest.y);
          if (leader) leader.isGbest = true;
        }
        state.substep = 'velocity';
        break;
      }

      case 'velocity':
        if (!state.gbest) { state.substep = 'position'; break; }
        ps.forEach(p => {
          const r1 = Math.random(), r2 = Math.random();
          p.vx = w*p.vx + c1*r1*(p.pbx - p.x) + c2*r2*(state.gbest.x - p.x);
          p.vy = w*p.vy + c1*r1*(p.pby - p.y) + c2*r2*(state.gbest.y - p.y);
          // velocity clamp
          const maxV = (dhi - dlo) * 0.3;
          const spd  = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
          if (spd > maxV) { p.vx *= maxV/spd; p.vy *= maxV/spd; }
        });
        state.substep = 'position';
        break;

      case 'position':
        ps.forEach(p => {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 10) p.trail.shift();
          p.x += p.vx; p.y += p.vy;
          // boundary handling
          if (boundary === 'clamp') {
            p.x = clamp(p.x, dlo, dhi); p.y = clamp(p.y, ylo, yhi);
          } else if (boundary === 'bounce') {
            if (p.x < dlo) { p.x = dlo; p.vx = Math.abs(p.vx); }
            if (p.x > dhi) { p.x = dhi; p.vx = -Math.abs(p.vx); }
            if (p.y < ylo) { p.y = ylo; p.vy = Math.abs(p.vy); }
            if (p.y > yhi) { p.y = yhi; p.vy = -Math.abs(p.vy); }
          } else if (boundary === 'wrap') {
            const rngX = dhi - dlo, rngY = yhi - ylo;
            if (p.x < dlo) p.x += rngX; if (p.x > dhi) p.x -= rngX;
            if (p.y < ylo) p.y += rngY; if (p.y > yhi) p.y -= rngY;
          }
        });
        state.iteration++;
        // stagnation
        const curBest = state.gbestF;
        if (Math.abs(curBest - state.prevGBestF) < 1e-8) state.stagnation++;
        else state.stagnation = 0;
        state.prevGBestF = curBest;
        state.convergence.push(state.minimize
          ? (state.gbestF === Infinity ? null : state.gbestF)
          : (state.gbestF === -Infinity ? null : state.gbestF));
        const maxIter = parseInt(maxIterEl ? maxIterEl.value : 80);
        state.substep = (state.iteration >= maxIter) ? 'done' : 'eval';
        break;

      case 'done':
        stopAnim();
        break;
    }

    updateUI();
    render();
  }

  /* ── UI stats update ── */
  function updateUI() {
    if (statIteration)  statIteration.textContent  = state.iteration;
    if (statSubstep)    statSubstep.textContent     = SUBSTEP_NAMES[state.substep] || state.substep;
    if (statGBestPos)   statGBestPos.textContent    = state.gbest
      ? `(${state.gbest.x.toFixed(3)}, ${state.gbest.y.toFixed(3)})` : '(—, —)';
    if (statGBestVal) {
      statGBestVal.textContent = (state.gbestF === Infinity || state.gbestF === -Infinity)
        ? '—' : state.gbestF.toFixed(5);
    }
    if (statStagnation) statStagnation.textContent = state.stagnation + ' iters';

    if (state.particles.length > 0) {
      const fits  = state.particles.map(p => p.f).filter(f => f !== undefined && isFinite(f));
      const vels  = state.particles.map(p => Math.sqrt(p.vx**2 + p.vy**2));
      if (statAvgFit && fits.length)
        statAvgFit.textContent = (fits.reduce((a,b)=>a+b,0)/fits.length).toFixed(4);
      if (statAvgVel)
        statAvgVel.textContent = (vels.reduce((a,b)=>a+b,0)/vels.length).toFixed(4);
    }

    const maxIter = parseInt(maxIterEl ? maxIterEl.value : 80);
    const pct = maxIter > 0 ? (state.iteration / maxIter * 100) : 0;
    if (progressFill) progressFill.style.width = Math.min(100, pct) + '%';

    // explanation box
    if (explanation) {
      const badge = explanation.querySelector('.step-badge');
      const title = explanation.querySelector('.step-title');
      const desc  = explanation.querySelector('.step-desc');
      if (badge) badge.textContent = SUBSTEP_NAMES[state.substep] || state.substep;
      if (title) {
        const gf = (state.gbestF === Infinity || state.gbestF === -Infinity) ? '—' : state.gbestF.toFixed(5);
        title.textContent = `Iter ${state.iteration} | gBest f = ${gf}`;
      }
      if (desc) desc.textContent = SUBSTEP_DESC[state.substep] || '';
    }

    // particle table
    if (state.activeTab === 'particles' && tableBody) {
      tableBody.innerHTML = state.particles.map((p, i) => `
        <tr class="${p.isGbest ? 'gbest-row' : ''}">
          <td>${i+1}${p.isGbest ? ' ⭐' : ''}</td>
          <td>${p.x.toFixed(4)}</td>
          <td>${p.y.toFixed(4)}</td>
          <td>${p.vx.toFixed(4)}</td>
          <td>${p.vy.toFixed(4)}</td>
          <td>${p.f !== undefined ? p.f.toFixed(4) : '—'}</td>
          <td>${p.pbf !== Infinity && p.pbf !== -Infinity ? p.pbf.toFixed(4) : '—'}</td>
        </tr>`
      ).join('');
    }
  }

  /* ── Render ── */
  function render() {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (state.activeTab === 'contour') {
      drawHeatmap();
      drawParticles();
      drawShockwaves();
    } else if (state.activeTab === 'convergence') {
      drawConvergence();
    }
    ctx.restore();
    // particle table is DOM-only
  }

  function drawParticles() {
    if (!state.particles.length) return;

    // trails
    state.particles.forEach(p => {
      if (p.trail.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(xToCanvas(p.trail[0].x), yToCanvas(p.trail[0].y));
      p.trail.forEach(t => ctx.lineTo(xToCanvas(t.x), yToCanvas(t.y)));
      ctx.strokeStyle = p.isGbest ? 'rgba(255,200,80,0.35)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = p.isGbest ? 1.5 : 0.8;
      ctx.stroke();
    });

    // velocity arrows
    state.particles.forEach(p => {
      const cx = xToCanvas(p.x), cy = yToCanvas(p.y);
      const dx = p.vx ? xToCanvas(p.x + p.vx) - cx : 0;
      const dy = p.vy ? yToCanvas(p.y + p.vy) - cy : 0;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len > 2) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx*0.4, cy + dy*0.4);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    });

    // pbest markers
    state.particles.forEach(p => {
      if (p.pbf === Infinity || p.pbf === -Infinity) return;
      const cx = xToCanvas(p.pbx), cy = yToCanvas(p.pby);
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(66,165,245,0.5)';
      ctx.lineWidth = 1; ctx.stroke();
    });

    // particles
    state.particles.forEach(p => {
      const cx = xToCanvas(p.x), cy = yToCanvas(p.y);
      if (p.isGbest) {
        // glow ring
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
        g.addColorStop(0, 'rgba(255,220,80,0.5)');
        g.addColorStop(1, 'rgba(255,220,80,0)');
        ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // main dot
        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2);
        ctx.fillStyle = '#ffe066'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,160,80,0.9)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
    });

    // gbest star
    if (state.gbest) {
      const gx = xToCanvas(state.gbest.x), gy = yToCanvas(state.gbest.y);
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', gx, gy - 18);

      // label
      ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,224,80,0.9)';
      ctx.fillText(`gBest: (${state.gbest.x.toFixed(2)}, ${state.gbest.y.toFixed(2)})`, gx + 10, gy - 10);
    }

    // axis labels
    ctx.font = '10px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left';   ctx.fillText(`x: ${(state.heatmap?.dlo || -5).toFixed(0)}`, 4, H-4);
    ctx.textAlign = 'right';  ctx.fillText(`${(state.heatmap?.dhi || 5).toFixed(0)}`, W-4, H-4);
    ctx.textAlign = 'center'; ctx.fillText(`y: ${(state.heatmap?.yhi || 5).toFixed(0)}`, 10, 14);
    ctx.fillText(`${(state.heatmap?.ylo || -5).toFixed(0)}`, 10, H-4);
  }

  function drawShockwaves() {
    state.shockwaves.forEach(sw => {
      ctx.beginPath();
      ctx.arc(sw.cx, sw.cy, sw.r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(255,220,80,${sw.alpha})`;
      ctx.lineWidth = 2; ctx.stroke();
      sw.r += 2.5; sw.alpha *= 0.88;
    });
    state.shockwaves = state.shockwaves.filter(sw => sw.alpha > 0.02);
  }

  function drawConvergence() {
    const data = state.convergence.filter(v => v !== null);
    if (data.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Run at least one iteration to see convergence.', W/2, H/2);
      return;
    }
    ctx.fillStyle = '#0d0f14'; ctx.fillRect(0, 0, W, H);

    const pad = { t: 30, r: 20, b: 50, l: 70 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
    let mn = Math.min(...data), mx = Math.max(...data);
    if (mn === mx) { mn -= 1; mx += 1; }

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.t + i * cH / 5;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke();
      const val = mx - i*(mx-mn)/5;
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(2), pad.l - 6, y + 4);
    }

    // data line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad.l + (i / (data.length-1)) * cW;
      const y = pad.t + (1 - (v - mn)/(mx - mn)) * cH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'var(--pso-primary, #ff7043)'; ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round'; ctx.stroke();

    // fill under curve
    ctx.lineTo(pad.l + cW, pad.t + cH); ctx.lineTo(pad.l, pad.t + cH); ctx.closePath();
    ctx.fillStyle = 'rgba(255,112,67,0.08)'; ctx.fill();

    // axes labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Iteration', pad.l + cW/2, H - 8);
    ctx.save(); ctx.translate(14, pad.t + cH/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('gBest f(x,y)', 0, 0); ctx.restore();
    ctx.fillText(`Iter: 0`, pad.l, pad.t + cH + 20);
    ctx.fillText(`Iter: ${data.length}`, pad.l + cW, pad.t + cH + 20);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Convergence — gBest over ${data.length} iterations`, W/2, 16);
  }

  /* ── Animation loop ── */
  function getSpeedDelay() {
    const spd = speedEl ? parseInt(speedEl.value) : 5;
    return Math.round(600 / spd);
  }
  function startAnim() {
    if (state.running) return;
    if (state.substep === 'done' || state.substep === 'init') {
      if (state.particles.length === 0) resetSwarm();
      if (state.substep === 'init') doSubstep(); // move to eval
    }
    state.running = true;
    function tick() {
      if (!state.running) return;
      doSubstep();
      if (state.substep !== 'done') {
        state.intervalId = setTimeout(tick, getSpeedDelay());
      }
    }
    tick();
  }
  function stopAnim() {
    state.running = false;
    clearTimeout(state.intervalId);
  }
  function resetSwarm() {
    stopAnim();
    if (!setupFunction()) return;
    buildHeatmap();
    heatmapDirty = true;
    heatmapImageCache = null;
    initSwarm();
  }

  /* ── Control buttons ── */
  if (playBtn)  playBtn.addEventListener('click',  startAnim);
  if (pauseBtn) pauseBtn.addEventListener('click', stopAnim);
  if (stepBtn)  stepBtn.addEventListener('click', () => {
    stopAnim();
    if (state.particles.length === 0) resetSwarm();
    doSubstep();
  });
  if (resetBtn) resetBtn.addEventListener('click', resetSwarm);
  if (applyBtn) applyBtn.addEventListener('click', resetSwarm);

  /* ── Function / parameter change → reset ── */
  if (funcSelect) funcSelect.addEventListener('change', resetSwarm);
  if (goalMin) goalMin.addEventListener('click', () => {
    state.minimize = true; goalMin.classList.add('active'); goalMax.classList.remove('active');
    heatmapDirty = true; heatmapImageCache = null; buildHeatmap(); render();
  });
  if (goalMax) goalMax.addEventListener('click', () => {
    state.minimize = false; goalMax.classList.add('active'); goalMin.classList.remove('active');
    heatmapDirty = true; heatmapImageCache = null; buildHeatmap(); render();
  });

  // sliders — live labels
  function bindSlider(el, valId, scale, digits) {
    if (!el) return;
    const valEl = document.getElementById(valId);
    el.addEventListener('input', () => {
      if (valEl) valEl.textContent = (el.value / scale).toFixed(digits);
    });
  }
  bindSlider(swarmSizeEl, 'swarmSizeVal', 1, 0);
  bindSlider(inertiaEl,   'inertiaVal',   100, 2);
  bindSlider(c1El,        'c1Val',        100, 2);
  bindSlider(c2El,        'c2Val',        100, 2);
  bindSlider(maxIterEl,   'maxIterVal',   1, 0);
  bindSlider(speedEl,     'speedVal',     1, 0);

  /* ── Preset buttons ── */
  const PRESETS = {
    explore:  { w: 90, c1: 100, c2: 100 },
    greedy:   { w: 30, c1: 150, c2: 200 },
    balanced: { w: 72, c1: 149, c2: 149 },
    loner:    { w: 70, c1: 200, c2: 0   }
  };
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PRESETS[btn.dataset.preset];
      if (!p) return;
      if (inertiaEl) { inertiaEl.value = p.w;  document.getElementById('inertiaVal').textContent = (p.w/100).toFixed(2); }
      if (c1El)      { c1El.value = p.c1; document.getElementById('c1Val').textContent = (p.c1/100).toFixed(2); }
      if (c2El)      { c2El.value = p.c2; document.getElementById('c2Val').textContent = (p.c2/100).toFixed(2); }
    });
  });

  /* ── Tabs ── */
  document.querySelectorAll('.viz-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.viz-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeTab = tab.dataset.tab;
      const showCanvas = state.activeTab !== 'particles';
      canvas.style.display = showCanvas ? '' : 'none';
      if (tableWrap) tableWrap.style.display = state.activeTab === 'particles' ? 'block' : 'none';
      updateUI(); render();
    });
  });

  /* ── Click-to-spawn ── */
  canvas.addEventListener('click', e => {
    if (!state.heatmap || state.particles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const x = canvasToX(cx), y = canvasToY(cy);
    const [dlo, dhi] = state.domain;
    const ylo = state.domainY ? state.domainY[0] : dlo;
    const yhi = state.domainY ? state.domainY[1] : dhi;
    const velScale = (dhi - dlo) * 0.05;
    state.particles.push({
      x, y, vx: rnd(-velScale, velScale), vy: rnd(-velScale, velScale),
      pbx: x, pby: y, pbf: Infinity, trail: [], isGbest: false
    });
    render();
  });

  /* ── Initial load ── */
  resetSwarm();

})(); // end PSO engine IIFE

/* ───────────────────────────────────────────────────────
   SECTION H: QUIZ
   ─────────────────────────────────────────────────────── */
(function initQuiz() {
  const container = document.getElementById('quizContainer');
  if (!container) return;

  const questions = [
    {
      q: 'Which term in the PSO velocity equation represents the particle\'s personal best memory?',
      opts: ['w · vₜ', 'c₁ · r₁ · (pbest − x)', 'c₂ · r₂ · (gbest − x)', 'x + v'],
      ans: 1,
      exp: 'The cognitive term c₁·r₁·(pbest−x) pulls each particle toward its own personal best position — its "memory".'
    },
    {
      q: 'What happens if inertia weight w is set very close to 0?',
      opts: [
        'Particles explore more of the search space',
        'Particles converge quickly but may miss the global optimum',
        'Particles stop moving entirely',
        'The algorithm becomes gradient descent'
      ],
      ans: 1,
      exp: 'Very low w kills momentum, so particles brake hard and exploit their immediate neighbourhood — good for fine-tuning but risky if the swarm hasn\'t found the right region yet.'
    },
    {
      q: 'PSO is called a "gradient-free" method. What does this mean?',
      opts: [
        'It computes f\'(x) numerically instead of analytically',
        'It never evaluates the objective function',
        'It does not need derivatives — just function evaluations f(x)',
        'It only works on linear functions'
      ],
      ans: 2,
      exp: 'PSO only needs to evaluate f(xᵢ) at each particle\'s current position. No derivative or gradient information is required, making it applicable to non-differentiable or black-box functions.'
    },
    {
      q: 'What is "gbest" in the standard PSO formulation?',
      opts: [
        'The particle with the highest velocity',
        'The best position ever found by any particle in the swarm',
        'The centroid of all particle positions',
        'The particle positioned at the domain centre'
      ],
      ans: 1,
      exp: 'gbest is the global best — the best position (with best fitness) that any particle in the entire swarm has ever visited. All particles are attracted toward it via the social term.'
    },
    {
      q: 'The Rastrigin function is used as a benchmark because:',
      opts: [
        'It has only one minimum and is easy to solve',
        'It is differentiable everywhere and convex',
        'It has many local minima arranged in a grid, testing the swarm\'s ability to avoid traps',
        'It models a realistic engineering cost function'
      ],
      ans: 2,
      exp: 'Rastrigin adds a cosine wave to a sphere function, creating ~100 local minima on a regular grid. It tests whether the swarm can cooperate to skip local traps and converge at the global minimum at the origin.'
    },
    {
      q: 'Why are r₁ and r₂ drawn randomly at each step?',
      opts: [
        'To simulate measurement noise in the objective function',
        'To ensure r₁ + r₂ = 1 always',
        'To add stochastic diversity so particles don\'t fly rigid straight lines',
        'They are not random — they are fixed constants'
      ],
      ans: 2,
      exp: 'Fresh uniform random values every iteration vary the strength of each pull, preventing particles from following perfectly predictable paths. This diversity helps the swarm explore and avoids premature convergence.'
    },
    {
      q: 'Which boundary strategy reflects a particle\'s velocity when it hits the edge?',
      opts: ['Clamp', 'Wrap (Torus)', 'Bounce / Reflect', 'Ignore (let it leave)'],
      ans: 2,
      exp: 'The "Bounce" strategy reverses the velocity component that caused the boundary violation — like a billiard ball. Clamp simply stops the particle at the boundary, and Wrap teleports it to the opposite side.'
    }
  ];

  if (window.QuizRunner) {
    window.QuizRunner.init('#quizContainer', questions);
    return;
  }

  // Fallback: render quiz manually
  let score = 0, answered = 0;
  container.innerHTML = '<div class="quiz-container">' +
    questions.map((q, qi) => `
      <div class="quiz-card" id="qcard${qi}">
        <div class="quiz-q">${qi+1}. ${q.q}</div>
        <div class="quiz-options">
          ${q.opts.map((opt, oi) => `
            <div class="quiz-option" data-qi="${qi}" data-oi="${oi}">${opt}</div>
          `).join('')}
        </div>
        <div class="quiz-feedback" id="qfb${qi}" style="display:none;"></div>
      </div>
    `).join('') +
    '<div id="quizScore"></div>' +
  '</div>';

  container.querySelectorAll('.quiz-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const qi = parseInt(opt.dataset.qi), oi = parseInt(opt.dataset.oi);
      const card = document.getElementById(`qcard${qi}`);
      if (card.classList.contains('answered')) return;
      card.classList.add('answered');
      answered++;
      const q = questions[qi];
      const isCorrect = oi === q.ans;
      if (isCorrect) { score++; card.classList.add('correct'); opt.classList.add('correct'); }
      else {
        card.classList.add('wrong');
        opt.classList.add('wrong');
        card.querySelectorAll('.quiz-option')[q.ans].classList.add('correct');
      }
      card.querySelectorAll('.quiz-option').forEach(o => o.classList.add('disabled'));
      const fb = document.getElementById(`qfb${qi}`);
      fb.style.display = 'block';
      fb.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`;
      fb.textContent = (isCorrect ? '✓ Correct! ' : '✗ Not quite. ') + q.exp;

      if (answered === questions.length) {
        const scoreEl = document.getElementById('quizScore');
        const pct = Math.round(score / questions.length * 100);
        const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚';
        scoreEl.style.display = 'block';
        scoreEl.innerHTML = `${emoji} You scored <strong>${score} / ${questions.length}</strong> (${pct}%)
          <br><small style="color:var(--text-secondary)">
          ${pct >= 80 ? 'Excellent! You have a solid grasp of PSO.' :
            pct >= 60 ? 'Good work! Review the concept cards above to reinforce the rest.' :
            'Keep studying — scroll back up and re-read the equation and algorithm sections.'}
          </small>`;
      }
    });
  });
})();
