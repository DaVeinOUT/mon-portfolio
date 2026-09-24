/* ============================================================
   PORTFOLIO V5 · interactions UI
   (la scène 3D vit dans scene.js, chargée en différé)
   ============================================================ */
'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ── Registre d'animations 2D : ne tourne que si visible ── */
const engines = [];

function registerEngine(el, frameFn) {
  const eng = { el, frameFn, inView: false, raf: 0 };
  const tick = ts => { eng.frameFn(ts); eng.raf = requestAnimationFrame(tick); };
  eng.update = () => {
    const run = eng.inView && !document.hidden && !REDUCED;
    if (run && !eng.raf) eng.raf = requestAnimationFrame(tick);
    if (!run && eng.raf) { cancelAnimationFrame(eng.raf); eng.raf = 0; }
  };
  new IntersectionObserver(entries => {
    eng.inView = entries[0].isIntersecting;
    eng.update();
  }, { rootMargin: '60px' }).observe(el);
  engines.push(eng);
}
document.addEventListener('visibilitychange', () => engines.forEach(e => e.update()));

function fitCanvas(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * DPR);
  canvas.height = Math.round(h * DPR);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  return { ctx, w, h };
}

/* ============================================================
   1. NAV + FOOTER + DOTS
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

(function dots() {
  const links = document.querySelectorAll('#dots a');
  const stations = document.querySelectorAll('.station');
  if (!links.length || !stations.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const idx = [...stations].indexOf(en.target);
      links.forEach((l, i) => l.classList.toggle('active', i === idx));
    });
  }, { rootMargin: '-45% 0px -45%', threshold: 0 });
  stations.forEach(s => io.observe(s));
})();

/* ============================================================
   2. VERSION RAPIDE · un écran, zéro spectacle
   ============================================================ */
(function fastMode() {
  const btn = document.getElementById('fast-btn');
  const sec = document.getElementById('fast');
  const exitBtn = document.getElementById('fast-exit');
  if (!btn || !sec) return;

  function enter() {
    document.body.classList.add('fast');
    sec.hidden = false;
    btn.setAttribute('aria-pressed', 'true');
    try { history.replaceState(null, '', '#rapide'); } catch (e) {}
    window.scrollTo(0, 0);
    const h = sec.querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function exit() {
    document.body.classList.remove('fast');
    sec.hidden = true;
    btn.setAttribute('aria-pressed', 'false');
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', () =>
    btn.getAttribute('aria-pressed') === 'true' ? exit() : enter()
  );
  if (exitBtn) exitBtn.addEventListener('click', exit);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('fast')) exit();
  });

  /* Lien direct #rapide pour un recruteur pressé */
  if (location.hash === '#rapide') enter();
})();

/* ============================================================
   3. REVEALS
   ============================================================ */
if (!REDUCED && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

/* ============================================================
   4. TYPO CINÉTIQUE · rects mis en cache, plus un getBoundingClientRect
      par lettre et par pointermove
   ============================================================ */
(function kineticName() {
  const h1 = document.getElementById('kinetic-name');
  if (!h1 || REDUCED) return;

  const frag = document.createDocumentFragment();
  h1.childNodes.forEach(node => {
    if (node.nodeType === 3) {
      for (const ch of node.textContent) {
        if (ch.trim() === '') { frag.appendChild(document.createTextNode(ch)); continue; }
        const s = document.createElement('span');
        s.className = 'kl';
        s.textContent = ch;
        frag.appendChild(s);
      }
    } else {
      frag.appendChild(node.cloneNode(false));
    }
  });
  h1.innerHTML = '';
  h1.appendChild(frag);

  if (!FINE_POINTER) return;
  const letters = [...h1.querySelectorAll('.kl')];
  let cache = [], dirty = true, near = false;

  const invalidate = () => { dirty = true; };
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('resize', invalidate);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(invalidate);

  window.addEventListener('pointermove', e => {
    if (!near) {
      const hr = h1.getBoundingClientRect();
      near = e.clientY > hr.top - 220 && e.clientY < hr.bottom + 220;
      if (!near) return;
    }
    if (dirty) {
      cache = letters.map(l => l.getBoundingClientRect());
      dirty = false;
    }
    for (let i = 0; i < letters.length; i++) {
      const lr = cache[i];
      if (!lr) continue;
      const dx = e.clientX - (lr.left + lr.width / 2);
      const dy = e.clientY - (lr.top + lr.height / 2);
      const d = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - d / 240);
      const l = letters[i];
      if (f <= 0.01) { if (l.style.transform) { l.style.transform = ''; l.style.color = ''; } continue; }
      l.style.transform = `translate(${(-dx * f * 0.12).toFixed(1)}px, ${(-dy * f * 0.16).toFixed(1)}px)`;
      l.style.color = f > 0.55 ? 'var(--gold)' : '';
    }
    /* hors zone : on rend le cache périmé et on repartira vite */
    const hr2 = h1.getBoundingClientRect();
    if (e.clientY < hr2.top - 260 || e.clientY > hr2.bottom + 260) {
      near = false;
      letters.forEach(l => { l.style.transform = ''; l.style.color = ''; });
    }
  }, { passive: true });
})();

/* ============================================================
   5. CARTES PROJETS VIVANTES
   ============================================================ */
(function projectViz() {
  /* roundRect : polyfill pour les vieux Safari (< 16) */
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }
  const GOLD = '#e8c56a', GREEN = '#5ef0b0', PALE = '#f2eee4',
        RED = '#f76a6a';

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  const VIZ = {
    /* Uptime : une ligne de monitors, presque tout vert, un dip rare */
    uptime(s, ts, still) {
      const { ctx, w, h } = s;
      if (!s.bars) {
        s.bars = Array.from({ length: 26 }, () => 0.78 + Math.random() * 0.22);
        s.next = 0;
      }
      if (!still && ts > s.next) {
        s.next = ts + 190;
        s.bars.shift();
        if (s.fault > 0) { s.bars.push(0.32); s.fault--; }
        else if (Math.random() < 0.06) { s.bars.push(0.32); s.fault = 1; }
        else s.bars.push(0.78 + Math.random() * 0.22);
      }
      ctx.clearRect(0, 0, w, h);
      const n = s.bars.length, bw = (w - 36) / n, base = h - 22;
      ctx.strokeStyle = 'rgba(242,238,228,.12)';
      ctx.beginPath(); ctx.moveTo(18, base); ctx.lineTo(w - 18, base); ctx.stroke();
      s.bars.forEach((v, i) => {
        const bh = v * (h - 44);
        ctx.fillStyle = v < 0.5 ? RED : GREEN;
        ctx.globalAlpha = v < 0.5 ? 0.95 : 0.55 + v * 0.4;
        const x = 18 + i * bw;
        ctx.beginPath();
        ctx.roundRect(x + 1, base - bh, Math.max(2, bw - 3), bh, 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    },

    /* SecDash : heatmap de clients, un scan qui balaie, des découvertes en rouge */
    secdash(s, ts, still) {
      const { ctx, w, h } = s;
      if (s.col === undefined) { s.col = 0; s.findings = new Set(); s.next = 0; }
      if (!still && ts > s.next) {
        s.next = ts + 130;
        s.col = (s.col + 1) % 10;
        if (Math.random() < 0.08) {
          const r = (Math.random() * 3) | 0, c = (Math.random() * 10) | 0;
          s.findings.add(r + ',' + c);
          setTimeout(() => s.findings.delete(r + ',' + c), 4200);
        }
      }
      ctx.clearRect(0, 0, w, h);
      const gx = (w - 24) / 10, gy = (h - 20) / 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 10; c++) {
          const key = r + ',' + c;
          const x = 12 + c * gx, y = 10 + r * gy;
          ctx.fillStyle = s.findings.has(key) ? RED : 'rgba(94,240,176,.16)';
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, gx - 5, gy - 5, 3);
          ctx.fill();
        }
      }
      /* colonne de scan */
      const sx = 12 + s.col * gx;
      ctx.fillStyle = 'rgba(232,197,106,.10)';
      ctx.fillRect(sx, 6, gx, h - 12);
      ctx.fillStyle = GOLD;
      ctx.fillRect(sx + 1, 6, 1.5, h - 12);
    },

    /* Radar : recherche de médecin, ping des disponibilités */
    radar(s, ts, still) {
      const { ctx, w, h } = s;
      const cx = w / 2, cy = h * 0.56, r = h * 0.46;
      if (s.first || still) { ctx.fillStyle = '#101014'; ctx.fillRect(0, 0, w, h); s.first = false; }
      ctx.fillStyle = 'rgba(16,16,20,.13)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(232,197,106,.14)';
      ctx.lineWidth = 1;
      [0.4, 0.7, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 7); ctx.stroke(); });
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

    /* EDUCA : lettres qui se posent, une qui danse · OpenDyslexic en esprit */
    letters(s, ts, still) {
      const { ctx, w, h } = s;
      const WORD = ['E', 'D', 'U', 'C', 'A'];
      const t = ts / 1000;
      ctx.clearRect(0, 0, w, h);
      const n = WORD.length;
      const cw = w / (n + 1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const dancing = !still && Math.floor(t / 1.4) % n === i;
        const rot = still ? 0 : Math.sin(t * 1.1 + i * 1.7) * 0.055 + (dancing ? Math.sin(t * 9) * 0.16 : 0);
        const dy = still ? 0 : Math.sin(t * 1.6 + i * 2.1) * 2.6 + (dancing ? -5 : 0);
        ctx.save();
        ctx.translate(cw * (i + 1), h / 2 + dy);
        ctx.rotate(rot);
        ctx.font = `800 ${h * 0.44}px Syne, sans-serif`;
        ctx.fillStyle = i === 3 ? GOLD : PALE;
        ctx.globalAlpha = 0.92;
        ctx.fillText(WORD[i], 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };

  document.querySelectorAll('.proj-viz canvas').forEach(canvas => {
    const kind = canvas.dataset.viz;
    let state = null;

    function init() {
      const { ctx, w, h } = fitCanvas(canvas);
      const s = { ctx, w, h };
      if (kind === 'radar') { s.angle = 0; s.pings = []; s.first = true; }
      return s;
    }

    if (REDUCED) {
      state = init();
      VIZ[kind](state, performance.now(), true);
    } else {
      registerEngine(canvas, ts => {
        if (!state || state.w !== canvas.clientWidth) state = init();
        VIZ[kind](state, ts);
      });
    }
  });
})();

/* ============================================================
   6. TILT + MAGNÉTIQUE
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
   7. TRANSITION BOOT → TERMINAL
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

/* ── Pour les curieux ── */
console.log(
  '%c davidson@portfolio:~$ %c Chaque nœud du réseau est réel : survole, clique. Code sur github.com/DaVeinOUT',
  'background:#0a0a0d;color:#e8c56a;padding:4px 8px;border-radius:4px;font-family:monospace',
  'color:#9a948a;font-family:monospace'
);