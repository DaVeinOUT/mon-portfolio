/* ============================================================
   SCÈNE 3D · la carte du réseau réel
   Chaque nœud est quelque chose de vrai : au survol il se
   nomme, au clic il ouvre sa section. Racine : le serpent
   Raspberry Pi. Deux branches (matériel / code) qui se
   rejoignent sur SecDash. Three.js en CDN, chargé en différé
   par index.html APRÈS le premier affichage utile.
   ============================================================ */

/* Appelé par index.html via requestIdleCallback. */
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
  const MOBILE = window.innerWidth < 720;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.body.classList.add('no3d');
    return;
  }

  renderer.setClearColor(0x0a0a0d, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 1.75));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0d, 0.045);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);

  /* ── Palette (identique au site, pas de nouvelle couleur) ── */
  const GOLD  = 0xe8c56a;   /* branche matériel & réseau        */
  const PALE  = 0xf2eee4;   /* branche code                     */
  const GREEN = 0x5ef0b0;  /* racine vivante + croisement     */
  const DIM   = 0x8a847b;   /* nœud discret (second regard)    */

  /* ── Le graphe : positions écrites à la main ──
     Branche matériel à gauche, branche code à droite,
     SecDash en haut au centre où les deux se rejoignent. */
  const NODES = [
    { id: 'rpi',     label: 'Raspberry Pi · le serpent',  section: '#profil',     color: GREEN, pos: [ 0.0, -1.6,  0.0], stations: [1] },
    { id: 'nsi',     label: 'Terminale NSI',              section: '#parcours',   color: GOLD,  pos: [-2.0, -0.5, -0.2], stations: [3] },
    { id: 'fibre',   label: 'Stage fibre · Solutions 30', section: '#parcours',   color: GOLD,  pos: [-3.4,  0.6,  0.3], stations: [3] },
    { id: 'vps',     label: 'VPS Hetzner · Ubuntu',       section: '#projets',    color: GOLD,  pos: [-2.6,  1.7, -0.3], stations: [2, 4] },
    { id: 'docker',  label: 'Docker & supervision',       section: '#competences', color: GOLD,  pos: [-1.3,  2.4,  0.1], stations: [2] },
    { id: 'simplon', label: 'Simplon · TSSR',             section: '#parcours',   color: GOLD,  pos: [-2.2,  3.3,  0.0], stations: [3] },
    { id: 'licence', label: 'Licence info · Guyane',      section: '#parcours',   color: PALE,  pos: [ 2.0, -0.5, -0.2], stations: [3] },
    { id: 'piscine', label: 'Piscine École 42',           section: '#parcours',   color: PALE,  pos: [ 3.4,  0.6,  0.3], stations: [3] },
    { id: 'medecin', label: 'Médecin Proche',             section: '#projets',    color: PALE,  pos: [ 2.6,  1.7, -0.3], stations: [4] },
    { id: 'educa',   label: 'EDUCA',                      section: '#projets',    color: PALE,  pos: [ 1.3,  2.4,  0.1], stations: [4] },
    { id: 'secdash', label: 'SecDash · le croisement',    section: '#projets',    color: GREEN, pos: [ 0.0,  3.1,  0.4], stations: [4, 5] },
    { id: 'egg',     label: '192.168.1.42',               href: 'terminal.html',  color: DIM,   pos: [ 4.4,  2.9, -1.0], stations: [], egg: true },
  ];
  const EDGES = [
    ['rpi', 'nsi'], ['nsi', 'fibre'], ['fibre', 'vps'], ['vps', 'docker'], ['docker', 'simplon'],
    ['rpi', 'licence'], ['licence', 'piscine'], ['piscine', 'medecin'], ['medecin', 'educa'],
    ['educa', 'secdash'], ['docker', 'secdash'],
  ];
  const nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));

  /* ── Texture halo réutilisée ── */
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

  /* ── Nœuds : sprites, un matériau par couleur ── */
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
    s.scale.setScalar(n.egg ? 0.16 : 0.34);
    s.userData = n;
    s.material.opacity = 0.9;
    scene.add(s);
    sprites.push(s);
    n.sprite = s;
  });

  /* ── Arêtes : une ligne par lien, opacité animable ── */
  const edgeLines = EDGES.map(([a, b]) => {
    const pa = nodeById[a].pos, pb = nodeById[b].pos;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pa[0], pa[1], pa[2]),
      new THREE.Vector3(pb[0], pb[1], pb[2]),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: a === 'docker' && b === 'secdash' ? GREEN : GOLD,
      transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return { a, b, mat, base: 0.14 };
  });

  /* ── Poussière d'arrière-plan : le trafic de fond ──
     Budget : 1400 desktop / 500 mobile, coquille derrière le graphe. */
  const NDUST = MOBILE ? 500 : 1400;
  const dustPos = new Float32Array(NDUST * 3);
  const dustCol = new Float32Array(NDUST * 3);
  for (let i = 0; i < NDUST; i++) {
    const r = 3.5 + Math.random() * 5.5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dustPos[i * 3]     = Math.sin(ph) * Math.cos(th) * r;
    dustPos[i * 3 + 1] = Math.cos(ph) * r * 0.7;
    dustPos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r - 2.5;
    const gold = Math.random() < 0.3;
    dustCol[i * 3]     = gold ? 0.55 : 0.38;
    dustCol[i * 3 + 1] = gold ? 0.47 : 0.37;
    dustCol[i * 3 + 2] = gold ? 0.26 : 0.34;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.05, map: TEX, vertexColors: true, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  scene.add(dust);

  /* ── Impulsions : des paquets qui suivent des liens réels ── */
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
  scene.add(pulsePts);

  /* ── Caméra par station ── */
  const CAM = [
    [0.0,  0.3, 8.2],
    [0.0, -0.9, 5.6],
    [-1.9, 1.5, 5.2],
    [0.0,  0.5, 6.8],
    [0.4,  2.3, 5.6],
    [0.0,  1.2, 7.4],
  ];
  const LOOK = [
    [0.0,  0.6, 0],
    [0.0, -1.4, 0],
    [-1.9, 1.9, 0],
    [0.0,  0.4, 0],
    [0.4,  2.2, 0],
    [0.0,  0.9, 0],
  ];
  const STATIONS = 6;

  /* ── Scroll → station (mapping sur les sections réelles) ── */
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
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('load', () => { readAnchors(); readScroll(); });

  /* ── Souris : parallaxe + survol des nœuds ── */
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-9, -9);
  let hovered = null;
  let px = -1, py = -1, downX = 0, downY = 0;

  window.addEventListener('pointermove', e => {
    tmx = e.clientX / window.innerWidth - 0.5;
    tmy = e.clientY / window.innerHeight - 0.5;
    px = e.clientX; py = e.clientY;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  canvas.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; }, { passive: true });
  canvas.addEventListener('pointerup', e => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return; /* c'était un drag/scroll */
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(sprites, false);
    if (hits.length) {
      const n = hits[0].object.userData;
      if (n.href) window.location.href = n.href;
      else if (n.section) window.location.hash = n.section.slice(1);
    }
  }, { passive: true });

  function updateHover() {
    if (px < 0) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(sprites, false);
    const hit = hits.length ? hits[0].object : null;
    if (hit !== hovered) {
      hovered = hit;
      canvas.style.cursor = hit ? 'pointer' : '';
      if (labelEl) {
        if (hit) {
          labelEl.textContent = hit.userData.label;
          labelEl.classList.add('on');
        } else {
          labelEl.classList.remove('on');
        }
      }
    }
  }

  function placeLabel() {
    if (!labelEl || !hovered) return;
    const v = new THREE.Vector3();
    hovered.getWorldPosition(v);
    v.project(camera);
    labelEl.style.left = ((v.x + 1) / 2 * window.innerWidth) + 'px';
    labelEl.style.top  = ((-v.y + 1) / 2 * window.innerHeight - 14) + 'px';
  }

  /* ── Mise en avant par station ── */
  function applyHighlight(g) {
    const k = Math.round(g);
    const showAll = k === 0 || k === 5;
    NODES.forEach(n => {
      const on = showAll || n.stations.includes(k);
      const target = n.egg ? 0.55 : (on ? 0.95 : 0.28);
      n.sprite.material.opacity += (target - n.sprite.material.opacity) * 0.08;
      const sc = (n.egg ? 0.16 : 0.34) * (on ? 1 : 0.85);
      n.sprite.scale.x += (sc - n.sprite.scale.x) * 0.08;
      n.sprite.scale.y = n.sprite.scale.x;
    });
    edgeLines.forEach(el => {
      const a = nodeById[el.a], b = nodeById[el.b];
      const on = showAll || a.stations.includes(k) || b.stations.includes(k);
      el.mat.opacity += ((on ? 0.34 : 0.08) - el.mat.opacity) * 0.08;
    });
  }

  /* ── Resize ── */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    readAnchors();
    readScroll();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ── Boucle ── */
  const ease = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const look = new THREE.Vector3();
  let rafOn = false;

  function frame(ts) {
    if (!rafOn) return;
    if (document.body.classList.contains('fast')) { requestAnimationFrame(frame); return; }

    const time = ts / 1000;
    gCur += (gTarget - gCur) * 0.06;
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;

    const k = Math.min(STATIONS - 2, Math.floor(gCur));
    const e = ease(Math.min(1, Math.max(0, gCur - k)));

    applyHighlight(gCur);

    for (let i = 0; i < NP; i++) {
      const pl = pulses[i];
      pl.t += pl.sp;
      if (pl.t >= 1) { pl.t = 0; pl.e = (Math.random() * EDGES.length) | 0; }
      const pa = nodeById[EDGES[pl.e][0]].pos, pb = nodeById[EDGES[pl.e][1]].pos;
      puPos[i * 3]     = lerp(pa[0], pb[0], pl.t);
      puPos[i * 3 + 1] = lerp(pa[1], pb[1], pl.t);
      puPos[i * 3 + 2] = lerp(pa[2], pb[2], pl.t);
    }
    puAttr.needsUpdate = true;

    dust.rotation.y = Math.sin(time * 0.05) * 0.05;

    camera.position.set(
      lerp(CAM[k][0], CAM[k + 1][0], e) + mx * 0.9,
      lerp(CAM[k][1], CAM[k + 1][1], e) - my * 0.6,
      lerp(CAM[k][2], CAM[k + 1][2], e)
    );
    look.set(
      lerp(LOOK[k][0], LOOK[k + 1][0], e),
      lerp(LOOK[k][1], LOOK[k + 1][1], e),
      lerp(LOOK[k][2], LOOK[k + 1][2], e)
    );
    camera.lookAt(look);

    updateHover();
    placeLabel();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function start() { if (!rafOn) { rafOn = true; requestAnimationFrame(frame); } }
  function stop() { rafOn = false; }

  if (REDUCED) {
    /* Scène figée : un rendu unique par changement de section, zéro boucle. */
    pulsePts.visible = false; /* pas de boucle : les paquets n'existent pas en statique */
    let lastK = -1, scrollT = 0;
    const renderStatic = () => {
      const k = Math.min(STATIONS - 1, Math.round(gCur));
      camera.position.set(CAM[k][0], CAM[k][1], CAM[k][2]);
      look.set(LOOK[k][0], LOOK[k][1], LOOK[k][2]);
      camera.lookAt(look);
      applyHighlight(k);
      renderer.render(scene, camera);
    };
    window.addEventListener('scroll', () => {
      readScroll();
      clearTimeout(scrollT);
      scrollT = setTimeout(() => { gCur = gTarget; renderStatic(); }, 120);
    }, { passive: true });
    renderStatic();
    /* survol : les nœuds se nomment aussi en mode figé, sans animation */
    window.addEventListener('pointermove', e => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      updateHover();
      placeLabel();
    }, { passive: true });
  } else {
    start();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
    /* Version rapide : la boucle s'arrête net, elle ne tourne pas à vide */
    new MutationObserver(() => {
      if (document.body.classList.contains('fast')) stop();
      else start();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* Le canvas n'apparaît qu'une fois prêt : le texte est lu avant. */
  document.body.classList.add('scene-on');
}