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
  { cmd: 'help',              desc: 'Affiche toutes les commandes' },
  { cmd: 'whoami',            desc: 'Informations personnelles' },
  { cmd: 'about',             desc: 'Alias de whoami' },
  { cmd: 'skills',            desc: 'Compétences techniques' },
  { cmd: 'projects',          desc: 'Expériences professionnelles' },
  { cmd: 'xp',                desc: 'Alias de projects' },
  { cmd: 'contact',           desc: 'Mes coordonnées' },
  { cmd: 'education',         desc: 'Formation & diplômes' },
  { cmd: 'clear',             desc: 'Efface le terminal' },
  { cmd: 'ls',                desc: 'Liste les sections' },
  { cmd: 'theme',             desc: 'theme [dark|light|retro|glass]' },
  { cmd: 'matrix',            desc: 'Easter egg Matrix rain' },
  { cmd: 'sudo hire davidson', desc: '👀' },
];

/* Natural language fallback */
const NL_MAP = [
  [/compétence|skill|techno|stack/i,       'skills'],
  [/projet|project|expérience|xp/i,        'projects'],
  [/contact|email|téléphone|phone/i,       'contact'],
  [/formation|étude|école|bac|diplôme/i,   'education'],
  [/à propos|about|qui|profil/i,           'whoami'],
  [/aide|help|commande/i,                  'help'],
];

/* ── DOM helpers ──────────────────────────────────────────── */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls)              e.className = cls;
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

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function printLines(arr) {
  arr.forEach((item, i) => {
    if (item === '') { append(blank()); return; }
    if (typeof item === 'string') {
      append(typedLine(item, i * 16));
    } else {
      item.style.animationDelay = (i * 16) + 'ms';
      append(item);
    }
  });
}

/* ── Print echo ───────────────────────────────────────────── */
function printCmdEcho(cmd) {
  append(el('span', 't-cmd',
    `<span class="p-user">davidson</span>` +
    `<span class="p-at">@</span>` +
    `<span class="p-host">portfolio</span>` +
    `<span class="p-sep">:</span>` +
    `<span class="p-dir">~</span>` +
    `<span class="p-dollar">$</span> ` +
    `<span class="t-typed">${escHtml(cmd)}</span>`
  ));
}

/* ── Boot sequence ────────────────────────────────────────── */
function boot() {
  const BOOT = [
    { text: 'Initialisation du système...                 <span class="t-green">OK</span>', delay: 0   },
    { text: 'Chargement des modules réseau...             <span class="t-green">OK</span>', delay: 180 },
    { text: 'Vérification des compétences...              <span class="t-green">OK</span>', delay: 340 },
    { text: 'Montage du portfolio...                      <span class="t-green">OK</span>', delay: 490 },
    { text: 'Connexion établie.                           <span class="t-accent">v2.0</span>', delay: 640 },
  ];

  BOOT.forEach(({ text, delay }) => {
    setTimeout(() => {
      append(el('span', 't-boot t-line', text));
    }, delay);
  });

  setTimeout(() => {
    append(blank());
    printWelcome();
    setTimeout(() => inputEl.focus(), 100);
  }, 950);
}

/* ── Welcome ──────────────────────────────────────────────── */
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
    <div style="margin-top:.85rem">
      <div class="name">Dorelus Davidson</div>
      <div class="role">
        Technicien IT &amp; Développeur Web
        &nbsp;—&nbsp;
        <span class="t-dot"></span><span class="t-green">Disponible pour alternance</span>
      </div>
    </div>
    <div class="links">
      <button class="t-quick-link" data-cmd="whoami">whoami</button>
      <button class="t-quick-link" data-cmd="skills">skills</button>
      <button class="t-quick-link" data-cmd="projects">projects</button>
      <button class="t-quick-link" data-cmd="education">education</button>
      <button class="t-quick-link" data-cmd="contact">contact</button>
      <button class="t-quick-link" data-cmd="help">help</button>
    </div>
  `;
  append(box);
  append(blank());

  box.querySelectorAll('.t-quick-link').forEach(btn => {
    btn.addEventListener('click', () => runCommand(btn.dataset.cmd));
  });
}

/* ── Commands ─────────────────────────────────────────────── */
function cmdHelp() {
  const rows = [
    ['help',               'Affiche cette aide'],
    ['whoami / about',     'Qui je suis'],
    ['skills',             'Compétences avec barres de progression'],
    ['projects / xp',      'Expériences professionnelles'],
    ['education',          'Formation & diplômes'],
    ['contact',            'Email, téléphone, localisation'],
    ['ls',                 'Liste les sections disponibles'],
    ['clear',              'Efface le terminal'],
    ['theme <nom>',        'dark · light · retro · glass'],
    ['matrix',             'Easter egg 🟩'],
    ['sudo hire davidson', 'Pourquoi me recruter 👀'],
  ];

  const frag = [
    el('span', 't-section', 'Commandes disponibles'),
    blank(),
  ];

  rows.forEach(([cmd, desc], i) => {
    const r = el('div', 't-help-row');
    r.style.animationDelay = (i * 28) + 'ms';
    r.innerHTML = `<span class="t-help-cmd">${escHtml(cmd)}</span><span class="t-help-desc">${escHtml(desc)}</span>`;
    frag.push(r);
  });

  frag.push(blank());
  frag.push(line('<span class="t-dim2">Astuce : Tab pour autocomplétion · ↑↓ pour l\'historique</span>'));
  printLines(frag);
}

function cmdWhoami() {
  const items = [
    el('span', 't-section', 'À propos de moi'),
    blank(),
    line('<span class="t-accent t-bold">Dorelus Davidson</span>'),
    line('<span class="t-dim">Technicien IT &amp; Développeur Web</span>'),
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
          <span class="t-dim">Localisation &nbsp;:</span> Paris, France<br>
          <span class="t-dim">Objectif &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> BTS SIO / Licence Pro IT<br>
          <span class="t-dim">Langues &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> Français (natif) · Anglais (intermédiaire)<br>
          <span class="t-dim">Permis &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> En cours
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
        { name: 'HTML5 / CSS3',    pct: 80 },
        { name: 'JavaScript',      pct: 60 },
        { name: 'SQL',             pct: 55 },
        { name: 'Git / VS Code',   pct: 70 },
      ],
    },
    {
      title: 'Infrastructure & Réseaux',
      color: 'blue',
      skills: [
        { name: 'Fibre Optique',         pct: 85 },
        { name: 'TCP/IP',                pct: 72 },
        { name: 'Configuration réseau',  pct: 68 },
        { name: 'Support IT / Helpdesk', pct: 78 },
      ],
    },
    {
      title: 'Systèmes & Sécurité',
      color: 'green',
      skills: [
        { name: 'Windows Server',   pct: 78 },
        { name: 'Linux (bases)',     pct: 55 },
        { name: 'Active Directory',  pct: 50 },
        { name: 'Cybersécurité',     pct: 45 },
      ],
    },
  ];

  const nodes = [el('span', 't-section', 'Compétences'), blank()];

  groups.forEach(g => {
    nodes.push(el('div', 'skill-group-title', g.title));
    g.skills.forEach(sk => {
      const row = el('div', 'skill-row');
      row.innerHTML = `
        <span class="skill-name">${escHtml(sk.name)}</span>
        <div class="skill-bar-bg">
          <div class="skill-bar-fill ${g.color}" data-pct="${sk.pct}"></div>
        </div>
        <span class="skill-pct">${sk.pct}%</span>
      `;
      nodes.push(row);
    });
  });

  nodes.push(blank());
  printLines(nodes);

  setTimeout(() => {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 80);
}

function cmdProjects() {
  const experiences = [
    {
      title:    'Technicien Fibre Optique',
      company:  'Solutions 30',
      location: 'Guyane Française',
      period:   'Juin – Août 2024',
      type:     'Stage',
      desc:     'Installation, maintenance et déploiement de la fibre optique. Diagnostics terrain avec réflectomètre OTDR, raccordements, coordination avec les équipes sur site.',
      tags: [
        { text: 'Fibre Optique', cls: 'accent' },
        { text: 'OTDR',          cls: 'blue'   },
        { text: 'Réseaux',       cls: 'accent' },
        { text: 'Diagnostic',    cls: ''        },
        { text: 'Travail terrain', cls: ''      },
      ],
    },
    {
      title:    'Service à la Clientèle',
      company:  'Festival',
      location: 'Guyane',
      period:   '2019 – 2020',
      type:     'Emploi',
      desc:     'Accueil et orientation des visiteurs, gestion des imprévus en temps réel, communication avec le public dans des environnements à forte affluence.',
      tags: [
        { text: 'Relation client', cls: ''      },
        { text: 'Communication',   cls: ''      },
        { text: 'Réactivité',      cls: 'green' },
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
        <span class="t-tag blue" style="margin-left:.3rem">${escHtml(xp.type)}</span>
      </div>
      <div class="t-card-body">${escHtml(xp.desc)}</div>
      <div class="t-card-tags">${tagsHtml}</div>
    `;
    nodes.push(card);
  });

  nodes.push(blank());
  nodes.push(line('<span class="t-dot"></span><span class="t-green t-dim">Disponible pour alternance dès 2025.</span>'));
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
    <div class="t-card-sub">
      <span class="t-accent">Spécialité NSI</span>
      <span class="t-dim2"> — Numérique &amp; Sciences Informatiques · 2024</span>
    </div>
    <div class="t-card-body">
      Spécialisation en algorithmique, programmation Python,
      bases de données relationnelles et architecture des réseaux.
    </div>
    <div class="t-card-tags">
      <span class="t-tag accent">Python</span>
      <span class="t-tag blue">Algorithmique</span>
      <span class="t-tag">Bases de données</span>
      <span class="t-tag">Réseaux</span>
      <span class="t-tag green">NSI</span>
    </div>
  `;
  nodes.push(card);
  nodes.push(blank());

  const next = el('div', 't-card');
  next.innerHTML = `
    <div class="t-card-title">BTS SIO — Objectif 2025</div>
    <div class="t-card-sub">
      <span class="t-accent">En recherche d'alternance</span>
      <span class="t-dim2"> — Paris, France</span>
    </div>
    <div class="t-card-body">
      Prêt à rejoindre une entreprise en alternance pour préparer un BTS SIO
      option SLAM (développement) ou SISR (infrastructure &amp; réseaux).
    </div>
    <div class="t-card-tags">
      <span class="t-tag accent">BTS SIO</span>
      <span class="t-tag blue">SLAM</span>
      <span class="t-tag green">SISR</span>
      <span class="t-tag">Alternance</span>
    </div>
  `;
  nodes.push(next);
  nodes.push(blank());
  printLines(nodes);
}

function cmdContact() {
  const nodes = [
    el('span', 't-section', 'Contact'),
    blank(),
    line('N\'hésitez pas à me contacter pour toute opportunité.'),
    blank(),
  ];

  const contacts = [
    { label: 'Email',       value: 'davedorelus025@icloud.com',  href: 'mailto:davedorelus025@icloud.com' },
    { label: 'Téléphone',   value: '07 69 59 54 72',             href: 'tel:+33769595472'                 },
    { label: 'Localisation',value: 'Paris, France',              href: null                               },
    { label: 'Statut',      value: '🟢  Disponible pour alternance', href: null                           },
  ];

  contacts.forEach(c => {
    if (c.href) {
      const a = el('a', 't-contact-link');
      a.href   = c.href;
      a.target = '_blank';
      a.rel    = 'noopener noreferrer';
      a.innerHTML = `<span class="t-contact-label">${escHtml(c.label)}</span><span class="t-contact-val">${escHtml(c.value)}</span>`;
      nodes.push(a);
    } else {
      const d = el('div', 't-contact-link');
      d.innerHTML = `<span class="t-contact-label">${escHtml(c.label)}</span><span class="t-contact-val">${escHtml(c.value)}</span>`;
      nodes.push(d);
    }
  });

  nodes.push(blank());
  printLines(nodes);
}

function cmdLs() {
  const sections = ['whoami', 'skills', 'projects', 'education', 'contact'];
  printLines([
    line(`<span class="t-dim">total ${sections.length}</span>`),
    ...sections.map(s => line(`drwxr-xr-x  <span class="t-accent">${s}/</span>`)),
    blank(),
  ]);
}

function cmdTheme(arg) {
  const t = (arg || '').toLowerCase().trim();
  if (!t) {
    printLines([
      line(`Thème actuel : <span class="t-accent">${currentTheme}</span>`),
      line(`Disponibles  : <span class="t-dim">${THEMES.join(' · ')}</span>`),
      blank(),
    ]);
    return;
  }
  if (!THEMES.includes(t)) {
    printLines([
      line(`<span class="t-err">Thème inconnu : ${escHtml(t)}</span>`),
      line(`Disponibles : <span class="t-dim">${THEMES.join(' · ')}</span>`),
      blank(),
    ]);
    return;
  }
  applyTheme(t);
  printLines([line(`<span class="t-green">Thème appliqué : ${escHtml(t)}</span>`), blank()]);
}

function applyTheme(t) {
  THEMES.forEach(th => document.body.classList.remove('theme-' + th));
  document.body.classList.add('theme-' + t);
  if (t === 'dark') document.body.classList.remove('theme-dark');
  currentTheme = t;
  themeLabel.textContent = t;
}

function cmdSudoHire() {
  const msg = [
    el('span', 't-section', 'sudo hire davidson'),
    blank(),
    line('<span class="t-accent t-bold">✓ Autorisation accordée.</span>'),
    blank(),
    line('Pourquoi recruter Dorelus Davidson :'),
    blank(),
    line(' ✦  Rigoureux, curieux et constamment en apprentissage'),
    line(' ✦  Expérience terrain en fibre optique (Solutions 30, Guyane 2024)'),
    line(' ✦  Bases solides en réseaux, systèmes et développement web'),
    line(' ✦  Motivé à apprendre rapidement en environnement professionnel'),
    line(' ✦  Disponible immédiatement à Paris'),
    line(' ✦  Cherche alternance BTS SIO ou Licence Pro'),
    blank(),
    line('<span class="t-dim">→ </span><span class="t-accent">davedorelus025@icloud.com</span>'),
    line('<span class="t-dim">→ </span><span class="t-text">07 69 59 54 72</span>'),
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

/* ── Run command ──────────────────────────────────────────── */
function runCommand(raw) {
  const input = raw.trim();
  if (!input) return;

  if (history[0] !== input) history.unshift(input);
  if (history.length > 80)  history.pop();
  histIdx = -1;

  printCmdEcho(input);

  const lower = input.toLowerCase();
  const parts = lower.split(/\s+/);
  const cmd   = parts[0];
  const arg   = parts.slice(1).join(' ');

  switch (true) {
    case cmd === 'help':                  cmdHelp();     break;
    case cmd === 'whoami':
    case cmd === 'about':                 cmdWhoami();   break;
    case cmd === 'skills':                cmdSkills();   break;
    case cmd === 'projects':
    case cmd === 'xp':                    cmdProjects(); break;
    case cmd === 'education':             cmdEducation();break;
    case cmd === 'contact':               cmdContact();  break;
    case cmd === 'ls':                    cmdLs();       break;
    case cmd === 'clear':                 cmdClear();    break;
    case cmd === 'theme':                 cmdTheme(arg); break;
    case cmd === 'matrix':                cmdMatrix();   break;
    case lower === 'sudo hire davidson':  cmdSudoHire(); break;
    default: {
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

/* ── Input event handling ─────────────────────────────────── */
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    closeDropdown();
    const v = inputEl.value.trim();
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
    if (!items.length) return;
    if (items.length === 1) {
      inputEl.value = items[0].dataset.cmd;
      closeDropdown();
      return;
    }
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

/* Focus on click anywhere (not on links/buttons) */
document.addEventListener('click', e => {
  if (!e.target.closest('a') && !e.target.closest('button')) {
    inputEl.focus();
  }
});

/* ── Autocomplete ─────────────────────────────────────────── */
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

/* ── Mobile command bar ───────────────────────────────────── */
const mobileBar = document.getElementById('mobile-cmd-bar');
if (mobileBar) {
  mobileBar.addEventListener('click', e => {
    const btn = e.target.closest('.mob-cmd');
    if (!btn) return;
    runCommand(btn.dataset.cmd);
    output.scrollTop = output.scrollHeight;
  });
}

/* ── Theme indicator click (cycle) ───────────────────────── */
themeLabel.addEventListener('click', () => {
  const idx  = THEMES.indexOf(currentTheme);
  const next = THEMES[(idx + 1) % THEMES.length];
  applyTheme(next);
  printLines([line(`<span class="t-green">Thème : ${escHtml(next)}</span>`), blank()]);
});
themeLabel.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') themeLabel.click();
});

/* ── Idle hints ───────────────────────────────────────────── */
const IDLE_HINTS = [
  'Astuce : tape <span class="t-accent">help</span> pour la liste des commandes.',
  'Essaie <span class="t-accent">skills</span> pour voir mes compétences.',
  'Tape <span class="t-accent">contact</span> pour me joindre directement.',
  'Essaie <span class="t-accent">theme retro</span> pour le look phosphore vert.',
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

  const cols  = Math.floor(canvas.width / 16);
  const drops = new Array(cols).fill(1);
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEF0123456789';

  function draw() {
    if (!matrixActive) return;
    ctx.fillStyle = 'rgba(10,15,0,.055)';
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
  if (matrixActive) stopMatrix();
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('active');

  const palette = ['#c9a84c', '#f0ece3', '#3ecf8e', '#4a7cf7', '#b88ce8', '#ff5f57'];
  const particles = Array.from({ length: 130 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height - canvas.height,
    vx:    (Math.random() - .5) * 5,
    vy:    Math.random() * 4 + 2,
    color: palette[Math.floor(Math.random() * palette.length)],
    size:  Math.random() * 9 + 4,
    rot:   Math.random() * Math.PI * 2,
    vr:    (Math.random() - .5) * .22,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
      ctx.restore();
    });
    frame++;
    if (frame < 200) requestAnimationFrame(draw);
    else {
      canvas.classList.remove('active');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

/* ── Konami code ──────────────────────────────────────────── */
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
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
  printLines([line('<span class="t-err">Permission refusée — le terminal persiste. 😈</span>'), blank()]);
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
