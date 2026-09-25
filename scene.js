/* ============================================================
   SCÈNE 3D · la carte du réseau réel (v2.2, lot 2 de l'audit)
   Une station plein écran où le graphe est le SUJET :
   dessin séquencé dans l'ordre du parcours (Pi → branches → SecDash),
   tap mobile (zones ≥ 44 px, premier tap nomme, second ouvre),
   visite automatique après 4 s d'inactivité, densité variable,
   puis retour en fond derrière les autres sections.
   Écran portrait : graphe resserré horizontalement (× 0,55).
   Rendu à la demande : la boucle s'arrête quand plus rien ne bouge.
   ============================================================ */

export async function initScene() {
  let THREE;
  try {
    THREE = await import('three');
  } catch (e) {
    document.body.classList.add('no3d');
    return;
  }

  const canvas = document.getElementById('gl-canvas');
  const labelEl = document.getElementById('net-label');
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Téléphone, quelle que soit l'orientation : petit côté de l'écran < 720 px.
     (innerWidth rangeait un iPhone tenu en paysage parmi les ordinateurs.) */
  const MOBILE = Math.min(screen.width, screen.height) < 720;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  } catch (e) {
    document.body.classList.add('no3d');
    return;
  }

  renderer.setClearColor(0x0a0a0d, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 1.75));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0d, 0.045);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);

  /* ── Palette ── */
  const GOLD  = 0xe8c56a;
  const PALE  = 0xf2eee4;
  const GREEN = 0x5ef0b0;
  const DIM   = 0x8a847b;

  /* ── Le graphe, positions écrites à la main (repère paysage) ──
     draw : ordre du parcours pour la séquence de dessin.
     stations (7) : 0 hero · 1 profil · 2 RÉSEAU (dédiée) ·
     3 compétences · 4 parcours · 5 projets · 6 contact. */
  const NODES = [
    { id: 'rpi',     label: 'Raspberry Pi · le serpent',  section: '#profil',      color: GREEN, pos: [ 0.0, -1.6,  0.0], draw: 1,  stations: [1] },
    { id: 'nsi',     label: 'Terminale NSI',               section: '#parcours',    color: GOLD,  pos: [-2.0, -0.5, -0.2], draw: 2,  stations: [4] },
    { id: 'licence', label: 'Licence info · Guyane',       section: '#parcours',    color: PALE,  pos: [ 2.0, -0.5, -0.2], draw: 3,  stations: [4] },
    { id: 'fibre',   label: 'Stage fibre · Solutions 30',  section: '#parcours',    color: GOLD,  pos: [-3.4,  0.6,  0.3], draw: 4,  stations: [4] },
    { id: 'piscine', label: 'Piscine École 42',            section: '#parcours',    color: PALE,  pos: [ 3.4,  0.6,  0.3], draw: 5,  stations: [4] },
    { id: 'vps',     label: 'VPS Hetzner · Ubuntu',        section: '#projets',     color: GOLD,  pos: [-2.6,  1.7, -0.3], draw: 6,  stations: [3, 5] },
    { id: 'medecin', label: 'Médecin Proche',              section: '#projets',     color: PALE,  pos: [ 2.6,  1.7, -0.3], draw: 7,  stations: [5] },
    { id: 'docker',  label: 'Docker & supervision',        section: '#competences', color: GOLD,  pos: [-1.3,  2.4,  0.1], draw: 8,  stations: [3] },
    { id: 'educa',   label: 'EDUCA',                       section: '#projets',     color: PALE,  pos: [ 1.3,  2.4,  0.1], draw: 9,  stations: [5] },
    { id: 'simplon', label: 'Simplon · TSSR',              section: '#parcours',    color: GOLD,  pos: [-2.2,  3.3,  0.0], draw: 10, stations: [4] },
    { id: 'secdash', label: 'SecDash · le croisement',     section: '#projets',     color: GREEN, pos: [ 0.0,  3.1,  0.4], draw: 11, stations: [5], hero: true },
    { id: 'egg',     label: '192.168.1.42',                href: 'terminal.html',    color: DIM,   pos: [ 4.4,  2.9, -1.0], draw: 12, stations: [], egg: true },
  ];
  const EDGES = [
    ['rpi', 'nsi'], ['rpi', 'licence'],
    ['nsi', 'fibre'], ['licence', 'piscine'],
    ['fibre', 'vps'], ['piscine', 'medecin'],
    ['vps', 'docker'], ['medecin', 'educa'],
    ['docker', 'simplon'],
    ['educa', 'secdash'], ['docker', 'secdash'],
  ];
  const nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));
  const MAXDRAW = Math.max(...NODES.map(n => n.draw), ...EDGES.map((_, i) => 100 + i));

  /* ── Mise en page portrait ──
     Écran plus haut que large : les abscisses sont resserrées (× 0,55) pour que
     les 12 nœuds tiennent dans le champ, de 375 à 440 px de large (vérifié par
     le calcul avec three.js). Sur un écran très allongé, le facteur baisse juste
     assez pour que le nœud le plus excentré garde EDGE_MARGIN px de marge.
     x0 garde l'abscisse d'origine ; pos[0] suit la mise en page, et les
     trajectoires de caméra suivent le même facteur. */
  const PORTRAIT_X = 0.55;
  const EDGE_MARGIN = 12;
  let layoutX = 1;
  NODES.forEach(n => { n.x0 = n.pos[0]; });

  /* ── Texture halo ── */
  function glowTexture(inner, outer) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.35, outer);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const TEX = glowTexture('rgba(255,255,255,1)', 'rgba(255,220,140,.55)');

  /* ── Nœuds : sprites ── */
  const matCache = {};
  const sprites = [];
  NODES.forEach(n => {
    if (!matCache[n.color]) {
      matCache[n.color] = new THREE.SpriteMaterial({
        map: TEX, color: n.color, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
    }
    const s = new THREE.Sprite(matCache[n.color].clone());
    s.position.set(n.pos[0], n.pos[1], n.pos[2]);
    s.scale.setScalar(n.egg ? 0.16 : (n.hero ? 0.5 : 0.34));
    s.userData = n;
    s.material.opacity = 0.9;
    scene.add(s);
    sprites.push(s);
    n.sprite = s;
    n.baseScale = s.scale.x;
  });

  /* ── Arêtes ── */
  const edgeLines = EDGES.map(([a, b], i) => {
    const pa = nodeById[a].pos, pb = nodeById[b].pos;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pa[0], pa[1], pa[2]),
      new THREE.Vector3(pb[0], pb[1], pb[2]),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: (b === 'secdash') ? GREEN : GOLD,
      transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return { a, b, geo, mat, draw: 100 + i };
  });

  /* Facteur portrait pour un canvas w × h, calé sur la caméra de la station
     Réseau (centrée : x = 0) : demi-largeur visible à la profondeur de chaque
     nœud le long de l'axe de visée, moins la marge, divisée par son abscisse
     d'origine. */
  function portraitFactor(w, h) {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (w / h);
    const keep = 1 - EDGE_MARGIN / (w / 2);
    const [, cy, cz] = CAM[DEDICATED_STATION], [, ly, lz] = LOOK[DEDICATED_STATION];
    const len = Math.hypot(ly - cy, lz - cz);
    let k = PORTRAIT_X;
    NODES.forEach(n => {
      if (!n.x0) return;
      const depth = ((n.pos[1] - cy) * (ly - cy) + (n.pos[2] - cz) * (lz - cz)) / len;
      k = Math.min(k, depth * tanHalf * keep / Math.abs(n.x0));
    });
    return k;
  }

  /* Applique le facteur horizontal aux nœuds et aux arêtes (les impulsions
     relisent pos à chaque image). Renvoie true si la mise en page a changé. */
  function applyLayout(k) {
    if (k === layoutX) return false;
    layoutX = k;
    NODES.forEach(n => {
      n.pos[0] = n.x0 * k;
      n.sprite.position.x = n.pos[0];
    });
    edgeLines.forEach(el => {
      const p = el.geo.attributes.position;
      p.setX(0, nodeById[el.a].pos[0]);
      p.setX(1, nodeById[el.b].pos[0]);
      p.needsUpdate = true;
      el.geo.computeBoundingSphere();
    });
    return true;
  }

  /* ── Poussière : un seul nuage, créé une fois ──
     La station Réseau (dédiée) affiche tous ses points, les autres stations
     seulement les premiers (setDrawRange) : ni destruction ni recréation,
     pas de saut visuel, et le plafond est celui du nuage complet.
     Budget total, nœuds (12) et impulsions compris :
     ordinateur 1 834 points dans la station Réseau, 1 434 ailleurs (plafond 2 000) ;
     téléphone    800 points dans la station Réseau,   400 ailleurs (plafond 800). */
  const DUST_DEDICATED = MOBILE ? 778 : 1800;   /* 778 + 12 nœuds + 10 impulsions = 800 */
  const DUST_BACK = MOBILE ? 378 : 1400;        /* 378 + 12 nœuds + 10 impulsions = 400 */

  function makeDust(count) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3.5 + Math.random() * 5.5;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r * 0.7;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r - 2.5;
      const gold = Math.random() < 0.3;
      col[i * 3]     = gold ? 0.55 : 0.38;
      col[i * 3 + 1] = gold ? 0.47 : 0.37;
      col[i * 3 + 2] = gold ? 0.26 : 0.34;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.05, map: TEX, vertexColors: true, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
  }
  const dust = makeDust(DUST_DEDICATED);
  dust.geometry.setDrawRange(0, DUST_BACK);
  scene.add(dust);
  let dustIsDedicated = false;
  function setDust(dedicated) {
    if (dedicated === dustIsDedicated) return;
    dust.geometry.setDrawRange(0, dedicated ? DUST_DEDICATED : DUST_BACK);
    dustIsDedicated = dedicated;
  }

  /* ── Impulsions : des paquets sur des liens réels ── */
  const NP = MOBILE ? 10 : 22;
  const pulses = [];
  for (let i = 0; i < NP; i++) {
    pulses.push({ e: (Math.random() * EDGES.length) | 0, t: Math.random(), sp: 0.006 + Math.random() * 0.012 });
  }
  const puPos = new Float32Array(NP * 3);
  const puGeo = new THREE.BufferGeometry();
  const puAttr = new THREE.BufferAttribute(puPos, 3);
  puAttr.setUsage(THREE.DynamicDrawUsage);
  puGeo.setAttribute('position', puAttr);
  const pulsePts = new THREE.Points(puGeo, new THREE.PointsMaterial({
    size: 0.16, map: TEX, color: GREEN, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  /* Positions réécrites à chaque image : la sphère englobante calculée au
     premier rendu serait périmée (surtout après un changement d'orientation). */
  pulsePts.frustumCulled = false;
  scene.add(pulsePts);

  /* ── Trajectoires caméra (7 stations), abscisses × layoutX ── */
  const STATIONS = 7;
  const DEDICATED_STATION = 2;
  const CAM = [
    [ 0.0,  0.3, 8.2],
    [ 0.0, -0.9, 5.6],
    [ 0.0,  0.9, 7.6],
    [-1.9,  1.5, 5.2],
    [ 0.0,  0.5, 6.8],
    [ 0.4,  2.3, 5.6],
    [ 0.0,  1.2, 7.4],
  ];
  const LOOK = [
    [ 0.0,  0.6, 0],
    [ 0.0, -1.4, 0],
    [ 0.0,  0.8, 0],
    [-1.9,  1.9, 0],
    [ 0.0,  0.4, 0],
    [ 0.4,  2.2, 0],
    [ 0.0,  0.9, 0],
  ];

  /* ── Scroll → station ── */
  let gTarget = 0, gCur = 0;
  let anchors = [];
  function readAnchors() { anchors = [...document.querySelectorAll('.station')].map(s => s.offsetTop); }
  function readScroll() {
    if (anchors.length < 2) { gTarget = 0; return; }
    const sy = window.scrollY;
    let g = anchors.length - 1;
    for (let i = 0; i < anchors.length - 1; i++) {
      if (sy < anchors[i + 1]) {
        const span = Math.max(1, anchors[i + 1] - anchors[i]);
        g = i + Math.min(1, Math.max(0, (sy - anchors[i]) / span));
        break;
      }
    }
    gTarget = Math.min(STATIONS - 1, Math.max(0, g));
  }
  window.addEventListener('scroll', () => { readScroll(); armTour(); wake(); }, { passive: true });
  window.addEventListener('load', () => { readAnchors(); readScroll(); });
  function inDedicated() { return Math.round(gCur) === DEDICATED_STATION; }

  /* ── Séquence de dessin ── */
  let drawProgress = 0;
  let dedicatedSeen = false;
  let drawLabelNode = null;

  /* ── Picking écran : zones tactiles ≥ 44 px, indépendant du fps ──
     Le canvas est sous <main> : on écoute au niveau window et on
     ignore les taps qui visent du contenu (liens, texte, nav).
     viewW × viewH : taille AFFICHÉE du canvas, la même que celle du rendu. */
  let px = -1, py = -1, downX = 0, downY = 0, pointerIsTouch = false;
  let hovered = null, pinned = null;
  let viewW = 1, viewH = 1;

  function isContent(t) {
    return !!(t && t.closest && t.closest('a, button, input, textarea, [role], .st-inner, #nav, #dots, .skip-link, #fast'));
  }

  const pickV = new THREE.Vector3();
  function pickNode(cx, cy) {
    let best = null, bestD = MOBILE ? 30 : 22;  /* rayon px : 60 px de zone mobile ≥ 44 px */
    for (const n of NODES) {
      pickV.set(n.pos[0], n.pos[1], n.pos[2]).project(camera);
      const sx = (pickV.x + 1) / 2 * viewW;
      const sy = (-pickV.y + 1) / 2 * viewH;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;   /* pas de :hover collé sur iOS */
    pointerIsTouch = false;
    px = e.clientX; py = e.clientY;
    /* Boucle suspendue : le survol ne change que le DOM (curseur, étiquette),
       pas besoin de redessiner la scène. */
    if (!running) { updateHover(); placeLabel(); }
  }, { passive: true });

  window.addEventListener('pointerdown', e => {
    downX = e.clientX; downY = e.clientY;
    pointerIsTouch = e.pointerType === 'touch';
  }, { passive: true });

  window.addEventListener('pointerup', e => {
    userTouched();
    if (isContent(e.target)) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return; /* c'était un scroll */
    const n = pickNode(e.clientX, e.clientY);
    if (n) {
      if (pointerIsTouch && pinned === n) openNode(n);       /* second tap : ouvre */
      else if (pointerIsTouch) { pinned = n; showLabel(n); } /* premier tap : nomme */
      else openNode(n);
    } else {
      pinned = null;
      hideLabel();
    }
  }, { passive: true });

  function openNode(n) {
    pinned = null;
    hideLabel();
    if (n.href) window.location.href = n.href;
    else if (n.section) window.location.hash = n.section.slice(1);
  }

  /* ── Étiquette ──
     Sa taille est mesurée quand le texte change, puis sa position est bornée
     à la partie visible de l'écran : elle ne sort plus par les bords. */
  const LABEL_MARGIN = 8;
  let labelW = 0, labelH = 0;
  function showLabel(n) {
    if (!labelEl) return;
    labelEl.textContent = n.label + ((n.href || n.section) ? ' · ' + (n.href ? 'ouvrir' : 'voir la section') : '');
    labelEl.classList.add('on');
    labelW = labelEl.offsetWidth;
    labelH = labelEl.offsetHeight;
    placeLabel();
  }
  function hideLabel() {
    if (!labelEl) return;
    labelEl.classList.remove('on');
  }

  const projV = new THREE.Vector3();
  function placeLabel() {
    if (!labelEl) return;
    const n = pinned || hovered || (autoTour ? autoNode : null) || drawLabelNode;
    if (!n) return;
    n.sprite.getWorldPosition(projV);
    projV.project(camera);
    /* Bornes : l'écran visible, pas le canvas (100vh passe sous la barre de Safari).
       L'étiquette est centrée sur x et posée au-dessus de y (translate -50 %, -100 %). */
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const half = labelW / 2;
    let x = (projV.x + 1) / 2 * viewW;
    let y = (-projV.y + 1) / 2 * viewH - 16;
    x = (labelW + 2 * LABEL_MARGIN >= vw)
      ? vw / 2
      : Math.min(Math.max(x, LABEL_MARGIN + half), vw - LABEL_MARGIN - half);
    y = Math.min(Math.max(y, LABEL_MARGIN + labelH), vh - LABEL_MARGIN);
    labelEl.style.left = x + 'px';
    labelEl.style.top  = y + 'px';
  }

  function updateHover() {
    if (pointerIsTouch || px < 0) return;
    const n = pickNode(px, py);
    if (n !== hovered) {
      hovered = n;
      document.body.style.cursor = n ? 'pointer' : '';
      if (n) showLabel(n);
      else if (!pinned) hideLabel();
    }
  }

  /* ── Visite automatique : 4 s sans interaction dans #reseau ──
     Un minuteur remplace l'ancienne boucle rAF permanente : défiler ou
     toucher réarme le compte à rebours. */
  const TOUR_DELAY = 4000;
  let tourTimer = 0;
  let autoTour = false, autoNode = null, autoT = 0;

  function armTour() {
    clearTimeout(tourTimer);
    if (REDUCED) return;
    tourTimer = setTimeout(() => {
      if (autoTour || document.hidden || document.body.classList.contains('fast') || !inDedicated()) return;
      autoTour = true;
      autoT = 0;
      wake();
    }, TOUR_DELAY);
  }

  function userTouched() {
    if (autoTour) { autoTour = false; autoNode = null; hideLabel(); }
    armTour();
    wake();
  }

  /* ── Mise en avant par station + séquence + visite auto ──
     snap : applique directement les valeurs cibles (image fixe du mode réduit).
     Renvoie true tant qu'une opacité ou une échelle n'a pas rejoint sa cible
     (le battement de SecDash, ambiant, n'en fait pas partie). */
  function applyHighlight(g, time, snap) {
    const k = Math.round(g);
    const dedicated = k === DEDICATED_STATION;
    const showAll = k === 0 || k === STATIONS - 1;
    const fo = snap ? 1 : 0.08, fs = snap ? 1 : 0.15;
    let moving = false;

    NODES.forEach(n => {
      let target;
      const drawn = !dedicatedSeen || n.draw <= drawProgress;
      if (dedicated && !drawn) target = 0;
      else if (autoTour && autoNode && autoNode !== n) target = 0.22;
      else if (autoTour && autoNode === n) target = 1;
      else if (dedicated) target = n.egg ? 0.55 : 0.95;
      else {
        const on = showAll || (n.stations && n.stations.includes(k));
        target = n.egg ? 0.55 : (on ? 0.95 : 0.28);
      }
      const m = n.sprite.material;
      m.opacity += (target - m.opacity) * fo;
      if (Math.abs(target - m.opacity) > 0.004) moving = true;

      let sc = n.baseScale;
      if (n.hero) sc = n.baseScale * (1 + Math.sin(time * 2.2) * 0.07);  /* SecDash pulse */
      else if (dedicated && !drawn) sc = 0.001;
      n.sprite.scale.x += (sc - n.sprite.scale.x) * fs;
      n.sprite.scale.y = n.sprite.scale.x;
      if (!n.hero && Math.abs(sc - n.sprite.scale.x) > 0.002) moving = true;
    });

    edgeLines.forEach(el => {
      const drawn = !dedicatedSeen || el.draw <= drawProgress;
      let target;
      if (dedicated && !drawn) target = 0;
      else if (autoTour) target = 0.3;
      else if (dedicated) target = 0.4;
      else {
        const a = nodeById[el.a], b = nodeById[el.b];
        const on = showAll || (a.stations && a.stations.includes(k)) || (b.stations && b.stations.includes(k));
        target = on ? 0.34 : 0.08;
      }
      el.mat.opacity += (target - el.mat.opacity) * fo;
      if (Math.abs(target - el.mat.opacity) > 0.004) moving = true;
    });
    return moving;
  }

  /* ── Caméra ── */
  const ease = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const look = new THREE.Vector3();
  function placeCamera(g) {
    const k = Math.min(STATIONS - 2, Math.floor(g));
    const e = ease(Math.min(1, Math.max(0, g - k)));
    camera.position.set(
      lerp(CAM[k][0], CAM[k + 1][0], e) * layoutX,
      lerp(CAM[k][1], CAM[k + 1][1], e),
      lerp(CAM[k][2], CAM[k + 1][2], e)
    );
    look.set(
      lerp(LOOK[k][0], LOOK[k + 1][0], e) * layoutX,
      lerp(LOOK[k][1], LOOK[k + 1][1], e),
      lerp(LOOK[k][2], LOOK[k + 1][2], e)
    );
    camera.lookAt(look);
    /* à jour tout de suite : étiquette et survol projettent avant le rendu */
    camera.updateMatrixWorld();
  }

  /* ── Boucle, à la demande ──
     Elle tourne tant que la caméra bouge ou qu'une transition est en cours,
     puis s'arrête après IDLE_BEFORE_PAUSE ms d'immobilité : les impulsions se
     figent et tout repart au premier défilement, toucher ou redimensionnement. */
  const IDLE_BEFORE_PAUSE = 2500;
  let running = false, rafId = 0, lastTs = 0, lastBusy = 0;

  function wake() {
    lastBusy = performance.now();
    if (running || REDUCED || document.hidden || document.body.classList.contains('fast')) return;
    running = true;
    lastTs = 0;
    rafId = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  function frame(ts) {
    if (!running) return;

    const time = ts / 1000;
    const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0.016);
    lastTs = ts;
    gCur += (gTarget - gCur) * 0.06;
    if (Math.abs(gTarget - gCur) < 0.0005) gCur = gTarget;

    /* séquence : vitesse en unités/seconde, identique à 30 ou 60 fps */
    const drawing = dedicatedSeen && inDedicated() && drawProgress < MAXDRAW;
    if (drawing) {
      drawProgress = Math.min(MAXDRAW, drawProgress + 22 * dt);
      /* le nœud qui vient d'apparaître se nomme, le temps du dessin */
      let cur = null;
      for (const n of NODES) if (n.draw <= drawProgress) cur = n;
      if (cur && cur !== drawLabelNode) { drawLabelNode = cur; showLabel(cur); }
    }
    if (drawProgress >= MAXDRAW && drawLabelNode) {
      drawLabelNode = null;
      if (!pinned && !hovered) hideLabel();
    }
    if (inDedicated()) dedicatedSeen = true;
    if (!inDedicated()) drawProgress = Math.max(drawProgress, MAXDRAW); /* ailleurs : tout tracé */

    if (pinned && Math.abs(gCur - DEDICATED_STATION) > 0.6) { pinned = null; hideLabel(); }
    if (autoTour && !inDedicated()) { autoTour = false; autoNode = null; hideLabel(); }

    setDust(inDedicated());

    /* visite automatique */
    if (autoTour) {
      autoT += dt;
      const idx = Math.floor(autoT / 1.15) % NODES.length;
      const n = NODES[idx];
      if (n !== autoNode) {
        autoNode = n;
        showLabel(n);
      }
    }

    const moving = applyHighlight(gCur, time, false);

    for (let i = 0; i < NP; i++) {
      const pl = pulses[i];
      pl.t += pl.sp * (inDedicated() ? 1.6 : 1);
      if (pl.t >= 1) { pl.t = 0; pl.e = (Math.random() * EDGES.length) | 0; }
      const pa = nodeById[EDGES[pl.e][0]].pos, pb = nodeById[EDGES[pl.e][1]].pos;
      puPos[i * 3]     = lerp(pa[0], pb[0], pl.t);
      puPos[i * 3 + 1] = lerp(pa[1], pb[1], pl.t);
      puPos[i * 3 + 2] = lerp(pa[2], pb[2], pl.t);
    }
    puAttr.needsUpdate = true;

    dust.rotation.y = Math.sin(time * 0.05) * 0.05;

    placeCamera(gCur);
    updateHover();
    placeLabel();
    renderer.render(scene, camera);

    if (gCur !== gTarget || drawing || autoTour || moving) lastBusy = ts;
    if (ts - lastBusy > IDLE_BEFORE_PAUSE) { running = false; return; }
    rafId = requestAnimationFrame(frame);
  }

  /* ── Image fixe (réglage « Réduire les animations ») ── */
  function renderStatic() {
    const k = Math.min(STATIONS - 1, Math.round(gCur));
    placeCamera(k);
    drawProgress = MAXDRAW;
    dedicatedSeen = true;
    setDust(k === DEDICATED_STATION);
    applyHighlight(k, 0, true);
    renderer.render(scene, camera);
    placeLabel();
  }

  /* ── Resize ──
     Le rendu suit la taille AFFICHÉE du canvas (100vw × 100vh en CSS), pas
     innerWidth × innerHeight : sur iPhone, innerHeight change avec la barre de
     Safari alors que 100vh reste fixe, ce qui étirait l'image et décalait les
     zones de toucher. setSize n'est rappelé que si la taille change vraiment
     (chaque appel efface le canvas). */
  let afterResize = null;   /* mode réduit : redessine l'image fixe */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;   /* canvas masqué (Version rapide) */
    if (w !== viewW || h !== viewH) {
      viewW = w; viewH = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      applyLayout(h > w ? portraitFactor(w, h) : 1);
    }
    readAnchors();
    readScroll();
    if (afterResize) afterResize();
    wake();
  }
  window.addEventListener('resize', resize);
  resize();

  if (REDUCED) {
    /* Scène figée : rendu unique par section, zéro boucle, pas de visite auto. */
    pulsePts.visible = false;
    afterResize = renderStatic;
    let scrollT = 0;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(() => { gCur = gTarget; renderStatic(); }, 120);
    }, { passive: true });
    renderStatic();
    /* tap : le nœud s'ouvre directement, sans raycast animé */
    window.addEventListener('pointerup', e => {
      if (isContent(e.target)) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return;
      const n = pickNode(e.clientX, e.clientY);
      if (n) openNode(n);
    }, { passive: true });
    window.addEventListener('pointerdown', e => {
      downX = e.clientX; downY = e.clientY;
    }, { passive: true });
  } else {
    armTour();
    wake();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause(); else wake();
  });
  new MutationObserver(() => {
    if (document.body.classList.contains('fast')) {
      pause();
      clearTimeout(tourTimer);
      if (autoTour) { autoTour = false; autoNode = null; hideLabel(); }
    } else {
      resize();   /* la fenêtre a pu changer pendant la Version rapide */
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  /* Contexte WebGL rendu par le navigateur (iOS en libère parfois en
     arrière-plan) : three.js le réinitialise, il reste à redessiner. */
  canvas.addEventListener('webglcontextrestored', () => {
    if (REDUCED) renderStatic(); else wake();
  });

  document.body.classList.add('scene-on');
}
