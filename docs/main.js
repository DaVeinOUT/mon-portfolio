/* ============================================================
   TERMINAL PORTFOLIO — main.js
   Dorelus Davidson
   ============================================================ */

'use strict';

/* ── DOM refs ─────────────────────────────────────────────── */
const output     = document.getElementById('terminal-output');
const inputEl    = document.getElementById('terminal-input');
const dropdown   = document.getElementById('autocomplete-dropdown');
const canvas     = document.getElementById('fx-canvas');
const ctx        = canvas.getContext('2d');
const themeLabel = document.getElementById('theme-indicator');

/* ── State ────────────────────────────────────────────────── */
let history      = [];
let histIdx      = -1;
let acIdx        = -1;
let idleTimer    = null;
let idleCount    = 0;
let currentTheme = 'dark';
let matrixActive = false;
let matrixRAF    = null;

/* ── Themes ───────────────────────────────────────────────── */
const THEMES = ['dark', 'light', 'retro', 'glass'];

/* ── Commands registry ────────────────────────────────────── */
const COMMANDS = [
  { cmd: 'help',     desc: 'Affiche toutes les commandes disponibles' },
  { cmd: 'whoami',   desc: 'Informations personnelles' },
  { cmd: 'about',    desc: 'Qui je suis (alias: whoami)' },
  { cmd: 'skills',   desc: 'Mes compétences techniques' },
  { cmd: 'projects', desc: 'Mes expériences professionnelles' },
  { cmd: 'xp',       desc: 'Alias de projects' },
  { cmd: 'contact',  desc: 'Mes coordonnées' },
  { cmd: 'education',desc: 'Ma formation scolaire' },
  { cmd: 'clear',    desc: 'Efface le terminal' },
  { cmd: 'ls',       desc: 'Liste les sections disponibles' },
  { cmd: 'theme',    desc: 'theme [dark|light|retro|glass]' },
  { cmd: 'matrix',   desc: 'Easter egg Matrix rain' },
  { cmd: 'sudo hire davidson', desc: '👀' },
];

/* Natural language map */
const NL_MAP = [
  [/compétence|skill|techno|stack/i,     'skills'],
  [/projet|project|expérience|xp/i,      'projects'],
  [/contact|email|téléphone|phone/i,     'contact'],
  [/formation|étude|école|bac|diplôme/i, 'education'],
  [/à propos|about|qui|profil/i,         'whoami'],
  [/aide|help|commande/i,                'help'],
];

/* ── Helpers ──────────────────────────────────────────────── */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function append(...nodes) {
  nodes.forEach(n => output.appendChild(n));
  output.scrollTop = output.scrollHeight;
}

function line(html, cls = 't-line') {
  return el('span', cls, html);
}
function blank() { return el('span', 't-blank', ''); }

function typedLine(html, delay = 0) {
  const s = line(html);
  s.style.animationDelay = delay + 'ms';
  return s;
}

/* ── Print helpers ────────────────────────────────────────── */
function printCmdEcho(cmd) {
  append(el('span', 't-cmd',
    `<span class="p-user">davidson</span><span class="p-at">@</span><span class="p-host">portfolio</span><span class="p-sep">:</span><span class="p-dir">~</span><span class="p-dollar">$</span> <span class="t-typed">${escHtml(cmd)}</span>`
  ));
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function printLines(arr) {
  arr.forEach((item, i) => {
    if (item === '') { append(blank()); return; }
    if (typeof item === 'string') {
      append(typedLine(item, i * 18));
    } else {
      // DOM node
      item.style.animationDelay = (i * 18) + 'ms';
      append(item);
    }
  });
}

/* ── Boot sequence ────────────────────────────────────────── */
function boot() {
  const bootLines = [
    { text: 'Initialisation du système...', delay: 0 },
    { text: 'Chargement des modules réseau... <span class="t-green">OK</span>', delay: 200 },
    { text: 'Vérification des compétences... <span class="t-green">OK</span>', delay: 380 },
    { text: 'Montage du portfolio...         <span class="t-green">OK</span>', delay: 540 },
    { text: 'Connexion établie.', delay: 720 },
  ];

  bootLines.forEach(({ text, delay }) => {
    setTimeout(() => {
      const s = el('span', 't-boot t-line', text);
      append(s);
    }, delay);
  });

  setTimeout(() => {
    append(blank());
    printWelcome();
    setTimeout(() => inputEl.focus(), 100);
  }, 1000);
}

function printWelcome() {
  const ascii = [
    '  ██████╗  █████╗ ██╗   ██╗██╗██████╗ ███████╗ ██████╗ ███╗  ██╗',
    '  ██╔══██╗██╔══██╗██║   ██║██║██╔══██╗██╔════╝██╔═══██╗████╗ ██║',
    '  ██║  ██║███████║██║   ██║██║██║  ██║███████╗██║   ██║██╔██╗██║',
    '  ██║  ██║██╔══██║╚██╗ ██╔╝██║██║  ██║╚════██║██║   ██║██║╚████║',
    '  ██████╔╝██║  ██║ ╚████╔╝ ██║██████╔╝███████║╚██████╔╝██║ ╚███║',
    '  ╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚══╝',
  ].join('\n');

  const box = el('div', 't-welcome-box');
  box.innerHTML = `
    <div class="t-ascii">${escHtml(ascii)}</div>
    <div style="margin-top:.8rem">
      <div class="name">Dorelus Davidson</div>
      <div class="role">Technicien IT &amp; Développeur Web — <span class="t-dot"></span><span class="t-green">Disponible pour alternance</span></div>
    </div>
    <div class="links">
      <button class="t-quick-link" data-cmd="whoami">whoami</button>
      <button class="t-quick-link" data-cmd="skills">skills</button>
      <button class="t-quick-link" data-cmd="projects">projects</button>
      <button class="t-quick-link" data-cmd="contact">contact</button>
      <button class="t-quick-link" data-cmd="help">help</button>
    </div>
  `;
  append(box);
  append(blank());

  // Quick-link click
  box.querySelectorAll('.t-quick-link').forEach(btn => {
    btn.addEventListener('click', () => runCommand(btn.dataset.cmd));
  });
}

/* ── Commands ─────────────────────────────────────────────── */
function cmdHelp() {
  const rows = [
    ['help',          'Affiche cette aide'],
    ['whoami / about','Informations personnelles'],
    ['skills',        'Compétences techniques avec barres de progression'],
    ['projects / xp', 'Expériences professionnelles'],
    ['education',     'Formation & diplômes'],
    ['contact',       'Email, téléphone, localisation'],
    ['ls',            'Liste les sections'],
    ['clear',         'Efface le terminal'],
    ['theme <nom>',   'Change le thème : dark · light · retro · glass'],
    ['matrix',        'Easter egg'],
    ['sudo hire davidson', '???'],
  ];

  const frag = [
    el('span', 't-section', 'Commandes disponibles'),
    blank(),
  ];

  rows.forEach(([cmd, desc], i) => {
    const r = el('div', 't-help-row');
    r.style.animationDelay = (i * 30) + 'ms';
    r.innerHTML = `<span class="t-help-cmd">${escHtml(cmd)}</span><span class="t-help-desc">${escHtml(desc)}</span>`;
    frag.push(r);
  });

  frag.push(blank());
  frag.push(line('<span class="t-dim2">Astuce : utilisez Tab pour l\'autocomplétion, ↑↓ pour l\'historique.</span>'));
  printLines(frag);
}

function cmdWhoami() {
  const items = [
    el('span', 't-section', 'À propos de moi'),
    blank(),
    line('<span class="t-accent t-bold">Dorelus Davidson</span>'),
    line('<span class="t-dim">Technicien IT & Développeur Web</span>'),
    blank(),
    line('Curieux, rigoureux et motivé, je m\'intéresse aux réseaux,'),
    line('à l\'informatique et au développement web. Mon stage chez'),
    line('Solutions 30 en Guyane m\'a permis de consolider mes bases'),
    line('techniques sur le terrain (fibre optique, diagnostics réseaux).'),
    blank(),
    line('<span class="t-dot"></span><span class="t-green">Disponible pour alternance · Paris, France</span>'),
    blank(),
    (() => {
      const g = el('div', 't-card');
      g.innerHTML = `
        <div class="t-card-title">Infos rapides</div>
        <div class="t-card-body">
          <span class="t-dim">Localisation :</span> Paris, France<br>
          <span class="t-dim">Objectif :</span> BTS SIO / Licence Pro IT<br>
          <span class="t-dim">Langues :</span> Français (natif), Anglais (intermédiaire)
        </div>
      `;
      return g;
    })(),
    blank(),
  ];
  printLines(items);
}

function cmdSkills() {
  const groups = [
    {
      title: 'Développement Web',
      color: 'accent',
      skills: [
        { name: 'HTML5 / CSS3', pct: 80 },
        { name: 'JavaScript', pct: 60 },
        { name: 'SQL', pct: 55 },
        { name: 'Git / VS Code', pct: 70 },
      ],
    },
    {
      title: 'Infrastructure & Réseaux',
      color: 'blue',
      skills: [
        { name: 'Fibre Optique', pct: 85 },
        { name: 'TCP/IP', pct: 72 },
        { name: 'Configuration réseau', pct: 68 },
        { name: 'Support IT / Dépannage', pct: 75 },
      ],
    },
    {
      title: 'Systèmes & Sécurité',
      color: 'green',
      skills: [
        { name: 'Windows', pct: 80 },
        { name: 'Linux (bases)', pct: 55 },
        { name: 'Active Directory', pct: 50 },
        { name: 'Cybersécurité (bases)', pct: 45 },
      ],
    },
  ];

  const nodes = [el('span', 't-section', 'Compétences'), blank()];

  groups.forEach(g => {
    const gt = el('div', 'skill-group-title', g.title);
    nodes.push(gt);
    g.skills.forEach(sk => {
      const row = el('div', 'skill-row');
      row.innerHTML = `
        <span class="skill-name">${escHtml(sk.name)}</span>
        <div class="skill-bar-bg"><div class="skill-bar-fill ${g.color}" data-pct="${sk.pct}"></div></div>
        <span class="skill-pct">${sk.pct}%</span>
      `;
      nodes.push(row);
    });
  });

  nodes.push(blank());
  printLines(nodes);

  // Animate bars after render
  setTimeout(() => {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 80);
}

function cmdProjects() {
  const experiences = [
    {
      title: 'Technicien Fibre Optique',
      company: 'Solutions 30',
      location: 'Guyane Française',
      period: 'Juin – Août 2024',
      type: 'Stage',
      desc: 'Installation, maintenance et déploiement de la fibre optique. Diagnostics terrain, utilisation d\'un réflectomètre OTDR, collaboration en équipe.',
      tags: [
        { text: 'Fibre Optique', cls: 'accent' },
        { text: 'Réseaux', cls: 'accent' },
        { text: 'OTDR', cls: 'blue' },
        { text: 'Diagnostic terrain', cls: '' },
        { text: 'Travail en équipe', cls: '' },
      ],
    },
    {
      title: 'Service à la Clientèle',
      company: 'Festival',
      location: 'Guyane',
      period: '2019 – 2020',
      type: 'Emploi',
      desc: 'Accueil et orientation des visiteurs, gestion des imprévus, communication avec le public.',
      tags: [
        { text: 'Relation client', cls: '' },
        { text: 'Communication', cls: '' },
        { text: 'Réactivité', cls: 'green' },
      ],
    },
  ];

  const nodes = [el('span', 't-section', 'Expériences professionnelles'), blank()];

  experiences.forEach(xp => {
    const card = el('div', 't-card');
    const tagsHtml = xp.tags.map(t =>
      `<span class="t-tag ${t.cls}">${escHtml(t.text)}</span>`
    ).join('');
    card.innerHTML = `
      <div class="t-card-title">${escHtml(xp.title)}</div>
      <div class="t-card-sub">
        <span class="t-accent">${escHtml(xp.company)}</span>
        <span class="t-dim2"> · ${escHtml(xp.location)} · ${escHtml(xp.period)}</span>
        <span class="t-tag blue" style="margin-left:.5rem">${escHtml(xp.type)}</span>
      </div>
      <div class="t-card-body">${escHtml(xp.desc)}</div>
      <div class="t-card-tags">${tagsHtml}</div>
    `;
    nodes.push(card);
  });

  nodes.push(blank());
  nodes.push(line('<span class="t-dot"></span><span class="t-green t-dim">Disponible pour une alternance dès 2025.</span>'));
  nodes.push(blank());
  printLines(nodes);
}

function cmdEducation() {
  const nodes = [
    el('span', 't-section', 'Formation'),
    blank(),
  ];

  const card = el('div', 't-card');
  card.innerHTML = `
    <div class="t-card-title">Baccalauréat Sciences Économiques et Sociales</div>
    <div class="t-card-sub"><span class="t-accent">Spécialité NSI</span> <span class="t-dim2">— Numérique &amp; Sciences Informatiques · 2024</span></div>
    <div class="t-card-body">Spécialisation en algorithmique, programmation Python, bases de données relationnelles et réseaux.</div>
    <div class="t-card-tags">
      <span class="t-tag accent">Python</span>
      <span class="t-tag blue">Algorithmique</span>
      <span class="t-tag">Bases de données</span>
      <span class="t-tag">Réseaux</span>
    </div>
  `;
  nodes.push(card);
  nodes.push(blank());
  printLines(nodes);
}

function cmdContact() {
  const nodes = [
    el('span', 't-section', 'Contact'),
    blank(),
    line('N\'hésitez pas à me contacter pour toute opportunité d\'alternance.'),
    blank(),
  ];

  const links = [
    { label: 'Email', value: 'davedorelus025@icloud.com', href: 'mailto:davedorelus025@icloud.com' },
    { label: 'Téléphone', value: '07 69 59 54 72', href: 'tel:+33769595472' },
    { label: 'Localisation', value: 'Paris, France', href: null },
    { label: 'Statut', value: '🟢 Disponible pour alternance', href: null },
  ];

  links.forEach(l => {
    if (l.href) {
      const a = el('a', 't-contact-link');
      a.href = l.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerHTML = `<span class="t-contact-label">${escHtml(l.label)}</span><span class="t-contact-val">${escHtml(l.value)}</span>`;
      nodes.push(a);
    } else {
      const d = el('div', 't-contact-link');
      d.innerHTML = `<span class="t-contact-label">${escHtml(l.label)}</span><span class="t-contact-val">${escHtml(l.value)}</span>`;
      nodes.push(d);
    }
  });

  nodes.push(blank());
  printLines(nodes);
}

function cmdLs() {
  const sections = ['whoami', 'skills', 'projects', 'education', 'contact'];
  const nodes = [
    line(`<span class="t-dim">total ${sections.length}</span>`),
  ];
  sections.forEach(s => {
    nodes.push(line(`drwxr-xr-x  <span class="t-accent">${s}/</span>`));
  });
  nodes.push(blank());
  printLines(nodes);
}

function cmdTheme(arg) {
  const t = (arg || '').toLowerCase().trim();
  if (!t) {
    printLines([
      line(`Thème actuel : <span class="t-accent">${currentTheme}</span>`),
      line(`Thèmes disponibles : <span class="t-dim">${THEMES.join(' · ')}</span>`),
      blank(),
    ]);
    return;
  }
  if (!THEMES.includes(t)) {
    printLines([
      line(`<span class="t-err">Thème inconnu : ${escHtml(t)}</span>`),
      line(`Thèmes disponibles : <span class="t-dim">${THEMES.join(' · ')}</span>`),
      blank(),
    ]);
    return;
  }
  THEMES.forEach(th => document.body.classList.remove('theme-' + th));
  if (t !== 'dark') document.body.classList.add('theme-' + t);
  currentTheme = t;
  themeLabel.textContent = t;
  printLines([
    line(`<span class="t-green">Thème appliqué : ${escHtml(t)}</span>`),
    blank(),
  ]);
}

function cmdSudoHire() {
  const msg = [
    el('span', 't-section', 'sudo hire davidson'),
    blank(),
    line('<span class="t-accent t-bold">Autorisation accordée.</span>'),
    blank(),
    line('Voici pourquoi vous devriez me recruter :'),
    blank(),
    line(' ✦  Rigoureux, curieux et motivé'),
    line(' ✦  Expérience terrain en fibre optique (Guyane, 2024)'),
    line(' ✦  Bases solides en réseaux, systèmes et développement web'),
    line(' ✦  Prêt à apprendre rapidement en entreprise'),
    line(' ✦  Disponible immédiatement à Paris'),
    blank(),
    line('<span class="t-dim">→ Contactez-moi : </span><span class="t-accent">davedorelus025@icloud.com</span>'),
    blank(),
  ];
  printLines(msg);
  launchConfetti();
}

function cmdMatrix() {
  if (matrixActive) {
    stopMatrix();
    printLines([line('<span class="t-dim">Matrix désactivé.</span>'), blank()]);
  } else {
    startMatrix();
    printLines([line('<span class="t-green">Follow the white rabbit... (relance pour arrêter)</span>'), blank()]);
  }
}

function cmdClear() {
  output.innerHTML = '';
  printWelcome();
}

function cmdUnknown(cmd) {
  printLines([
    line(`<span class="t-err">Commande introuvable : ${escHtml(cmd)}</span>`),
    line('<span class="t-dim">Tape <span class="t-accent">help</span> pour voir les commandes disponibles.</span>'),
    blank(),
  ]);
}

/* ── Run ──────────────────────────────────────────────────── */
function runCommand(raw) {
  const input = raw.trim();
  if (!input) return;

  // History
  if (history[0] !== input) history.unshift(input);
  if (history.length > 80) history.pop();
  histIdx = -1;

  printCmdEcho(input);

  const lower = input.toLowerCase();
  const parts = lower.split(/\s+/);
  const cmd   = parts[0];
  const arg   = parts.slice(1).join(' ');

  switch (true) {
    case cmd === 'help':              cmdHelp(); break;
    case cmd === 'whoami':
    case cmd === 'about':             cmdWhoami(); break;
    case cmd === 'skills':            cmdSkills(); break;
    case cmd === 'projects':
    case cmd === 'xp':                cmdProjects(); break;
    case cmd === 'education':         cmdEducation(); break;
    case cmd === 'contact':           cmdContact(); break;
    case cmd === 'ls':                cmdLs(); break;
    case cmd === 'clear':             cmdClear(); break;
    case cmd === 'theme':             cmdTheme(arg); break;
    case cmd === 'matrix':            cmdMatrix(); break;
    case lower === 'sudo hire davidson': cmdSudoHire(); break;
    default: {
      // Natural language fallback
      let matched = false;
      for (const [re, target] of NL_MAP) {
        if (re.test(input)) {
          runCommand(target);
          matched = true;
          break;
        }
      }
      if (!matched) cmdUnknown(input);
    }
  }

  resetIdleTimer();
}

/* ── Input handling ───────────────────────────────────────── */
inputEl.addEventListener('keydown', e => {
  const val = inputEl.value;

  if (e.key === 'Enter') {
    closeDropdown();
    const v = val.trim();
    inputEl.value = '';
    if (v) runCommand(v);
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (histIdx < history.length - 1) {
      histIdx++;
      inputEl.value = history[histIdx];
      setTimeout(() => inputEl.setSelectionRange(9999, 9999), 0);
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx > 0) {
      histIdx--;
      inputEl.value = history[histIdx];
    } else {
      histIdx = -1;
      inputEl.value = '';
    }
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const items = dropdown.querySelectorAll('.ac-item');
    if (items.length === 0) return;
    if (items.length === 1) {
      inputEl.value = items[0].dataset.cmd;
      closeDropdown();
      return;
    }
    // cycle
    items.forEach(i => i.classList.remove('selected'));
    acIdx = (acIdx + 1) % items.length;
    items[acIdx].classList.add('selected');
    inputEl.value = items[acIdx].dataset.cmd;
    return;
  }

  if (e.key === 'Escape') { closeDropdown(); return; }
});

inputEl.addEventListener('input', () => {
  acIdx = -1;
  updateDropdown(inputEl.value);
});

// Always focus on click anywhere in window
document.addEventListener('click', e => {
  if (!e.target.closest('a') && !e.target.closest('button')) {
    inputEl.focus();
  }
});

function updateDropdown(val) {
  const v = val.toLowerCase().trim();
  if (!v) { closeDropdown(); return; }

  const matches = COMMANDS.filter(c => c.cmd.startsWith(v) && c.cmd !== v);
  if (!matches.length) { closeDropdown(); return; }

  dropdown.innerHTML = '';
  matches.forEach(m => {
    const item = el('div', 'ac-item');
    item.dataset.cmd = m.cmd;
    item.innerHTML = `<span class="ac-cmd">${escHtml(m.cmd)}</span><span class="ac-desc">${escHtml(m.desc)}</span>`;
    item.addEventListener('click', () => {
      inputEl.value = m.cmd;
      closeDropdown();
      inputEl.focus();
    });
    dropdown.appendChild(item);
  });
  dropdown.classList.add('open');
}

function closeDropdown() {
  dropdown.classList.remove('open');
  dropdown.innerHTML = '';
  acIdx = -1;
}

/* ── Idle hints ───────────────────────────────────────────── */
const IDLE_HINTS = [
  'Astuce : tape <span class="t-accent">help</span> pour voir les commandes.',
  'Essaie <span class="t-accent">skills</span> pour voir mes compétences.',
  'Tape <span class="t-accent">contact</span> pour me joindre.',
  'Essaie <span class="t-accent">theme retro</span> pour un look rétro.',
  'Tape <span class="t-accent">matrix</span> pour une surprise.',
  'Essaie <span class="t-accent">sudo hire davidson</span> 👀',
];

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(showIdleHint, 20000);
}

function showIdleHint() {
  const hint = IDLE_HINTS[idleCount % IDLE_HINTS.length];
  idleCount++;
  append(line(`<span class="t-dim2">💡 ${hint}</span>`));
  output.scrollTop = output.scrollHeight;
  idleTimer = setTimeout(showIdleHint, 30000);
}

/* ── Matrix rain ──────────────────────────────────────────── */
function startMatrix() {
  matrixActive = true;
  canvas.classList.add('active');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const cols   = Math.floor(canvas.width / 16);
  const drops  = new Array(cols).fill(1);
  const chars  = 'アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEF0123456789';

  function draw() {
    if (!matrixActive) return;
    ctx.fillStyle = 'rgba(10,15,0,.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#39ff14';
    ctx.font = '14px JetBrains Mono, monospace';
    drops.forEach((y, i) => {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 16, y * 16);
      if (y * 16 > canvas.height && Math.random() > .975) drops[i] = 0;
      drops[i]++;
    });
    matrixRAF = requestAnimationFrame(draw);
  }
  draw();
}

function stopMatrix() {
  matrixActive = false;
  if (matrixRAF) { cancelAnimationFrame(matrixRAF); matrixRAF = null; }
  canvas.classList.remove('active');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', () => {
  if (matrixActive) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

/* ── Confetti ─────────────────────────────────────────────── */
function launchConfetti() {
  // Stop matrix if running before launching confetti
  if (matrixActive) stopMatrix();
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('active');

  const particles = Array.from({ length: 120 }, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height - canvas.height,
    vx: (Math.random() - .5) * 4,
    vy: Math.random() * 4 + 2,
    color: ['#c9a84c','#f0ece3','#3ecf8e','#4a7cf7','#b88ce8'][Math.floor(Math.random()*5)],
    size: Math.random() * 8 + 4,
    rot:  Math.random() * Math.PI * 2,
    vr:   (Math.random() - .5) * .2,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size/2);
      ctx.restore();
    });
    frame++;
    if (frame < 180) requestAnimationFrame(draw);
    else {
      canvas.classList.remove('active');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

/* ── Konami code ──────────────────────────────────────────── */
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIdx = 0;

document.addEventListener('keydown', e => {
  if (e.key === KONAMI[konamiIdx]) {
    konamiIdx++;
    if (konamiIdx === KONAMI.length) {
      konamiIdx = 0;
      printLines([
        blank(),
        line('<span class="t-purple t-bold">🎉 Konami Code activé ! Confettis !</span>'),
        blank(),
      ]);
      launchConfetti();
    }
  } else {
    konamiIdx = 0;
  }
});

/* ── Traffic light buttons ────────────────────────────────── */
document.querySelector('.tl-close').addEventListener('click', () => {
  printLines([line('<span class="t-err">Fermeture refusée — le terminal persiste. 😈</span>'), blank()]);
});
document.querySelector('.tl-min').addEventListener('click', () => {
  printLines([line('<span class="t-dim">Minimisation non disponible en mode plein écran.</span>'), blank()]);
});
document.querySelector('.tl-max').addEventListener('click', () => {
  document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen().catch(() => {});
});

/* ── Init ─────────────────────────────────────────────────── */
boot();
resetIdleTimer();
