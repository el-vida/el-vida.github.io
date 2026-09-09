/* Carry the site's light/dark choice into a Manim Slides deck.
   Runs after the <section> elements are parsed but before Reveal.initialize(),
   so background sources can still be rewritten. */
(function () {
  // Flip to true once per-slide light renders exist in <Deck>_assets-light/.
  var USE_LIGHT_ASSETS = false;

  var root = document.documentElement;

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

  function addToggle() {
    if (document.getElementById('deckthemebtn')) return;
    var b = document.createElement('button');
    b.id = 'deckthemebtn';
    b.type = 'button';
    b.textContent = '◐';
    b.setAttribute('aria-label', 'Toggle color scheme');
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var next = mode() === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', next); } catch (err) {}
      paint(next);
      if (USE_LIGHT_ASSETS) {
        swapSources(next === 'light');
        if (window.Reveal && Reveal.sync) Reveal.sync();
      }
    });
    // keep reveal from treating clicks on the button as slide navigation
    b.addEventListener('keydown', function (e) { e.stopPropagation(); });
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addToggle);
  } else {
    addToggle();
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
