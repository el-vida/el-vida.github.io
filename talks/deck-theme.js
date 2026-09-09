/* Theme + navigation chrome for Manim Slides decks.
   Runs after the <section> elements are parsed but before Reveal.initialize(),
   so background sources can still be rewritten. */
(function () {
  // Flip to true once per-slide light renders exist in <Deck>_assets-light/.
  var USE_LIGHT_ASSETS = false;

  var root = document.documentElement;

  /* ------------------------------------------------------------- theme */
  function stored() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }
  function param() {
    var m = /[?&]theme=(light|dark)/.exec(location.search);
    return m ? m[1] : null;
  }
  function mode() {
    var p = param();                       // ?theme=light wins, for linking a light deck
    if (p) return p;
    var s = stored();
    if (s === 'light' || s === 'dark') return s;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function swapSources(light) {
    if (!USE_LIGHT_ASSETS) return;
    var secs = document.querySelectorAll('section[data-background-video]');
    for (var i = 0; i < secs.length; i++) {
      var v = secs[i].getAttribute('data-background-video');
      var next = light ? v.replace(/_assets\//, '_assets-light/')
                       : v.replace(/_assets-light\//, '_assets/');
      if (next !== v) secs[i].setAttribute('data-background-video', next);
    }
  }

  function paint(m) {
    root.setAttribute('data-theme', m);
    // invert the dark clips only while real light renders are unavailable
    root.classList.toggle('deck-invert', m === 'light' && !USE_LIGHT_ASSETS);
    var b = document.getElementById('deckthemebtn');
    if (b) b.title = m === 'light' ? 'Switch to dark' : 'Switch to light';
  }

  paint(mode());
  swapSources(mode() === 'light');

  /* ---------------------------------------------------------------- UI */
  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    return e;
  }

  function build() {
    if (document.getElementById('deckui')) return;

    var ui = el('div', null, { id: 'deckui' });

    // top left — back to the talks index
    var tl = el('div', 'deckui-cluster deckui-tl');
    var back = el('a', 'deckpill', { href: 'index.html', title: 'Back to all animations' });
    back.innerHTML = '<span aria-hidden="true">←</span><span>talks</span>';
    tl.appendChild(back);

    // top right — overview, fullscreen, theme
    var tr = el('div', 'deckui-cluster deckui-tr');
    var over = el('button', 'deckbtn', { type: 'button', title: 'Slide overview (o)', 'aria-label': 'Slide overview' });
    over.innerHTML = '⊞';
    var full = el('button', 'deckbtn', { type: 'button', title: 'Fullscreen (f)', 'aria-label': 'Fullscreen' });
    full.innerHTML = '⛶';
    var theme = el('button', 'deckbtn', { type: 'button', id: 'deckthemebtn', 'aria-label': 'Toggle color scheme' });
    theme.textContent = '◐';
    tr.appendChild(over); tr.appendChild(full); tr.appendChild(theme);

    // bottom right — prev / counter / next
    var br = el('div', 'deckui-cluster deckui-br');
    var prev = el('button', 'deckbtn', { type: 'button', title: 'Previous slide', 'aria-label': 'Previous slide' });
    prev.innerHTML = '‹';
    var count = el('span', 'deckpill deckcount');
    count.textContent = '– / –';
    var next = el('button', 'deckbtn', { type: 'button', title: 'Next slide', 'aria-label': 'Next slide' });
    next.innerHTML = '›';
    br.appendChild(prev); br.appendChild(count); br.appendChild(next);

    ui.appendChild(tl); ui.appendChild(tr); ui.appendChild(br);
    document.body.appendChild(ui);

    /* --- wake on activity, fade away while presenting --- */
    var idle;
    function wake() {
      ui.classList.add('awake');
      clearTimeout(idle);
      idle = setTimeout(function () { ui.classList.remove('awake'); }, 2600);
    }
    ['mousemove', 'touchstart', 'keydown', 'click'].forEach(function (ev) {
      document.addEventListener(ev, wake, { passive: true });
    });
    ui.addEventListener('mouseenter', wake);
    wake();

    /* --- keep the chrome visible when the deck goes fullscreen --- */
    function reparent() {
      var fs = document.fullscreenElement || document.webkitFullscreenElement;
      var host = fs && fs !== document.documentElement ? fs : document.body;
      if (ui.parentNode !== host) host.appendChild(ui);
      wake();
    }
    document.addEventListener('fullscreenchange', reparent);
    document.addEventListener('webkitfullscreenchange', reparent);

    full.addEventListener('click', function (e) {
      e.stopPropagation();
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var t = document.documentElement;
        (t.requestFullscreen || t.webkitRequestFullscreen).call(t);
      }
    });

    /* --- theme toggle --- */
    theme.addEventListener('click', function (e) {
      e.stopPropagation();
      var nextMode = mode() === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', nextMode); } catch (err) {}
      paint(nextMode);
      if (USE_LIGHT_ASSETS) {
        swapSources(nextMode === 'light');
        if (window.Reveal && Reveal.sync) Reveal.sync();
      }
    });
    paint(mode());

    /* --- navigation, once Reveal is initialised --- */
    function ready() {
      return window.Reveal && Reveal.getIndices && Reveal.getHorizontalSlides;
    }
    function total() {
      try { return Reveal.getHorizontalSlides().length; } catch (e) { return 0; }
    }
    function update() {
      if (!ready()) return;
      var h = Reveal.getIndices().h + 1, n = total();
      count.textContent = h + ' / ' + n;
      prev.disabled = h <= 1;
      next.disabled = h >= n;
    }
    prev.addEventListener('click', function (e) { e.stopPropagation(); if (ready()) Reveal.prev(); });
    next.addEventListener('click', function (e) { e.stopPropagation(); if (ready()) Reveal.next(); });
    over.addEventListener('click', function (e) {
      e.stopPropagation();
      if (ready() && Reveal.toggleOverview) Reveal.toggleOverview();
    });
    // stop key presses inside the buttons from also paging the deck
    ui.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    });

    var tries = 0;
    (function attach() {
      if (ready()) {
        ['slidechanged', 'ready', 'overviewshown', 'overviewhidden'].forEach(function (ev) {
          try { Reveal.on(ev, update); } catch (e) {}
        });
        update();
      } else if (tries++ < 80) {
        setTimeout(attach, 100);
      }
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

  // follow the site if the theme is changed in another tab
  addEventListener('storage', function (e) {
    if (e.key === 'theme' && e.newValue) {
      paint(e.newValue);
      if (USE_LIGHT_ASSETS) {
        swapSources(e.newValue === 'light');
        if (window.Reveal && Reveal.sync) Reveal.sync();
      }
    }
  });
})();
