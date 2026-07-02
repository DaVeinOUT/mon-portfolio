/* ============================================================
   PORTFOLIO V3 — dark fibre
   Réseau 3D projeté à la main, cartes vivantes, animations scroll.
   100% vanilla, zéro dépendance.
   ============================================================ */
'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ── Registre d'animations : ne tourne que si visible + onglet actif ── */
const engines = [];

function registerEngine(el, frameFn) {
  const eng = { el, frameFn, inView: false, raf: 0, last: 0 };
  const tick = ts => {
    eng.frameFn(ts);
    eng.raf = requestAnimationFrame(tick);
  };
  eng.update = () => {
    const shouldRun = eng.inView && !document.hidden && !REDUCED;
    if (shouldRun && !eng.raf) eng.raf = requestAnimationFrame(tick);
    if (!shouldRun && eng.raf) { cancelAnimationFrame(eng.raf); eng.raf = 0; }
  };
  new IntersectionObserver(entries => {
    eng.inView = entries[0].isIntersecting;
    eng.update();
  }, { rootMargin: '60px' }).observe(el);
  engines.push(eng);
  return eng;
}

document.addEventListener('visibilitychange', () => engines.forEach(e => e.update()));

/* ── Utilitaires canvas ── */
function fitCanvas(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * DPR);
  canvas.height = Math.round(h * DPR);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  return { ctx, w, h };
}

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   1. FOOTER + NAV MOBILE
   ============================================================ */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const burger = document.getElementById('nav-burger');
const navLinks = document.getElementById('nav-links');
if (burger && navLinks) {
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    })
  );
}

/* ============================================================
   2. REVEAL DES SECTIONS
   ============================================================ */
if (!REDUCED && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

/* ============================================================
   3. HERO — RÉSEAU FIBRE 3D
   Projection perspective calculée à la main (aucune librairie).
   ============================================================ */
(function heroNetwork() {
  const canvas = document.getElementById('net-canvas');
  if (!canvas) return;

  let ctx, W, H, CX, CY, R, pts, edges, pulses, rotY;
  const F = 480;
  let mx = 0, my = 0, tmx = 0, tmy = 0;

  function build() {
    ({ ctx, w: W, h: H } = fitCanvas(canvas));
    const mobile = W < 720;
    CX = W * (mobile ? 0.5 : 0.66);
    CY = H * (mobile ? 0.34 : 0.46);
    R = Math.min(W, H) * (mobile ? 0.36 : 0.42);
    const N = mobile ? 70 : 110;
    const rnd = mulberry(1337);

    pts = [];
    for (let i = 0; i < N; i++) {
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      const r = R * (0.55 + 0.45 * rnd());
      pts.push({
        x: r * Math.sin(ph) * Math.cos(th),
        y: r * Math.sin(ph) * Math.sin(th) * 0.75,
        z: r * Math.cos(ph),
      });
    }

    /* Les distances 3D ne changent pas avec la rotation : arêtes précalculées une seule fois. */
    edges = [];
    const TH2 = (R * 0.42) ** 2;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = pts[i], b = pts[j];
      const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (d2 < TH2) edges.push({ i, j, w: 1 - d2 / TH2 });
    }
    pulses = [];
    rotY = 0.4;
  }

  function project(rotX) {
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    return pts.map(pt => {
      const x1 = pt.x * cy - pt.z * sy;
      const z1 = pt.x * sy + pt.z * cy;
      const y1 = pt.y * cx - z1 * sx;
      const z2 = pt.y * sx + z1 * cx;
      const s = F / (F + z2);
      return { x: CX + x1 * s, y: CY + y1 * s, s };
    });
  }

  function draw() {
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    rotY += 0.0022 + mx * 0.0006;
    ctx.clearRect(0, 0, W, H);
    const p = project(my * 0.35);

    ctx.lineWidth = 1;
    for (const e of edges) {
      const a = p[e.i], b = p[e.j];
      const alpha = e.w * 0.42 * Math.min(a.s, b.s);
      ctx.strokeStyle = `rgba(232,197,106,${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    if (pulses.length < 8 && Math.random() < 0.07 && edges.length) {
      const e = edges[(Math.random() * edges.length) | 0];
      pulses.push({ e, t: 0, sp: 0.011 + Math.random() * 0.02 });
    }
    pulses = pulses.filter(pl => (pl.t += pl.sp) < 1);
    for (const pl of pulses) {
      const a = p[pl.e.i], b = p[pl.e.j];
      const x = a.x + (b.x - a.x) * pl.t;
      const y = a.y + (b.y - a.y) * pl.t;
      const fade = Math.sin(pl.t * Math.PI);
      ctx.shadowColor = '#5ef0b0';
      ctx.shadowBlur = 10 * fade;
      ctx.fillStyle = `rgba(94,240,176,${(0.95 * fade).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(x, y, 2.3, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const n of p) {
      ctx.fillStyle = `rgba(232,197,106,${(0.8 * n.s).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.6 * n.s, 0, 7); ctx.fill();
    }
  }

  build();
  if (REDUCED) { draw(); }
  else {
    registerEngine(canvas, draw);
    window.addEventListener('pointermove', e => {
      tmx = e.clientX / window.innerWidth - 0.5;
      tmy = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { build(); if (REDUCED) draw(); }, 150);
  });
})();

/* ============================================================
   4. TIMELINE — se dessine au scroll
   ============================================================ */
(function timelines() {
  const tls = document.querySelectorAll('.timeline');
  if (!tls.length || REDUCED) return;
  let ticking = false;

  function update() {
    ticking = false;
    const trigger = window.innerHeight * 0.78;
    tls.forEach(tl => {
      const r = tl.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (trigger - r.top) / r.height));
      tl.style.setProperty('--p', prog.toFixed(3));
      tl.querySelectorAll('li').forEach(li => {
        li.classList.toggle('passed', li.getBoundingClientRect().top < trigger);
      });
    });
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* ============================================================
   5. COMPTEURS
   ============================================================ */
(function counters() {
  const nums = document.querySelectorAll('.stat-n[data-count]');
  if (!nums.length) return;
  if (REDUCED) { nums.forEach(n => n.textContent = n.dataset.count); return; }

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const target = +en.target.dataset.count;
      const t0 = performance.now();
      (function step(ts) {
        const k = Math.min(1, (ts - t0) / 950);
        en.target.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.6 });
  nums.forEach(n => io.observe(n));
})();

/* ============================================================
   6. CARTES PROJETS VIVANTES
   ============================================================ */
(function projectViz() {
  document.querySelectorAll('.proj-viz canvas').forEach(canvas => {
    const kind = canvas.dataset.viz;
    let state = null;

    function frame(ts) {
      if (!state || state.w !== canvas.clientWidth) state = init();
      VIZ[kind](state, ts);
    }

    function init() {
      const { ctx, w, h } = fitCanvas(canvas);
      const s = { ctx, w, h, t0: performance.now() };
      if (kind === 'sort') {
        s.vals = Array.from({ length: 16 }, (_, i) => i + 1);
        shuffle(s.vals);
        s.gen = bubble(s.vals);
        s.cur = null; s.next = 0; s.done = 0;
      }
      if (kind === 'radar') { s.angle = 0; s.pings = []; s.first = true; }
      if (kind === 'term') { s.li = 0; s.ch = 0; s.lines = []; s.wait = 0; }
      return s;
    }

    if (REDUCED) {
      state = init();
      VIZ[kind](state, performance.now(), true);
    } else {
      registerEngine(canvas, frame);
    }
  });

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function* bubble(a) {
    for (let n = a.length; n > 1; n--) {
      for (let i = 0; i < n - 1; i++) {
        if (a[i] > a[i + 1]) [a[i], a[i + 1]] = [a[i + 1], a[i]];
        yield i;
      }
    }
  }

  const GOLD = '#e8c56a', GREEN = '#5ef0b0', DIM = 'rgba(242,238,228,.32)';

  const VIZ = {
    /* ── Mini tri à bulles ── */
    sort(s, ts, still) {
      const { ctx, w, h } = s;
      if (!still && ts > s.next) {
        s.next = ts + 85;
        if (s.done && ts > s.done) { shuffle(s.vals); s.gen = bubble(s.vals); s.done = 0; }
        else if (!s.done) {
          const r = s.gen.next();
          if (r.done) { s.cur = null; s.done = ts + 1100; }
          else s.cur = r.value;
        }
      }
      ctx.clearRect(0, 0, w, h);
      const n = s.vals.length, bw = (w - 32) / n;
      s.vals.forEach((v, i) => {
        const bh = (v / n) * (h - 34);
        const active = s.cur !== null && (i === s.cur || i === s.cur + 1);
        ctx.fillStyle = s.done ? GREEN : active ? GREEN : GOLD;
        ctx.globalAlpha = s.done || active ? 0.95 : 0.55;
        ctx.fillRect(16 + i * bw + 1, h - 17 - bh, bw - 2, bh);
      });
      ctx.globalAlpha = 1;
    },

    /* ── Mini radar à pings ── */
    radar(s, ts, still) {
      const { ctx, w, h } = s;
      const cx = w / 2, cy = h * 0.56, r = h * 0.46;
      if (s.first || still) { ctx.fillStyle = '#101014'; ctx.fillRect(0, 0, w, h); s.first = false; }
      ctx.fillStyle = 'rgba(16,16,20,.13)';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(232,197,106,.14)';
      ctx.lineWidth = 1;
      [0.4, 0.7, 1].forEach(k => {
        ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 7); ctx.stroke();
      });

      s.angle += still ? 0 : 0.024;
      ctx.strokeStyle = GREEN;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(s.angle) * r, cy + Math.sin(s.angle) * r);
      ctx.stroke();

      if (!still && Math.random() < 0.025 && s.pings.length < 5) {
        const a = Math.random() * 7, d = r * (0.25 + Math.random() * 0.7);
        s.pings.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, l: 1 });
      }
      s.pings = s.pings.filter(p => (p.l -= 0.012) > 0);
      s.pings.forEach(p => {
        ctx.fillStyle = `rgba(94,240,176,${p.l.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(94,240,176,${(p.l * 0.4).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 + (1 - p.l) * 10, 0, 7); ctx.stroke();
      });
    },

    /* ── Mini terminal qui tape ── */
    term(s, ts, still) {
      const { ctx, w, h } = s;
      const SCRIPT = [
        ['$ ', 'whoami', GOLD],
        ['  ', 'Technicien IT — Paris', DIM],
        ['$ ', 'sudo hire davidson', GOLD],
        ['  ', 'dispo immédiatement ✓', GREEN],
        ['$ ', 'exit', GOLD],
      ];
      if (!still && ts > s.wait) {
        s.wait = ts + 46;
        const [, txt] = SCRIPT[s.li];
        if (s.ch < txt.length) s.ch++;
        else { s.wait = ts + 750; s.lines.push(s.li); s.li = (s.li + 1) % SCRIPT.length; s.ch = 0; if (s.li === 0) s.lines = []; }
      }
      if (still) { s.lines = [0, 1, 2]; s.li = 3; s.ch = SCRIPT[3][1].length; }
      ctx.clearRect(0, 0, w, h);
      ctx.font = '11.5px "JetBrains Mono", monospace';
      const shown = [...s.lines.slice(-3), s.li];
      shown.forEach((idx, row) => {
        const [pre, txt, col] = SCRIPT[idx];
        const full = idx === s.li ? txt.slice(0, s.ch) : txt;
        const y = 26 + row * 20;
        ctx.fillStyle = 'rgba(94,240,176,.8)';
        ctx.fillText(pre, 16, y);
        ctx.fillStyle = col;
        ctx.fillText(full, 16 + ctx.measureText(pre).width, y);
        if (idx === s.li && Math.floor(ts / 450) % 2 === 0) {
          const cw = ctx.measureText(pre + full).width;
          ctx.fillStyle = GOLD;
          ctx.fillRect(18 + cw, y - 9, 6, 11);
        }
      });
    },
  };
})();

/* ============================================================
   7. TILT 3D DES CARTES
   ============================================================ */
if (FINE_POINTER && !REDUCED) {
  document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const xn = (e.clientX - r.left) / r.width - 0.5;
      const yn = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(750px) rotateX(${(-yn * 5).toFixed(2)}deg) rotateY(${(xn * 6).toFixed(2)}deg) translateY(-3px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ============================================================
   8. BOUTONS MAGNÉTIQUES
   ============================================================ */
if (FINE_POINTER && !REDUCED) {
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.18;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}

/* ============================================================
   9. TRANSITION BOOT → TERMINAL
   ============================================================ */
(function bootTransition() {
  const overlay = document.getElementById('boot');
  const textEl = document.getElementById('boot-text');
  if (!overlay || !textEl) return;

  document.querySelectorAll('.to-terminal').forEach(link => {
    link.addEventListener('click', e => {
      if (REDUCED) return;
      e.preventDefault();
      const dest = link.getAttribute('href');
      overlay.classList.add('on');
      const cmd = 'boot --terminal';
      let i = 0;
      const type = setInterval(() => {
        textEl.textContent = cmd.slice(0, ++i);
        if (i >= cmd.length) {
          clearInterval(type);
          setTimeout(() => { window.location.href = dest; }, 380);
        }
      }, 34);
    });
  });
})();

/* ── Clin d'œil console ── */
console.log(
  '%c davidson@portfolio:~$ %c Le réseau 3D ? ~200 lignes de projection perspective, zéro lib. Code sur github.com/DaVeinOUT 👀',
  'background:#0a0a0d;color:#e8c56a;padding:4px 8px;border-radius:4px;font-family:monospace',
  'color:#9a948a;font-family:monospace'
);
