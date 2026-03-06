/* ──────────────────────────────────────────
   CURSOR CUSTOM
────────────────────────────────────────── */
const cursor     = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');

if (cursor && cursorRing) {
  let mx = 0, my = 0;   // position cible
  let rx = 0, ry = 0;   // position anneau (lerp)

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  // Anneau avec inertie légère
  (function lerp() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    cursorRing.style.left = rx + 'px';
    cursorRing.style.top  = ry + 'px';
    requestAnimationFrame(lerp);
  })();

  // Disparaît quand la souris quitte la fenêtre
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity     = '0';
    cursorRing.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity     = '1';
    cursorRing.style.opacity = '1';
  });
}

/* ──────────────────────────────────────────
   NAV — scroll
────────────────────────────────────────── */
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ──────────────────────────────────────────
   BURGER MENU MOBILE
────────────────────────────────────────── */
const burger   = document.getElementById('burger');
const navLinks = document.getElementById('nav-links');

if (burger && navLinks) {
  burger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const isOpen = navLinks.classList.contains('open');
    burger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Ferme le menu au clic sur un lien
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ──────────────────────────────────────────
   SCROLL REVEAL
────────────────────────────────────────── */
const revealEls = document.querySelectorAll('[data-reveal]');

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

revealEls.forEach(el => revealObserver.observe(el));

/* ──────────────────────────────────────────
   HERO — trigger immédiat (au-dessus du fold)
────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Petite temporisation pour laisser le CSS se charger
  setTimeout(() => {
    document.querySelectorAll('.hero [data-reveal]').forEach(el => {
      el.classList.add('is-visible');
    });
  }, 80);
});

/* ──────────────────────────────────────────
   SMOOTH HOVER SUR LES XP-ITEMS
   (parallax de la card au survol)
────────────────────────────────────────── */
document.querySelectorAll('.xp-item').forEach(item => {
  item.addEventListener('mousemove', e => {
    const r  = item.getBoundingClientRect();
    const y  = (e.clientY - r.top) / r.height - 0.5;
    item.style.transform = `translateY(${y * -4}px)`;
  });
  item.addEventListener('mouseleave', () => {
    item.style.transform = '';
  });
});

/* ──────────────────────────────────────────
   MARQUEE — pause au survol
────────────────────────────────────────── */
const marquee = document.querySelector('.marquee-track');
if (marquee) {
  const footer = marquee.closest('.hero-footer');
  footer?.addEventListener('mouseenter', () => {
    marquee.style.animationPlayState = 'paused';
  });
  footer?.addEventListener('mouseleave', () => {
    marquee.style.animationPlayState = 'running';
  });
}

/* ──────────────────────────────────────────
   CONTACT-LINKS — effet tilt au survol
────────────────────────────────────────── */
document.querySelectorAll('.contact-link').forEach(link => {
  if (link.tagName !== 'A') return;
  link.addEventListener('mouseenter', () => {
    link.style.borderColor = 'rgba(201,168,76,.35)';
  });
  link.addEventListener('mouseleave', () => {
    link.style.borderColor = '';
  });
});
