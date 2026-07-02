/* ============================================================
   SCÈNE 3D — voyage dans le réseau (Three.js, CDN, sans build)
   Le scroll pilote la caméra et le réseau se réorganise :
   sphère → nébuleuse → constellations → fibre → projets → anneau
   ============================================================ */
import * as THREE from 'three';

const canvas = document.getElementById('gl-canvas');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('no3d');
}

if (renderer) {
  /* ── Base ── */
  const MOBILE = window.innerWidth < 720;
  const N = MOBILE ? 255 : 510;         /* divisible par 15 → blocs propres */
  const BLOCK = N / 15;
  const STATIONS = 6;

  renderer.setClearColor(0x0a0a0d, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 1.75));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0d, 0.05);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);

  let seed = 20260702;
  function rnd() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* ── Formations (Float32Array N*3 chacune) ──
     Les indices consécutifs restent voisins dans chaque formation,
     pour que les arêtes (i → i+1) restent organiques partout. */

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  function fSphere() {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = GOLDEN * i;
      const R = 2.9 + (rnd() - 0.5) * 0.5;
      a[i * 3]     = Math.cos(th) * r * R;
      a[i * 3 + 1] = y * R * 0.82;
      a[i * 3 + 2] = Math.sin(th) * r * R;
    }
    return a;
  }

  function fNebula(base) {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const k = 0.35 + rnd() * 1.05;
      a[i * 3]     = base[i * 3] * k + (rnd() - 0.5) * 0.6;
      a[i * 3 + 1] = base[i * 3 + 1] * k * 0.9 + (rnd() - 0.5) * 0.5;
      a[i * 3 + 2] = base[i * 3 + 2] * k + (rnd() - 0.5) * 0.6;
    }
    return a;
  }

  function fClusters() {
    const a = new Float32Array(N * 3);
    const per = N / 3;
    const C = [
      [-2.5, 0.7, -0.4],
      [2.5, 0.9, -0.6],
      [0, -1.7, 0.5],
    ];
    for (let i = 0; i < N; i++) {
      const b = Math.floor(i / per);
      const j = i % per;
      const y = 1 - (j / (per - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = GOLDEN * j;
      const R = 1.05 + (rnd() - 0.5) * 0.3;
      a[i * 3]     = C[b][0] + Math.cos(th) * r * R;
      a[i * 3 + 1] = C[b][1] + y * R * 0.85;
      a[i * 3 + 2] = C[b][2] + Math.sin(th) * r * R;
    }
    return a;
  }

  function fCable() {
    const a = new Float32Array(N * 3);
    const per = N / 5;
    for (let i = 0; i < N; i++) {
      const s = Math.floor(i / per);
      const t = (i % per) / (per - 1);
      const ang = (s / 5) * Math.PI * 2;
      const x = -5.6 + t * 11.2;
      const braid = Math.sin(x * 0.55 + ang) * 0.5;
      a[i * 3]     = x + (rnd() - 0.5) * 0.08;
      a[i * 3 + 1] = Math.cos(ang) * 0.42 + braid * 0.55 + (rnd() - 0.5) * 0.07;
      a[i * 3 + 2] = Math.sin(ang) * 0.42 + Math.cos(x * 0.5 + ang) * 0.4 + (rnd() - 0.5) * 0.07;
    }
    return a;
  }

  function fTrio() {
    const a = new Float32Array(N * 3);
    const per = N / 3;
    const C = [
      [-2.4, 1.0, 0],
      [2.4, 1.0, 0],
      [0, -1.6, 0.3],
    ];
    for (let i = 0; i < N; i++) {
      const b = Math.floor(i / per);
      const t = ((i % per) / per) * Math.PI * 2;
      const R = 0.95 + (rnd() - 0.5) * 0.14;
      const tilt = b * 0.7;
      const x = Math.cos(t) * R;
      const y = Math.sin(t) * R;
      a[i * 3]     = C[b][0] + x;
      a[i * 3 + 1] = C[b][1] + y * Math.cos(tilt);
      a[i * 3 + 2] = C[b][2] + y * Math.sin(tilt) + (rnd() - 0.5) * 0.1;
    }
    return a;
  }

  function fRing() {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const halo = i % 12 === 0;
      const R = halo ? 3.7 + rnd() * 0.5 : 2.75 + (rnd() - 0.5) * 0.24;
      a[i * 3]     = Math.cos(t) * R;
      a[i * 3 + 1] = Math.sin(t) * R;
      a[i * 3 + 2] = (rnd() - 0.5) * (halo ? 0.8 : 0.24);
    }
    return a;
  }

  const sphere = fSphere();
  const FORMS = [sphere, fNebula(sphere), fClusters(), fCable(), fTrio(), fRing()];

  /* ── Arêtes : chaîne i→i+1 (sans franchir les blocs) + chordes ── */
  const edges = [];
  for (let i = 0; i < N - 1; i++) {
    if ((i + 1) % BLOCK !== 0) edges.push([i, i + 1]);
  }
  for (let i = 0; i < N; i += 17) edges.push([i, (i + 151) % N]);
  const E = edges.length;

  /* ── Géométries ── */
  const cur = new Float32Array(N * 3);
  cur.set(FORMS[0]);

  const pGeo = new THREE.BufferGeometry();
  const pAttr = new THREE.BufferAttribute(cur, 3);
  pAttr.setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('position', pAttr);

  const cols = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    if (i % 8 === 0) { cols[i * 3] = 0.37; cols[i * 3 + 1] = 0.94; cols[i * 3 + 2] = 0.69; }
    else             { cols[i * 3] = 0.91; cols[i * 3 + 1] = 0.77; cols[i * 3 + 2] = 0.42; }
  }
  pGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

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

  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: MOBILE ? 0.11 : 0.09,
    map: glowTexture('rgba(255,255,255,1)', 'rgba(255,220,140,.5)'),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  scene.add(points);

  const lPos = new Float32Array(E * 6);
  const lGeo = new THREE.BufferGeometry();
  const lAttr = new THREE.BufferAttribute(lPos, 3);
  lAttr.setUsage(THREE.DynamicDrawUsage);
  lGeo.setAttribute('position', lAttr);

  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
    color: 0xe8c56a,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  scene.add(lines);

  /* ── Impulsions lumineuses ── */
  const NP = MOBILE ? 8 : 14;
  const pulses = [];
  for (let i = 0; i < NP; i++) {
    pulses.push({ e: (Math.random() * E) | 0, t: Math.random(), sp: 0.008 + Math.random() * 0.014 });
  }
  const puPos = new Float32Array(NP * 3);
  const puGeo = new THREE.BufferGeometry();
  const puAttr = new THREE.BufferAttribute(puPos, 3);
  puAttr.setUsage(THREE.DynamicDrawUsage);
  puGeo.setAttribute('position', puAttr);

  const pulsePts = new THREE.Points(puGeo, new THREE.PointsMaterial({
    size: 0.2,
    map: glowTexture('rgba(255,255,255,1)', 'rgba(94,240,176,.65)'),
    color: 0x5ef0b0,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  scene.add(pulsePts);

  /* ── Trajectoire caméra par station ── */
  const CAM = [
    [0, 0.2, 7.4],
    [2.6, 0.8, 4.6],
    [0, 4.2, 6.6],
    [0.4, 1.6, 6.6],
    [0, 0.3, 5.9],
    [0, 0, 7.0],
  ];
  const LOOK = [
    [0, 0, 0],
    [-0.4, 0, -0.6],
    [0, 0.2, 0],
    [0, 0, 0],
    [0, 0.2, 0],
    [0, 0, 0],
  ];
  const PULSE_BOOST = [1, 1, 1, 2.4, 1.3, 1];

  /* ── Scroll & souris ── */
  let gTarget = 0, gCur = 0;
  function readScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    gTarget = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) * (STATIONS - 1) : 0;
  }
  window.addEventListener('scroll', readScroll, { passive: true });

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener('pointermove', e => {
    tmx = e.clientX / window.innerWidth - 0.5;
    tmy = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  readScroll();

  const ease = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const look = new THREE.Vector3();

  function frame(ts) {
    const time = ts / 1000;
    gCur += (gTarget - gCur) * 0.06;
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;

    const k = Math.min(STATIONS - 2, Math.floor(gCur));
    const e = ease(Math.min(1, Math.max(0, gCur - k)));
    const fa = FORMS[k], fb = FORMS[k + 1];

    for (let i = 0; i < N * 3; i++) cur[i] = fa[i] + (fb[i] - fa[i]) * e;
    pAttr.needsUpdate = true;

    for (let j = 0; j < E; j++) {
      const [a, b] = edges[j];
      lPos[j * 6]     = cur[a * 3];
      lPos[j * 6 + 1] = cur[a * 3 + 1];
      lPos[j * 6 + 2] = cur[a * 3 + 2];
      lPos[j * 6 + 3] = cur[b * 3];
      lPos[j * 6 + 4] = cur[b * 3 + 1];
      lPos[j * 6 + 5] = cur[b * 3 + 2];
    }
    lAttr.needsUpdate = true;

    const boost = lerp(PULSE_BOOST[k], PULSE_BOOST[k + 1], e);
    for (let i = 0; i < NP; i++) {
      const pl = pulses[i];
      pl.t += pl.sp * boost;
      if (pl.t >= 1) { pl.t = 0; pl.e = (Math.random() * E) | 0; }
      const [a, b] = edges[pl.e];
      puPos[i * 3]     = cur[a * 3]     + (cur[b * 3]     - cur[a * 3])     * pl.t;
      puPos[i * 3 + 1] = cur[a * 3 + 1] + (cur[b * 3 + 1] - cur[a * 3 + 1]) * pl.t;
      puPos[i * 3 + 2] = cur[a * 3 + 2] + (cur[b * 3 + 2] - cur[a * 3 + 2]) * pl.t;
    }
    puAttr.needsUpdate = true;

    const drift = Math.sin(time * 0.25) * 0.12;
    camera.position.set(
      lerp(CAM[k][0], CAM[k + 1][0], e) + mx * 1.1 + drift,
      lerp(CAM[k][1], CAM[k + 1][1], e) - my * 0.8,
      lerp(CAM[k][2], CAM[k + 1][2], e)
    );
    look.set(
      lerp(LOOK[k][0], LOOK[k + 1][0], e),
      lerp(LOOK[k][1], LOOK[k + 1][1], e),
      lerp(LOOK[k][2], LOOK[k + 1][2], e)
    );
    camera.lookAt(look);

    /* rotation douce partout sauf sur la station fibre (3) pour la lisibilité */
    points.rotation.y = lines.rotation.y = pulsePts.rotation.y =
      Math.sin(time * 0.08) * 0.12 * Math.min(1, Math.abs(gCur - 3));

    renderer.render(scene, camera);
    if (!REDUCED) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
