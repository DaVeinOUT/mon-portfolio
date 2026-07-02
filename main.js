/* ============================================================
   PORTFOLIO V4 — interactions UI
   (la scène 3D vit dans scene.js)
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
  }, { threshold: 0.45 });
  stations.forEach(s => io.observe(s));
})();

/* ============================================================
   2. REVEALS
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
   3. TYPO CINÉTIQUE — le nom réagit au curseur
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
  const letters = h1.querySelectorAll('.kl');

  window.addEventListener('pointermove', e => {
    const r = h1.getBoundingClientRect();
    if (e.clientY < r.top - 220 || e.clientY > r.bottom + 220) return;
    letters.forEach(l => {
      const lr = l.getBoundingClientRect();
      const dx = e.clientX - (lr.left + lr.width / 2);
      const dy = e.clientY - (lr.top + lr.height / 2);
      const d = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - d / 240);
      if (f <= 0.01) { l.style.transform = ''; l.style.color = ''; return; }
      l.style.transform = `translate(${(-dx * f * 0.12).toFixed(1)}px, ${(-dy * f * 0.16).toFixed(1)}px)`;
      l.style.color = f > 0.55 ? 'var(--gold)' : '';
    });
  }, { passive: true });
})();

/* ============================================================
   4. CARTES PROJETS VIVANTES
   ============================================================ */
(function projectViz() {
  const GOLD = '#e8c56a', GREEN = '#5ef0b0', DIM = 'rgba(242,238,228,.32)';

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
  }
  function* bubble(a) {
    for (let n = a.length; n > 1; n--)
      for (let i = 0; i < n - 1; i++) {
        if (a[i] > a[i + 1]) [a[i], a[i + 1]] = [a[i + 1], a[i]];
        yield i;
      }
  }

  const VIZ = {
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
        ctx.fillStyle = s.done || active ? GREEN : GOLD;
        ctx.globalAlpha = s.done || active ? 0.95 : 0.55;
        ctx.fillRect(16 + i * bw + 1, h - 17 - bh, bw - 2, bh);
      });
      ctx.globalAlpha = 1;
    },

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

    term(s, ts, still) {
      const { ctx, w, h } = s;
      const SCRIPT = [
        ['$ ', 'whoami', GOLD],
        ['  ', 'Technicien IT — Paris', DIM],
        ['$ ', 'sudo hire davidson', GOLD],
        ['  ', 'dispo immédiatement [ok]', GREEN],
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
        const y = 24 + row * 20;
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

  document.querySelectorAll('.proj-viz canvas').forEach(canvas => {
    const kind = canvas.dataset.viz;
    let state = null;

    function init() {
      const { ctx, w, h } = fitCanvas(canvas);
      const s = { ctx, w, h };
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
      registerEngine(canvas, ts => {
        if (!state || state.w !== canvas.clientWidth) state = init();
        VIZ[kind](state, ts);
      });
    }
  });
})();

/* ============================================================
   5. TILT + MAGNÉTIQUE
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
   6. TRANSITION BOOT → TERMINAL
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
  '%c davidson@portfolio:~$ %c La scene 3D est pilotee par le scroll — Three.js + vanilla JS, code sur github.com/DaVeinOUT',
  'background:#0a0a0d;color:#e8c56a;padding:4px 8px;border-radius:4px;font-family:monospace',
  'color:#9a948a;font-family:monospace'
);
