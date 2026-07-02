/* ============================================================
   PORTFOLIO V2 — interactions légères
   ============================================================ */
'use strict';

/* ── Année du footer ── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ── Menu mobile ── */
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

/* ── Apparition des sections au scroll ── */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

/* ── Petit clin d'œil console pour les curieux ── */
console.log(
  '%c davidson@portfolio:~$ %c Curieux ? Le mode terminal est sur /terminal 👀',
  'background:#171410;color:#b8a468;padding:4px 8px;border-radius:4px;font-family:monospace',
  'color:#6f6a61;font-family:monospace'
);
