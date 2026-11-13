const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const makeClone = (el) => {
  const c = el.cloneNode(true);
  c.setAttribute('aria-hidden', 'true');
  c.inert = true; // copies must not be reachable by keyboard or screen readers
  return c;
};

/* ===== Mobile nav toggle ===== */
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('primary-nav');
function setMenu(open) {
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ===== Hero form (demo only: no backend) ===== */
const form = document.querySelector('.claim-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const handle = form.elements.handle.value.trim().replace(/[^\w.-]/g, '');
  form.querySelector('.form-status').textContent = handle
    ? `Nice! linktr.ee/${handle} would be yours. (This is a demo form.)`
    : 'Enter a handle to claim your page.';
});

/* ===== Scroll reveal ===== */
const revealEls = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* ===== Hero: vertical infinite carousel =====
   Cards are duplicated once. CSS slides the list up by exactly half its height,
   which lands on an identical picture, so the loop restarts invisibly. */
(function () {
  const track = document.querySelector('.vtrack');
  if (track) track.append(...[...track.children].map(makeClone));
})();

/* ===== Burgundy band: tiles scatter, then fan into a stack, repeatedly ===== */
(function () {
  const stage = document.querySelector('[data-collage]');
  if (!stage || reduceMotion.matches) return;
  setInterval(() => stage.classList.toggle('is-stacked'), 3800);
})();

/* ===== Stats count up when they scroll into view ===== */
(function () {
  const nums = document.querySelectorAll('[data-count]');
  if (!nums.length || reduceMotion.matches || !('IntersectionObserver' in window)) return;
  const fmt = (el, v) => { el.textContent = (el.dataset.prefix || '') + Math.round(v).toLocaleString('en-US'); };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const el = en.target, end = Number(el.dataset.count), start = performance.now();
      (function tick(now) {
        const p = Math.min((now - start) / 1200, 1);
        fmt(el, end * (1 - Math.pow(1 - p, 3))); // ease-out
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    });
  }, { threshold: 0.6 });
  nums.forEach((el) => io.observe(el));
})();

/* ===== Rotating headline word ===== */
(function () {
  const el = document.querySelector('[data-rotator]');
  if (!el) return;
  const words = ['merch sellers', 'writers', 'indie artists', 'producers', 'podcasters', 'chefs'];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % words.length;
    if (reduceMotion.matches) { el.textContent = words[i]; return; }
    el.classList.add('is-swapping'); // fade out, swap the word, fade in
    setTimeout(() => { el.textContent = words[i]; el.classList.remove('is-swapping'); }, 220);
  }, 2600);
})();

/* ===== Horizontal infinite carousel =====
   The tiles are repeated three times. One number, "offset", decides the position; the track
   is shifted left by (offset mod width-of-one-set). Every set looks the same, so the wrap-around
   is invisible in both directions. Drift, the buttons and the loop all just change "offset". */
(function () {
  const root = document.querySelector('[data-marquee]');
  if (!root) return;
  const track = root.querySelector('.marquee-track');
  const originals = [...track.children];
  track.append(...originals.map(makeClone), ...originals.map(makeClone));

  const SPEED = 45, NUDGE = 260, DURATION = 600; // px/s drift, px per button press, ms
  let setWidth = 0, offset = 0, paused = false, last = null, anim = null;

  const measure = () => { setWidth = track.children[originals.length].offsetLeft - track.children[0].offsetLeft; };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function render() {
    if (!setWidth) return;
    const o = ((offset % setWidth) + setWidth) % setWidth; // true modulo, safe for negatives
    track.style.transform = `translate3d(${-o}px, 0, 0)`;
  }
  function frame(now) {
    const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
    last = now;
    if (anim) { // a button press is easing the strip
      const p = Math.min((now - anim.start) / anim.dur, 1);
      offset = anim.from + (anim.to - anim.from) * ease(p);
      if (p === 1) anim = null;
    } else if (!paused && !reduceMotion.matches && !document.hidden) {
      offset += SPEED * dt; // gentle continuous drift
    }
    render();
    requestAnimationFrame(frame);
  }
  function nudge(dir) {
    anim = { from: offset, to: (anim ? anim.to : offset) + dir * NUDGE, start: performance.now(), dur: reduceMotion.matches ? 1 : DURATION };
  }
  root.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => nudge(Number(b.dataset.dir))));
  // Pause while the pointer is over the carousel or keyboard focus is inside it
  root.addEventListener('mouseenter', () => { paused = true; });
  root.addEventListener('mouseleave', () => { paused = false; });
  root.addEventListener('focusin', () => { paused = true; });
  root.addEventListener('focusout', () => { paused = false; });
  window.addEventListener('resize', measure);
  measure();
  requestAnimationFrame(frame);
})();

/* ===== FAQ: keep one answer open at a time ===== */
(function () {
  const items = [...document.querySelectorAll('.faq details')];
  items.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) items.forEach((o) => { if (o !== d) o.open = false; });
  }));
})();
