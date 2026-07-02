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
  { cmd: 'learning',          desc: 'Cours en ligne — Codecademy' },
  { cmd: 'alternance',        desc: 'Infos recruteurs — apprentissage' },
  { cmd: 'cv',                desc: 'Télécharge mon CV (PDF)' },
  { cmd: 'neofetch',          desc: 'Carte d\'identité système' },
  { cmd: 'snake',             desc: 'Mini-jeu dans le terminal' },
  { cmd: 'history',           desc: 'Historique des commandes' },
  { cmd: 'clear',             desc: 'Efface le terminal' },
  { cmd: 'ls',                desc: 'Liste les sections' },
  { cmd: 'theme',             desc: 'theme [dark|light|retro|glass]' },
  { cmd: 'matrix',            desc: 'Easter egg Matrix rain' },
  { cmd: 'sudo hire davidson', desc: 'root access' },
  { cmd: 'exit',              desc: 'Retour au site classique' },
];

/* Natural language fallback */
const NL_MAP = [
  [/compétence|skill|techno|stack/i,              'skills'],
  [/projet|project|expérience|xp/i,               'projects'],
  [/contact|email|téléphone|phone/i,              'contact'],
  [/formation|étude|école|bac|diplôme/i,          'education'],
  [/codecademy|cours|learning|apprendre|online/i, 'learning'],
  [/alternance|apprentissage|recrute|embauche|stage/i, 'alternance'],
  [/\bcv\b|curriculum|resume/i,                  'cv'],
  [/github|repo/i,                                'contact'],
  [/jeu|game|jouer/i,                             'snake'],
  [/à propos|about|qui|profil/i,                  'whoami'],
  [/aide|help|commande/i,                         'help'],
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
    { text: 'Connexion établie.                           <span class="t-accent">v3.0</span>', delay: 640 },
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
        Technicien Informatique &amp; Développeur Web
        &nbsp;—&nbsp;
        <span class="t-dot"></span><span class="t-green">Recherche alternance · dispo immédiatement</span>
      </div>
    </div>
    <div class="links">
      <button class="t-quick-link" data-cmd="whoami">whoami</button>
      <button class="t-quick-link" data-cmd="skills">skills</button>
      <button class="t-quick-link" data-cmd="projects">projects</button>
      <button class="t-quick-link" data-cmd="alternance">alternance</button>
      <button class="t-quick-link" data-cmd="contact">contact</button>
      <button class="t-quick-link" data-cmd="cv">cv</button>
      <button class="t-quick-link" data-cmd="snake">snake</button>
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
    ['alternance',         'Infos recruteurs — apprentissage'],
    ['cv',                 'Télécharge mon CV (PDF)'],
    ['skills',             'Compétences techniques'],
    ['projects / xp',      'Projets & expériences'],
    ['education',          'Formation & diplômes'],
    ['learning',           'Progression Codecademy'],
    ['contact',            'Email, téléphone, GitHub'],
    ['neofetch',           'Carte d\'identité système'],
    ['ls',                 'Liste les sections disponibles'],
    ['history',            'Historique des commandes'],
    ['theme <nom>',        'dark · light · retro · glass'],
    ['matrix',             'Pluie verte — easter egg'],
    ['snake',              'Mini-jeu snake'],
    ['sudo hire davidson', 'Pourquoi me recruter'],
    ['clear',              'Efface le terminal'],
    ['exit',               'Retour au site classique'],
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
  frag.push(line('<span class="t-dim2">Astuce : Tab pour autocomplétion · ↑↓ pour l\'historique · Ctrl+L pour effacer</span>'));
  printLines(frag);
}

function cmdWhoami() {
  const items = [
    el('span', 't-section', 'À propos de moi'),
    blank(),
    line('<span class="t-accent t-bold">Davidson Dorelus</span>'),
    line('<span class="t-dim">Technicien Informatique &amp; Développeur Web</span>'),
    blank(),
    line('Passionné par le développement web et l\'automatisation, j\'apprends'),
    line('en construisant : serveurs VPS sous Docker, applications full-stack,'),
    line('visualiseur d\'algorithmes en vanilla JS. Six mois sur la fibre optique'),
    line('chez Solutions 30 en Guyane et la Piscine de l\'École 42 m\'ont appris'),
    line('à travailler sous pression réelle, en équipe et au contact du terrain.'),
    blank(),
    line('<span class="t-dot"></span><span class="t-green">En recherche d\'alternance — contrat d\'apprentissage · dispo immédiatement</span>'),
    blank(),
    (() => {
      const g = el('div', 't-card');
      g.innerHTML = `
        <div class="t-card-title">Infos rapides</div>
        <div class="t-card-body">
          <span class="t-dim">Localisation &nbsp;:</span> Paris, France<br>
          <span class="t-dim">Objectif &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> Alternance Technicien Informatique (bac+2, RNCP 5)<br>
          <span class="t-dim">Rythme &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> 4 j entreprise / 1 j formation · 12 mois<br>
          <span class="t-dim">Langues &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> Français (natif) · Anglais (B1-B2) · Portugais (A1-A2)
        </div>
      `;
      return g;
    })(),
    blank(),
    line('<span class="t-dim2">→ Recruteur ? Tape </span><span class="t-accent">alternance</span><span class="t-dim2"> ou </span><span class="t-accent">cv</span><span class="t-dim2">.</span>'),
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
        { name: 'HTML5',                pct: 80 },
        { name: 'CSS3',                 pct: 65 },
        { name: 'JavaScript',           pct: 60 },
        { name: 'TypeScript / Next.js', pct: 35 },
        { name: 'SQL',                  pct: 55 },
        { name: 'Git / GitHub',         pct: 70 },
        { name: 'C (en cours)',         pct: 25 },
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
      title: 'Systèmes & Automatisation',
      color: 'green',
      skills: [
        { name: 'Windows Server',   pct: 78 },
        { name: 'Linux (bases)',    pct: 55 },
        { name: 'Active Directory', pct: 50 },
        { name: 'Docker',           pct: 45 },
        { name: 'PowerShell',       pct: 35 },
        { name: 'Cybersécurité',    pct: 45 },
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
      location: 'Guyane française',
      period:   '06/2024 – 11/2024 · 6 mois',
      type:     'Emploi',
      desc:     'Installation, maintenance et déploiement de la fibre optique. Diagnostics terrain avec réflectomètre OTDR, raccordements, coordination avec les équipes sur site.',
      tags: [
        { text: 'Fibre Optique', cls: 'accent' },
        { text: 'OTDR',          cls: 'blue'   },
        { text: 'Réseaux',       cls: 'accent' },
        { text: 'Diagnostic',    cls: ''       },
      ],
    },
    {
      title:    'Installateur d\'équipements sportifs',
      company:  'Multi-Services et Finitions',
      location: 'Guyane française',
      period:   '08/2023 – 05/2024 · 10 mois',
      type:     'Emploi',
      desc:     'Installation de paniers de basket et systèmes de support, montage et fixation sécurisée des équipements, mise en place des structures associées.',
      tags: [
        { text: 'Rigueur',          cls: ''      },
        { text: 'Sécurité',         cls: 'green' },
        { text: 'Travail en équipe', cls: ''     },
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
  nodes.push(el('span', 't-section', 'Projets personnels'));
  nodes.push(blank());

  const medecin = el('div', 't-card');
  medecin.innerHTML = `
    <div class="t-card-title">Médecin Proche</div>
    <div class="t-card-sub">
      <span class="t-accent">Annuaire médical DOM-TOM</span>
      <span class="t-dim2"> · TypeScript · Next.js · Supabase</span>
      <span class="t-tag green" style="margin-left:.3rem">Full-stack</span>
    </div>
    <div class="t-card-body">
      Application web qui facilite la recherche de médecins pour les habitants des DOM-TOM. Interface, base de données et logique de recherche conçues de bout en bout. Responsive, prête pour le déploiement.
    </div>
    <div class="t-card-tags">
      <span class="t-tag accent">TypeScript</span>
      <span class="t-tag blue">Next.js</span>
      <span class="t-tag green">Supabase</span>
      <span class="t-tag">Modélisation BDD</span>
    </div>
    <div style="margin-top:.6rem;font-size:.82rem">
      <a href="https://github.com/DaVeinOUT/medecin-proche" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">→ GitHub</a>
    </div>
  `;
  nodes.push(medecin);
  nodes.push(blank());

  const algoCard = el('div', 't-card');
  algoCard.innerHTML = `
    <div class="t-card-title">Algo Visualizer</div>
    <div class="t-card-sub">
      <span class="t-accent">Projet solo</span>
      <span class="t-dim2"> · Vanilla JS · 2025</span>
      <span class="t-tag blue" style="margin-left:.3rem">Perso</span>
    </div>
    <div class="t-card-body">
      Visualiseur interactif d'algorithmes (5 tris, 3 pathfinding, 3 structures de données) animés en temps réel sur canvas HTML5. Aucune dépendance, aucun build step.
    </div>
    <div class="t-card-tags">
      <span class="t-tag accent">Algorithmique</span>
      <span class="t-tag blue">Canvas API</span>
      <span class="t-tag">Vanilla JS</span>
      <span class="t-tag green">Pathfinding</span>
    </div>
    <div style="margin-top:.6rem;font-size:.82rem">
      <a href="https://algo-visualizer-gamma-three.vercel.app" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">→ Démo live</a>
      <span class="t-dim2"> · </span>
      <a href="https://github.com/DaVeinOUT/algo-visualizer" target="_blank" rel="noopener" style="color:var(--text-2);text-decoration:none">GitHub</a>
    </div>
  `;
  nodes.push(algoCard);

  const pfCard = el('div', 't-card');
  pfCard.innerHTML = `
    <div class="t-card-title">Ce portfolio</div>
    <div class="t-card-sub">
      <span class="t-accent">Site + terminal</span>
      <span class="t-dim2"> · HTML · CSS · JS — fait main</span>
    </div>
    <div class="t-card-body">
      Réseau 3D projeté à la main en canvas 2D sur la page d'accueil, et ce terminal interactif : commandes, autocomplétion, historique, thèmes… et un snake caché.
    </div>
    <div style="margin-top:.6rem;font-size:.82rem">
      <a href="https://github.com/DaVeinOUT/mon-portfolio" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">→ GitHub</a>
    </div>
  `;
  nodes.push(pfCard);

  nodes.push(blank());
  nodes.push(line('<span class="t-dot"></span><span class="t-green t-dim">Recherche alternance · Paris / Île-de-France.</span>'));
  nodes.push(blank());
  printLines(nodes);
}

function cmdEducation() {
  const nodes = [
    el('span', 't-section', 'Formation'),
    blank(),
  ];

  const oc = el('div', 't-card');
  oc.innerHTML = `
    <div class="t-card-title">Technicien Informatique — OpenClassrooms</div>
    <div class="t-card-sub">
      <span class="t-accent">Diplôme de niveau 5 (bac+2, RNCP)</span>
      <span class="t-dim2"> — Alternance à venir</span>
      <span class="t-tag green" style="margin-left:.3rem">Je cherche l'entreprise</span>
    </div>
    <div class="t-card-body">
      Installation et configuration de postes et serveurs, administration et
      sécurisation de parc, réseaux, support utilisateur, automatisation PowerShell.
      Outils au programme : Active Directory/GPO, GLPI/ITIL, Nagios/OCS, Veeam.
    </div>
    <div class="t-card-tags">
      <span class="t-tag accent">Windows & Linux</span>
      <span class="t-tag blue">Active Directory</span>
      <span class="t-tag green">PowerShell</span>
      <span class="t-tag">GLPI · ITIL</span>
      <span class="t-tag">Réseaux</span>
    </div>
  `;
  nodes.push(oc);
  nodes.push(blank());

  const piscine = el('div', 't-card');
  piscine.innerHTML = `
    <div class="t-card-title">Piscine — École 42</div>
    <div class="t-card-sub">
      <span class="t-accent">École 42</span>
      <span class="t-dim2"> — Paris · Août 2025</span>
      <span class="t-tag blue" style="margin-left:.3rem">Immersion</span>
    </div>
    <div class="t-card-body">
      Immersion intensive de 4 semaines : programmation en C, shell scripting,
      algorithmique et gestion de projet en peer-to-peer. Apprentissage
      sous pression réelle, évaluation par les pairs, travail en équipe.
    </div>
    <div class="t-card-tags">
      <span class="t-tag purple">C</span>
      <span class="t-tag blue">Shell</span>
      <span class="t-tag accent">Algorithmique</span>
      <span class="t-tag green">Peer-to-peer</span>
      <span class="t-tag">Git</span>
    </div>
  `;
  nodes.push(piscine);
  nodes.push(blank());

  const online = el('div', 't-card');
  online.innerHTML = `
    <div class="t-card-title">Computer Science — Career Path</div>
    <div class="t-card-sub">
      <span class="t-accent">Codecademy</span>
      <span class="t-dim2"> — En cours · Certification visée 2026</span>
      <span class="t-tag blue" style="margin-left:.3rem">Career Path</span>
    </div>
    <div style="margin:.5rem 0 .4rem">
      <div class="skill-bar-bg" style="height:5px">
        <div class="skill-bar-fill accent" data-pct="31" style="transition:width 1.1s cubic-bezier(.22,.68,0,1.18)"></div>
      </div>
    </div>
    <div class="t-card-body">
      Algorithmique, structures de données, Python, bases de données et
      architecture des systèmes. Parcours complet orienté fondamentaux
      de l'informatique.
    </div>
    <div class="t-card-tags">
      <span class="t-tag accent">Python</span>
      <span class="t-tag blue">Algorithmique</span>
      <span class="t-tag">Structures de données</span>
      <span class="t-tag green">SQL</span>
    </div>
  `;
  nodes.push(online);
  nodes.push(blank());

  const bac = el('div', 't-card');
  bac.innerHTML = `
    <div class="t-card-title">Baccalauréat général et technologique</div>
    <div class="t-card-sub">
      <span class="t-accent">Lycée Melkior-Garré</span>
      <span class="t-dim2"> — Guyane · 2023</span>
    </div>
  `;
  nodes.push(bac);
  nodes.push(blank());
  nodes.push(line('<span class="t-dim2">→ Tape </span><span class="t-accent">learning</span><span class="t-dim2"> pour la progression détaillée.</span>'));
  nodes.push(blank());
  printLines(nodes);

  setTimeout(() => {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 80);
}

function cmdLearning() {
  const CS_MODULES = [
    { name: 'Intro to Programming',    pct: 59,  done: false },
    { name: 'Intro to Data Structures',pct: 84,  done: false },
    { name: 'Linked Lists',            pct: 35,  done: false },
    { name: 'Queues, Stacks, HashMaps',pct: 0,   done: false },
    { name: 'Algorithms',              pct: 4,   done: false, current: true },
    { name: 'Trees and Graphs',        pct: 0,   done: false },
    { name: 'Databases',               pct: 0,   done: false },
    { name: 'Computer Architecture',   pct: 0,   done: false },
    { name: 'Math for CS',             pct: 0,   done: false },
    { name: 'Interview Prep',          pct: 0,   done: false },
  ];

  const OTHER_COURSES = [
    { title: 'Learn CSS',                         type: 'Course',     pct: 45,  color: 'blue'   },
    { title: 'Learn HTML',                        type: 'Course',     pct: 100, color: 'green'  },
    { title: 'Learn C',                           type: 'Skill Path', pct: 12,  color: 'purple' },
    { title: 'How to Make a Website with NameCheap', type: 'Course', pct: 40,  color: 'green'  },
  ];

  const nodes = [
    el('span', 't-section', 'Formation en ligne — Codecademy'),
    blank(),
  ];

  /* ── Career Path CS — carte principale ── */
  const csCard = el('div', 't-card');
  const modulesHtml = CS_MODULES.map(m => {
    const label = m.current
      ? `<span class="t-accent" style="font-size:10px">▶ en cours</span>`
      : (m.pct === 100 ? `<span class="t-green" style="font-size:10px">✓</span>` : '');
    return `
      <div class="skill-row" style="margin:.22rem 0">
        <span class="skill-name" style="font-size:11px;color:${m.current ? 'var(--accent)' : 'var(--text-2)'}">${escHtml(m.name)}</span>
        <div class="skill-bar-bg">
          <div class="skill-bar-fill accent" data-pct="${m.pct}"></div>
        </div>
        <span class="skill-pct" style="width:52px;text-align:right;font-size:10px">${m.pct > 0 ? m.pct + '%' : ''} ${label}</span>
      </div>`;
  }).join('');

  csCard.innerHTML = `
    <div class="t-card-title" style="font-size:15px">Computer Science — Career Path</div>
    <div class="t-card-sub">
      <span class="t-accent">Codecademy</span>
      <span class="t-dim2"> · Python · Algorithmique · Structures de données · Bases de données</span>
    </div>
    <div style="margin:.5rem 0 .3rem;display:flex;align-items:center;gap:.8rem">
      <div class="skill-bar-bg" style="flex:1;height:6px">
        <div class="skill-bar-fill accent" data-pct="31" style="transition:width 1.2s cubic-bezier(.22,.68,0,1.18)"></div>
      </div>
      <span class="t-accent t-bold" style="font-size:13px;flex-shrink:0">31%</span>
    </div>
    <div class="t-card-body" style="margin-top:.8rem">${modulesHtml}</div>
    <div class="t-card-tags" style="margin-top:.8rem">
      <span class="t-tag accent">Python</span>
      <span class="t-tag blue">Algorithmique</span>
      <span class="t-tag">Structures de données</span>
      <span class="t-tag green">SQL</span>
      <span class="t-tag">Architecture</span>
    </div>
  `;
  nodes.push(csCard);
  nodes.push(blank());

  /* ── Autres cours ── */
  nodes.push(el('div', 'skill-group-title', 'Autres cours'));

  OTHER_COURSES.forEach(c => {
    const card = el('div', 't-card');
    const pctLabel = c.pct === 100
      ? '<span class="t-green t-bold">✓ Terminé</span>'
      : `<span class="t-dim2">${c.pct}%</span>`;
    card.innerHTML = `
      <div class="t-card-sub" style="justify-content:space-between">
        <div>
          <span class="t-bold" style="color:var(--text);font-size:12.5px">${escHtml(c.title)}</span>
          <span class="t-dim2" style="font-size:10.5px"> · ${escHtml(c.type)}</span>
        </div>
        ${pctLabel}
      </div>
      <div style="margin:.45rem 0 0">
        <div class="skill-bar-bg" style="height:4px">
          <div class="skill-bar-fill ${c.color}" data-pct="${c.pct}" style="transition:width 1.1s cubic-bezier(.22,.68,0,1.18)"></div>
        </div>
      </div>
    `;
    nodes.push(card);
  });

  nodes.push(blank());
  printLines(nodes);

  setTimeout(() => {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 80);
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
    { label: 'GitHub',      value: 'github.com/DaVeinOUT',       href: 'https://github.com/DaVeinOUT'     },
    { label: 'Localisation',value: 'Paris, France',              href: null                               },
    { label: 'Statut',      value: '●  Recherche alternance · dispo immédiatement', href: null          },
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
  const sections = ['whoami', 'skills', 'projects', 'education', 'learning', 'contact'];
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
    line('Pourquoi recruter Davidson en alternance :'),
    blank(),
    line(' ✦  <span class="t-accent">Alternance</span> — contrat d\'apprentissage 12 mois · 4 j entreprise / 1 j formation'),
    line(' ✦  <span class="t-accent">Terrain</span> — 6 mois de fibre optique chez Solutions 30 (OTDR, raccordements)'),
    line(' ✦  <span class="t-accent">Intensif</span> — Piscine École 42 : C, shell, algo, peer-to-peer (Août 2025)'),
    line(' ✦  <span class="t-accent">Builder</span> — Médecin Proche (Next.js/Supabase), Algo Visualizer, ce portfolio'),
    line(' ✦  <span class="t-accent">Autodidacte</span> — Codecademy CS, Docker, PowerShell, veille continue'),
    line(' ✦  <span class="t-accent">Disponible</span> — immédiatement · Paris / Hauts-de-Seine / Île-de-France'),
    blank(),
    line('<span class="t-dim">→ </span><span class="t-accent">davedorelus025@icloud.com</span>'),
    line('<span class="t-dim">→ </span><span class="t-text">07 69 59 54 72</span>'),
    line('<span class="t-dim">→ Tape </span><span class="t-accent">cv</span><span class="t-dim"> pour télécharger mon CV.</span>'),
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
    case cmd === 'learning':              cmdLearning(); break;
    case cmd === 'contact':               cmdContact();  break;
    case cmd === 'ls':                    cmdLs();       break;
    case cmd === 'clear':                 cmdClear();    break;
    case cmd === 'exit' || cmd === 'gui': window.location.href = 'index.html'; break;
    case cmd === 'theme':                 cmdTheme(arg); break;
    case cmd === 'alternance':            cmdAlternance(); break;
    case cmd === 'cv':                    cmdCv();       break;
    case cmd === 'neofetch':              cmdNeofetch(); break;
    case cmd === 'snake':                 cmdSnake();    break;
    case cmd === 'history':               cmdHistory();  break;
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
  if (e.ctrlKey && !e.metaKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault(); cmdClear(); return;
  }
  if (e.ctrlKey && !e.metaKey && (e.key === 'c' || e.key === 'C') && !window.getSelection().toString()) {
    e.preventDefault(); inputEl.value = ''; closeDropdown(); return;
  }
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
  'Tu recrutes ? Tape <span class="t-accent">alternance</span>.',
  'Un break ? Tape <span class="t-accent">snake</span>.',
  'Tape <span class="t-accent">neofetch</span> pour ma carte d\'identité système.',
  'Essaie <span class="t-accent">sudo hire davidson</span> — accès root garanti.',
];

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(showIdleHint, 20000);
}

function showIdleHint() {
  const hint = IDLE_HINTS[idleCount % IDLE_HINTS.length];
  idleCount++;
  append(line(`<span class="t-dim2">[hint] ${hint}</span>`));
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
        line('<span class="t-purple t-bold">[ok] Konami Code activé — confettis.</span>'),
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
  printLines([line('<span class="t-err">Permission refusée — le terminal persiste.</span>'), blank()]);
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


/* ============================================================
   NOUVELLES COMMANDES — v3
   ============================================================ */

/* ── alternance : pitch recruteur ── */
function cmdAlternance() {
  const card = el('div', 't-card');
  card.innerHTML = `
    <div class="t-card-title">// recruteurs — recherche d'alternance</div>
    <div class="t-card-body">
      <span class="t-dim">Contrat &nbsp;&nbsp;&nbsp;&nbsp;:</span> Apprentissage · 12 mois<br>
      <span class="t-dim">Rythme &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> 4 j entreprise / 1 j formation (jour au choix)<br>
      <span class="t-dim">Démarrage &nbsp;&nbsp;:</span> <span class="t-green">Immédiat</span><br>
      <span class="t-dim">Zones &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span> Paris · Hauts-de-Seine · Île-de-France · Guyane<br>
      <span class="t-dim">Formation &nbsp;&nbsp;:</span> Technicien Informatique — OpenClassrooms (bac+2, RNCP 5)
    </div>
    <div style="margin-top:.7rem;font-size:.85rem">
      <a href="mailto:davedorelus025@icloud.com?subject=Alternance%20Technicien%20Informatique" style="color:var(--accent);text-decoration:none">→ davedorelus025@icloud.com</a>
    </div>
  `;
  printLines([
    el('span', 't-section', 'Alternance'),
    blank(),
    card,
    blank(),
    line('<span class="t-dim2">Tape </span><span class="t-accent">cv</span><span class="t-dim2"> pour le PDF, ou </span><span class="t-accent">sudo hire davidson</span><span class="t-dim2"> pour la version fun.</span>'),
    blank(),
  ]);
}

/* ── cv : téléchargement du PDF ── */
function cmdCv() {
  printLines([
    line('<span class="t-dim">$</span> wget cv-davidson-dorelus.pdf'),
    line('<span class="t-green">Téléchargement lancé ✓</span>'),
    (() => {
      const a = el('a', 't-contact-link');
      a.href = 'assets/cv-davidson-dorelus.pdf';
      a.download = 'CV_Davidson_Dorelus.pdf';
      a.innerHTML = '<span class="t-contact-label">CV (PDF)</span><span class="t-contact-val">clique ici si le téléchargement n\'a pas démarré</span>';
      return a;
    })(),
    blank(),
  ]);
  const a = document.createElement('a');
  a.href = 'assets/cv-davidson-dorelus.pdf';
  a.download = 'CV_Davidson_Dorelus.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ── history ── */
function cmdHistory() {
  if (history.length <= 1) {
    printLines([line('<span class="t-dim">Historique vide.</span>'), blank()]);
    return;
  }
  const rows = history.slice(1, 16).map((h, i) =>
    line(`<span class="t-dim2">${String(i + 1).padStart(3, ' ')}</span>  ${escHtml(h)}`)
  );
  printLines([...rows, blank()]);
}

/* ── neofetch : carte d'identité système ── */
function cmdNeofetch() {
  const art = [
    '██████╗ ██████╗ ',
    '██╔══██╗██╔══██╗',
    '██║  ██║██║  ██║',
    '██║  ██║██║  ██║',
    '██████╔╝██████╔╝',
    '╚═════╝ ╚═════╝ ',
  ].join('\n');

  const fields = [
    ['OS',       'DavidsonOS 1.0 (Guyane → Paris)'],
    ['Host',     'recherche-alternance.local'],
    ['Kernel',   'technicien-informatique-rncp5'],
    ['Shell',    'bash · powershell'],
    ['Packages', 'fibre, réseaux, linux, AD, docker'],
    ['IDE',      'VS Code · Git'],
    ['CPU',      'Motivation @ 100%'],
    ['Uptime',   'apprend depuis 2023 sans reboot'],
    ['Contact',  'davedorelus025@icloud.com'],
  ];

  const wrap = el('div', 't-card');
  wrap.innerHTML = `
    <div style="display:flex;gap:1.4rem;flex-wrap:wrap;align-items:flex-start">
      <pre class="t-ascii" style="margin:0">${art}</pre>
      <div style="font-size:.85rem;line-height:1.9;min-width:230px">
        <div><span class="t-accent t-bold">davidson</span><span class="t-dim">@</span><span class="t-accent t-bold">portfolio</span></div>
        <div class="t-dim">─────────────────</div>
        ${fields.map(([k, v]) => `<div><span class="t-accent">${k}</span><span class="t-dim"> : </span>${v}</div>`).join('')}
        <div style="margin-top:.5rem">
          <span style="display:inline-block;width:22px;height:11px;background:var(--accent)"></span><span style="display:inline-block;width:22px;height:11px;background:var(--green)"></span><span style="display:inline-block;width:22px;height:11px;background:var(--blue)"></span><span style="display:inline-block;width:22px;height:11px;background:var(--red)"></span><span style="display:inline-block;width:22px;height:11px;background:var(--purple)"></span>
        </div>
      </div>
    </div>
  `;
  printLines([blank(), wrap, blank()]);
}

/* ── snake : mini-jeu ── */
let snakeActive = false;

function cmdSnake() {
  if (snakeActive) {
    printLines([line('<span class="t-dim">Snake tourne déjà — Échap ou X pour quitter.</span>'), blank()]);
    return;
  }
  snakeActive = true;

  const COLS = 22, ROWS = 13, CELL = 16, W = COLS * CELL, H = ROWS * CELL;
  const card = el('div', 't-card');
  card.innerHTML = `<div class="t-card-title">snake</div>
    <div class="t-card-sub"><span class="t-dim2">Flèches / ZQSD · swipe sur mobile · Échap ou X pour quitter</span></div>`;
  const cv = document.createElement('canvas');
  cv.width = W * 2; cv.height = H * 2;
  cv.style.cssText = 'width:100%;max-width:' + W + 'px;display:block;margin:.5rem 0;border-radius:6px;touch-action:none';
  const scoreEl = el('div', 't-card-sub');
  scoreEl.innerHTML = '<span class="t-accent">score : 0</span>';
  card.appendChild(cv);
  card.appendChild(scoreEl);
  append(card, blank());

  const c = cv.getContext('2d');
  c.scale(2, 2);
  let snake = [{ x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }];
  let dir = { x: 1, y: 0 }, nextDir = dir, pts = 0, dead = false, last = 0, raf = 0;
  let food = place();

  function place() {
    while (true) {
      const f = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
      if (!snake.some(s => s.x === f.x && s.y === f.y)) return f;
    }
  }

  function draw() {
    c.fillStyle = '#0d0d10';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#5ef0b0';
    c.beginPath();
    c.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, 7);
    c.fill();
    snake.forEach((s, i) => {
      c.fillStyle = i === 0 ? '#f0d284' : '#c9a84c';
      c.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
    if (dead) {
      c.fillStyle = 'rgba(13,13,16,.72)';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#f0d284';
      c.font = '600 18px "JetBrains Mono", monospace';
      c.textAlign = 'center';
      c.fillText('GAME OVER — ' + pts + ' pts', W / 2, H / 2);
      c.textAlign = 'left';
    }
  }

  function end() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    draw();
    snakeActive = false;
    document.removeEventListener('keydown', onKey, true);
    printLines([
      line(`<span class="t-accent">Game over — score : ${pts}</span>`),
      line('<span class="t-dim2">Retape <span class="t-accent">snake</span> pour rejouer.</span>'),
      blank(),
    ]);
    inputEl.focus();
  }

  function step(ts) {
    if (dead) return;
    raf = requestAnimationFrame(step);
    if (ts - last < 110) return;
    last = ts;
    dir = nextDir;
    const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (h.x < 0 || h.x >= COLS || h.y < 0 || h.y >= ROWS || snake.some(s => s.x === h.x && s.y === h.y)) {
      return end();
    }
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) {
      pts += 10;
      scoreEl.innerHTML = '<span class="t-accent">score : ' + pts + '</span>';
      food = place();
    } else {
      snake.pop();
    }
    draw();
  }

  function turn(m) {
    if (m.x !== -dir.x || m.y !== -dir.y) nextDir = m;
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
      e.preventDefault(); e.stopPropagation(); end(); return;
    }
    const map = {
      ArrowUp:    { x: 0, y: -1 }, z: { x: 0, y: -1 }, w: { x: 0, y: -1 },
      ArrowDown:  { x: 0, y: 1 },  s: { x: 0, y: 1 },
      ArrowLeft:  { x: -1, y: 0 }, q: { x: -1, y: 0 }, a: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },  d: { x: 1, y: 0 },
    };
    const m = map[e.key];
    if (m) { e.preventDefault(); e.stopPropagation(); turn(m); }
  }

  document.addEventListener('keydown', onKey, true);

  let tx = 0, ty = 0;
  cv.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
    if (Math.abs(dx) + Math.abs(dy) < 26) return;
    turn(Math.abs(dx) > Math.abs(dy)
      ? { x: dx > 0 ? 1 : -1, y: 0 }
      : { x: 0, y: dy > 0 ? 1 : -1 });
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: false });

  inputEl.blur();
  draw();
  raf = requestAnimationFrame(step);
}
