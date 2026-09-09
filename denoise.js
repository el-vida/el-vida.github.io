/* Reverse-diffusion reveal for the name: pure noise -> signal.
   Used on every CV page so the interaction is the same everywhere:
   the name denoises on load, and clicking it draws a fresh sample. */
window.Denoise = (function () {
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&/\\|<>+=~^ΣΛΞΨΩ∂∇';
  const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
  let cssDone = false;

  function injectCSS() {
    if (cssDone) return;
    cssDone = true;
    const css = document.createElement('style');
    css.textContent = [
      '.dn-ch{display:inline-block;white-space:pre;will-change:filter,opacity}',
      '.dn-ch.dn-noise{color:var(--muted,#8a8a8a);opacity:.75;filter:blur(1.4px)}',
      '.dn-ch.dn-clean{color:inherit;opacity:1;filter:none;transition:color .5s ease,opacity .5s ease,filter .5s ease}',
      '.dn-host{cursor:pointer}',
      '.dn-host:focus-visible{outline:2px solid var(--accent,var(--link,var(--cyan,currentColor)));outline-offset:6px}',
      '@media (prefers-reduced-motion:reduce){.dn-ch,.dn-ch.dn-clean{filter:none;opacity:1;transition:none}}'
    ].join('');
    document.head.appendChild(css);
  }

  function attach(host, opts) {
    if (!host) return null;
    opts = opts || {};
    injectCSS();

    const duration = opts.duration || 1750;
    const tstep = opts.tstep || null;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // re-append only the elements the caller explicitly asks to preserve
    // (e.g. the terminal cursor). Anything else inside the host is name markup
    // and must not survive, or the name renders twice.
    const keep = opts.keep ? Array.prototype.slice.call(host.querySelectorAll(opts.keep)) : [];
    const text = opts.text || Array.prototype.slice.call(host.childNodes)
      .filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (!text) return null;

    host.setAttribute('aria-label', text);
    host.textContent = '';
    const cells = Array.from(text).map(ch => {
      const el = document.createElement('span');
      el.className = 'dn-ch';
      el.textContent = ch;
      host.appendChild(el);
      return { el, ch, fixed: ch === ' ' || ch === ' ' };
    });
    keep.forEach(el => host.appendChild(el));

    if (reduced) return { run: function () {} };

    host.classList.add('dn-host');
    host.setAttribute('role', 'button');
    host.setAttribute('tabindex', '0');
    host.title = opts.title || 'click to resample';

    let raf = null, hideTimer = null;

    function run() {
      if (raf) cancelAnimationFrame(raf);
      if (hideTimer) clearTimeout(hideTimer);

      // fresh schedule: every character settles at its own step, in random order
      const order = cells.map((_, i) => i).filter(i => !cells[i].fixed);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = order[i]; order[i] = order[j]; order[j] = t;
      }
      const settleAt = new Map();
      order.forEach((idx, k) => settleAt.set(idx, 0.30 + 0.62 * (k / Math.max(1, order.length - 1))));

      cells.forEach(c => {
        if (c.fixed) return;
        c.el.classList.remove('dn-clean');
        c.el.classList.add('dn-noise');
        c.el.textContent = rand();
      });
      if (tstep) tstep.classList.add('show');

      let start = null, lastScramble = 0;
      function frame(now) {
        if (start === null) start = now;
        const p = Math.min(1, (now - start) / duration);
        const t = 1 - p;
        if (tstep) tstep.textContent = 't = ' + t.toFixed(2) + '   ↓ denoising';

        const interval = 34 + (1 - t) * 80;
        const doScramble = now - lastScramble > interval;
        if (doScramble) lastScramble = now;

        cells.forEach((c, i) => {
          if (c.fixed) return;
          if (p >= settleAt.get(i)) {
            if (c.el.textContent !== c.ch) {
              c.el.textContent = c.ch;
              c.el.classList.remove('dn-noise');
              c.el.classList.add('dn-clean');
            }
          } else if (doScramble) {
            c.el.textContent = rand();
          }
        });

        if (p < 1) {
          raf = requestAnimationFrame(frame);
        } else {
          raf = null;
          cells.forEach(c => {
            c.el.textContent = c.ch;
            c.el.classList.remove('dn-noise');
            c.el.classList.add('dn-clean');
          });
          if (tstep) {
            tstep.textContent = 't = 0.00   ✓ sample';
            hideTimer = setTimeout(() => tstep.classList.remove('show'), 900);
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }

    host.addEventListener('click', run);
    host.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); }
    });

    if (opts.autorun !== false) run();
    return { run: run };
  }

  return { attach: attach };
})();
