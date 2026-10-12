/* =====================================================================
   Tutee Connect · Study in New Zealand — page behaviour.
   No dependencies. Every lead form posts JSON to /api/enquiry
   (netlify/functions/enquiry.mjs), which emails and stores the lead.
   ===================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');

  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var store = {
    get: function (k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  var ENDPOINT = '/api/enquiry';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  /* ------------------------------------------------------------------ *
   * UTM capture: first touch, kept for 30 days and attached to leads.
   * ------------------------------------------------------------------ */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var UTM_TTL = 30 * 24 * 60 * 60 * 1000;

  function readUtm() {
    try {
      var saved = JSON.parse(store.get('tc_utm') || 'null');
      if (saved && Date.now() - saved.at < UTM_TTL) return saved.v;
    } catch (e) { /* corrupt value */ }
    return null;
  }

  (function captureUtm() {
    if (readUtm()) return;
    var params = new URLSearchParams(location.search);
    var found = {};
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) found[k] = v.slice(0, 150);
    });
    if (Object.keys(found).length) store.set('tc_utm', JSON.stringify({ at: Date.now(), v: found }));
  })();

  /* ------------------------------------------------------------------ *
   * Shared select options.
   * ------------------------------------------------------------------ */
  var DIAL_CODES = [
    ['IN', '+91'], ['AE', '+971'], ['NZ', '+64'], ['AU', '+61'], ['UK', '+44'],
    ['US/CA', '+1'], ['SG', '+65'], ['MY', '+60'], ['LK', '+94'], ['NP', '+977'],
    ['BD', '+880'], ['SA', '+966'], ['QA', '+974'], ['OM', '+968'], ['KW', '+965'], ['BH', '+973']
  ];

  function fillSelects() {
    $$('select[data-cc]').forEach(function (sel) {
      sel.innerHTML = DIAL_CODES.map(function (c) {
        return '<option value="' + c[1] + '"' + (c[1] === '+91' ? ' selected' : '') + '>' + c[0] + ' ' + c[1] + '</option>';
      }).join('');
    });

    var slots = ['<option value="">Pick a slot</option>'];
    for (var h = 9; h <= 19; h++) {
      var label = (h > 12 ? h - 12 : h) + ':00 ' + (h < 12 ? 'AM' : 'PM') + ' IST';
      slots.push('<option value="' + label + '">' + label + '</option>');
    }
    $$('select[data-calltime]').forEach(function (sel) { sel.innerHTML = slots.join(''); });

    var opts = ['<option value="">Not sure yet</option>'];
    upcomingIntakes(4).forEach(function (d) {
      var v = MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
      opts.push('<option value="' + v + '">' + v + '</option>');
    });
    $$('select[data-intake-select]').forEach(function (sel) { sel.innerHTML = opts.join(''); });
  }

  /* Next February / July starts that are at least a month away. */
  function upcomingIntakes(count) {
    var now = new Date();
    var cutoff = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    var out = [];
    for (var y = now.getFullYear(); out.length < count; y++) {
      [1, 6].forEach(function (m) {
        var d = new Date(y, m, 1);
        if (d > cutoff && out.length < count) out.push(d);
      });
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Header, mobile menu, scrollspy, progress bird.
   * ------------------------------------------------------------------ */
  function initHeader() {
    var header = $('[data-header]');
    var toggle = $('[data-menu-toggle]');
    var menu = $('[data-menu]');

    function setMenu(open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    }
    toggle.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });
    doc.addEventListener('click', function (e) { if (!menu.hidden && !header.contains(e.target)) setMenu(false); });

    var links = $$('.header__nav a');
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        if (byId[en.target.id]) byId[en.target.id].classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });

    var line = $('.flightline');
    var hero = $('.hero');
    var consult = $('#consult');
    var mbar = $('[data-mbar]');
    var consultVisible = false;
    new IntersectionObserver(function (en) { consultVisible = en[0].isIntersecting; onScroll(); }, { threshold: .15 }).observe(consult);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY;
        var max = root.scrollHeight - window.innerHeight;
        line.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
        header.classList.toggle('is-scrolled', y > 30);
        var showBar = y > hero.offsetHeight * .55 && !consultVisible;
        mbar.classList.toggle('is-on', showBar);
        doc.body.classList.toggle('mbar-on', showBar && window.innerWidth <= 900);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ------------------------------------------------------------------ *
   * Scroll reveals and counters.
   * ------------------------------------------------------------------ */
  function initReveal() {
    $$('.lenders li').forEach(function (li, i) { li.style.setProperty('--i', i); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });

    var counters = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        counters.unobserve(en.target);
        countUp(en.target);
      });
    }, { threshold: .6 });
    $$('[data-count]').forEach(function (el) {
      if (!reduce) el.textContent = '0';
      counters.observe(el);
    });
  }

  function countUp(el) {
    var target = +el.getAttribute('data-count');
    if (reduce) { el.textContent = target; return; }
    var start = null;
    var dur = 1500;
    function step(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------ *
   * Hero: headline split, stars, parallax, pass tilt.
   * ------------------------------------------------------------------ */
  function splitWords(el) {
    var i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { n.setAttribute('aria-hidden', 'true'); walk(n); return; }
        if (n.nodeType !== 3) return;
        var frag = doc.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
          var w = doc.createElement('span');
          w.className = 'w';
          w.setAttribute('aria-hidden', 'true');
          var inner = doc.createElement('span');
          inner.className = 'w__i';
          inner.style.setProperty('--i', i++);
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      });
    })(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-split'); }); });
  }

  function initHero() {
    var title = $('[data-split]');
    if (title && !reduce) splitWords(title);

    var sky = $('[data-stars]');
    var n = window.innerWidth < 700 ? 40 : 80;
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<i class="star" style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) +
        '%;--s:' + (1 + Math.random() * 1.6).toFixed(1) + 'px;--t:' + (2.5 + Math.random() * 4).toFixed(1) +
        's;--dl:-' + (Math.random() * 6).toFixed(1) + 's"></i>';
    }
    sky.innerHTML = html;

    if (reduce) {
      $$('svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
      return;
    }

    var hero = $('.hero');
    var layers = $$('[data-parallax]', hero);
    var px = 0, inView = true;
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; }).observe(hero);

    function paint() {
      var y = window.scrollY;
      layers.forEach(function (el) {
        var f = +el.getAttribute('data-parallax');
        el.style.transform = 'translate3d(' + (px * f * -60).toFixed(1) + 'px,' + (y * f).toFixed(1) + 'px,0)';
      });
    }
    window.addEventListener('scroll', function () { if (inView) requestAnimationFrame(paint); }, { passive: true });
    if (finePointer) {
      hero.addEventListener('pointermove', function (e) {
        px = e.clientX / window.innerWidth - .5;
        requestAnimationFrame(paint);
      });
    }

    if (!finePointer) return;
    $$('.hero__pass, .consult__pass').forEach(function (wrap) {
      var pass = $('.pass', wrap);
      wrap.addEventListener('pointermove', function (e) {
        if (wrap.contains(doc.activeElement) && doc.activeElement.matches('input,select,textarea')) return;
        var r = wrap.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        pass.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
        pass.style.setProperty('--rx', (y * -5).toFixed(2) + 'deg');
      });
      function reset() { pass.style.setProperty('--rx', '0deg'); pass.style.setProperty('--ry', '0deg'); }
      wrap.addEventListener('pointerleave', reset);
      wrap.addEventListener('focusin', reset);
    });
  }

  /* The perforation notches are punched with a CSS mask at --perf-y. */
  function initPassNotches() {
    var passes = $$('.pass').filter(function (p) { return !p.classList.contains('pass--modal'); });
    function place() {
      passes.forEach(function (p) {
        var perf = $('.pass__perf', p);
        if (perf) p.style.setProperty('--perf-y', (perf.offsetTop + 1) + 'px');
      });
    }
    place();
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(place);
      passes.forEach(function (p) { ro.observe(p); });
    } else {
      window.addEventListener('resize', place);
    }
  }

  /* ------------------------------------------------------------------ *
   * Small pointer flourishes.
   * ------------------------------------------------------------------ */
  function initPointerFx() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * .18;
        var y = (e.clientY - r.top - r.height / 2) * .28;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    $$('.reason').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Reasons: pick what matters, postcards shuffle.
   * ------------------------------------------------------------------ */
  function initReasons() {
    var cards = $$('[data-reason]');
    var countEl = $('[data-pick-count]');
    var cta = $('[data-pick-cta]');

    function update() {
      var picked = cards.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
        .map(function (c) { return c.getAttribute('data-reason'); });
      countEl.textContent = picked.length;
      countEl.classList.remove('bump');
      void countEl.offsetWidth;
      countEl.classList.add('bump');
      var arrow = cta.querySelector('svg').outerHTML;
      cta.innerHTML = (picked.length
        ? 'Build my plan around ' + (picked.length === 1 ? 'this' : 'these ' + picked.length)
        : 'Get my free NZ plan') + ' ' + arrow;
      cta.setAttribute('data-interest', picked.length ? 'NZ plan. Priorities: ' + picked.join('; ') : 'Personalised NZ plan');
    }
    cards.forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
        update();
      });
    });
    cta.setAttribute('data-interest', 'Personalised NZ plan');

    var stack = $('[data-postcards]');
    var order = $$('.postcard', stack);
    function layout() { order.forEach(function (p, i) { p.setAttribute('data-pos', i); }); }
    layout();
    var busy = false;
    function shuffle() {
      if (busy) return;
      busy = true;
      var top = order[0];
      top.classList.add('is-flying');
      setTimeout(function () {
        order.push(order.shift());
        top.classList.remove('is-flying');
        layout();
        busy = false;
      }, reduce ? 0 : 480);
    }
    var timer = null;
    function auto(on) {
      clearInterval(timer);
      if (on && !reduce) timer = setInterval(shuffle, 4200);
    }
    new IntersectionObserver(function (en) { auto(en[0].isIntersecting); }, { threshold: .4 }).observe(stack);
    stack.addEventListener('click', function () { shuffle(); auto(true); });
    stack.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shuffle(); auto(true); }
    });
  }

  /* ------------------------------------------------------------------ *
   * Intakes: live labels, countdowns and "you are here".
   * ------------------------------------------------------------------ */
  function initIntakes() {
    var now = new Date();
    $$('[data-intake-card]').forEach(function (card) {
      var m = +card.getAttribute('data-intake-card') - 1;
      var d = new Date(now.getFullYear(), m, 1);
      if (d <= now) d = new Date(now.getFullYear() + 1, m, 1);
      var monthName = MONTHS[m];
      var months = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
      $('[data-intake-name]', card).textContent = monthName + ' ' + d.getFullYear();
      $('[data-intake-count]', card).textContent = months <= 1
        ? 'Starts next month. Talk to us today'
        : months <= 5 ? 'Starts in about ' + months + ' months. Plan now'
        : 'Starts in about ' + months + ' months';
      var btn = $('[data-lead]', card);
      var label = monthName + ' ' + d.getFullYear();
      btn.setAttribute('data-intake-value', monthName.slice(0, 3) + ' ' + d.getFullYear());
      btn.setAttribute('data-interest', 'Intake: ' + label);
      btn.setAttribute('data-title', 'Plan my ' + label + ' intake');
      btn.firstChild.textContent = 'Plan my ' + label + ' intake ';
    });

    var today = $('[data-today]');
    var days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    today.style.setProperty('--today', ((now.getMonth() + (now.getDate() - 1) / days) / 12).toFixed(4));
    today.hidden = false;
  }

  /* ------------------------------------------------------------------ *
   * Documents checklist.
   * ------------------------------------------------------------------ */
  function initDocs() {
    var boxes = $$('[data-checklist] input');
    var fill = $('[data-meter-fill]');
    var meter = fill.closest('.meter');
    var count = $('[data-doc-count]');
    var msg = $('[data-doc-msg]');
    var cta = $('[data-doc-cta]');
    var label = $('[data-doc-cta-label]');
    var celebrated = false;

    function update() {
      var have = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
      var missing = boxes.filter(function (b) { return !b.checked; }).map(function (b) { return b.value; });
      var n = have.length;
      fill.style.setProperty('--off', 100 - n / boxes.length * 100);
      count.textContent = n;
      meter.classList.toggle('is-full', n === boxes.length);
      msg.textContent = n === 0 ? "Let's build your file from scratch. It's what we do every day."
        : n < 3 ? 'Good start! ' + missing.length + ' to go, and we\'ll guide you through each one.'
        : n === 3 ? 'Halfway there! Just 3 to go.'
        : n < boxes.length ? 'Almost there! Just ' + missing.length + ' left.'
        : 'Your file looks complete. Let\'s get it reviewed before you apply.';
      label.textContent = n === boxes.length ? 'Get my file reviewed free'
        : n === 0 ? 'Get help with my documents'
        : 'Get help with the ' + missing.length + ' missing';
      cta.setAttribute('data-interest', 'Documents: ' + n + '/' + boxes.length + ' ready' +
        (missing.length ? '. Missing: ' + missing.join(', ') : '. Wants a file review'));
      if (n === boxes.length && !celebrated) { celebrated = true; confetti($('[data-confetti]')); }
      if (n < boxes.length) celebrated = false;
    }
    boxes.forEach(function (b) { b.addEventListener('change', update); });
    update();
  }

  function confetti(host) {
    if (reduce) return;
    var colors = ['#f9c74f', '#f08a2c', '#8c0b0b', '#176566', '#fcd97a'];
    for (var i = 0; i < 32; i++) {
      var p = doc.createElement('i');
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--x', (Math.random() * 360 - 180).toFixed(0) + 'px');
      p.style.setProperty('--y', (Math.random() * -240 + 40).toFixed(0) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      p.style.animationDelay = (Math.random() * .15).toFixed(2) + 's';
      host.appendChild(p);
    }
    setTimeout(function () { host.innerHTML = ''; }, 1700);
  }

  /* ------------------------------------------------------------------ *
   * Process: a route drawn through the steps, flown by the logo's bird.
   * ------------------------------------------------------------------ */
  function initJourney() {
    var box = $('[data-journey]');
    var path = $('[data-journey-path]');
    var ghost = $('[data-journey-ghost]');
    var bird = $('[data-journey-bird]');
    var steps = $$('[data-step]', box);
    var landing = $('.landing', box);
    var samples = [];
    var total = 0;
    var dotsY = [];

    function catmull(pts) {
      var d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      return d;
    }

    function build() {
      var br = box.getBoundingClientRect();
      var pts = [];
      dotsY = [];
      steps.forEach(function (s, i) {
        var r = $('.step__dot', s).getBoundingClientRect();
        var x = r.left + r.width / 2 - br.left;
        var y = r.top + r.height / 2 - br.top;
        if (i === 0) pts.push([x, y - 70]);
        pts.push([x, y]);
        dotsY.push(y);
      });
      var lr = landing.getBoundingClientRect();
      var first = pts[0][0];
      pts.push([lr.left + lr.width / 2 - br.left, lr.top - br.top - 40]);
      if (window.innerWidth <= 760) pts[pts.length - 1][0] = first;
      var d = catmull(pts);
      path.setAttribute('d', d);
      ghost.setAttribute('d', d);
      path.setAttribute('pathLength', '1');
      total = path.getTotalLength();
      samples = [];
      var N = 240;
      for (var k = 0; k <= N; k++) {
        var pt = path.getPointAtLength(total * k / N);
        samples.push({ l: total * k / N, x: pt.x, y: pt.y });
      }
      update();
    }

    function update() {
      if (!samples.length) return;
      var br = box.getBoundingClientRect();
      var target = window.innerHeight * .55 - br.top;
      if (reduce) target = Infinity;
      var idx = 0;
      while (idx < samples.length - 1 && samples[idx + 1].y <= target) idx++;
      var s = samples[idx];
      var frac = s.l / total;
      if (target < samples[0].y) frac = 0;
      path.style.setProperty('--draw', (1 - frac).toFixed(4));
      var a = samples[Math.max(0, idx - 2)], b = samples[Math.min(samples.length - 1, idx + 2)];
      var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
      var w = bird.offsetWidth, h = bird.offsetHeight;
      bird.style.setProperty('--bx', (s.x - w / 2).toFixed(1) + 'px');
      bird.style.setProperty('--by', (s.y - h / 2).toFixed(1) + 'px');
      bird.style.setProperty('--ba', ang.toFixed(1) + 'deg');
      steps.forEach(function (st, i) { st.classList.toggle('is-lit', dotsY[i] <= s.y + 2); });
    }

    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; update(); });
    }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(build).observe(box);
    window.addEventListener('load', build);
    build();
  }

  /* ------------------------------------------------------------------ *
   * Universities: map pins + city chips filter the list.
   * ------------------------------------------------------------------ */
  function initUnis() {
    var chips = $$('[data-city-filter]');
    var unis = $$('[data-uni-list] .uni');
    var pins = $$('.pin');
    var map = $('.map');

    function filter(city) {
      chips.forEach(function (c) {
        var on = c.getAttribute('data-city-filter') === city;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      var i = 0;
      unis.forEach(function (u) {
        var show = city === 'all' || u.getAttribute('data-city') === city;
        u.hidden = !show;
        u.classList.remove('is-pop');
        if (show) {
          void u.offsetWidth;
          u.style.setProperty('--i', i++);
          u.classList.add('is-pop');
        }
      });
      pins.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-city') === city); });
      map.classList.toggle('has-filter', city !== 'all');
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { filter(c.getAttribute('data-city-filter')); });
    });
    pins.forEach(function (p) {
      p.addEventListener('click', function () {
        var city = p.getAttribute('data-city');
        filter(p.classList.contains('is-on') ? 'all' : city);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Loan match.
   * ------------------------------------------------------------------ */
  function initLoan() {
    var range = $('[data-loan-amt]');
    var out = $('[data-loan-out]');
    var type = $('[data-loan-type]');
    var desc = $('[data-loan-desc]');
    var result = $('[data-loan-result]');
    var cta = $('[data-loan-cta]');
    var radios = $$('[data-loan-col]');
    var COPY = {
      yes: ['Secured education loan', 'Backed by collateral such as property or an FD. Usually allows higher amounts and lower interest.'],
      no: ['Unsecured education loan', 'No collateral needed. Approval is based on your profile, course and co-applicant income.'],
      unsure: ["We'll compare both", 'A loan specialist will compare secured and unsecured options for your case.']
    };

    function update(flash) {
      var v = +range.value;
      var pct = (v - range.min) / (range.max - range.min) * 100;
      range.style.setProperty('--pct', pct + '%');
      out.textContent = '₹' + v + ' lakh';
      range.setAttribute('aria-valuetext', v + ' lakh rupees');
      var col = (radios.filter(function (r) { return r.checked; })[0] || radios[1]).value;
      type.textContent = COPY[col][0];
      desc.textContent = COPY[col][1];
      cta.setAttribute('data-interest', 'Education loan: ₹' + v + ' lakh, collateral: ' + col);
      if (flash) {
        result.classList.remove('flash');
        void result.offsetWidth;
        result.classList.add('flash');
      }
    }
    range.addEventListener('input', function () { update(false); });
    radios.forEach(function (r) { r.addEventListener('change', function () { update(true); }); });
    update(false);
  }

  /* ------------------------------------------------------------------ *
   * FAQ accordion.
   * ------------------------------------------------------------------ */
  function initFaq() {
    $$('[data-accordion] .acc').forEach(function (acc, i) {
      var btn = $('button', acc);
      function set(open) {
        acc.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      }
      btn.addEventListener('click', function () { set(!acc.classList.contains('is-open')); });
      if (i === 0) set(true);
    });
  }

  /* ------------------------------------------------------------------ *
   * Lead forms.
   * ------------------------------------------------------------------ */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function fieldWrap(el) { return el.closest('.field') || el.closest('.consent'); }

  function clearErrors(form) {
    $$('.is-invalid', form).forEach(function (w) { w.classList.remove('is-invalid'); });
    $$('.err', form).forEach(function (e) { e.remove(); });
    $$('[aria-invalid]', form).forEach(function (e) { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby'); });
    $('[data-form-msg]', form).textContent = '';
  }

  var errId = 0;
  function flag(el, text) {
    var wrap = fieldWrap(el);
    wrap.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    if (wrap.classList.contains('field')) {
      var e = doc.createElement('small');
      e.className = 'err';
      e.id = 'err-' + (++errId);
      e.textContent = text;
      wrap.appendChild(e);
      el.setAttribute('aria-describedby', e.id);
    }
  }

  function validate(form) {
    clearErrors(form);
    var bad = [];
    var name = form.elements.name, email = form.elements.email, phone = form.elements.phone_number;
    var slot = form.elements.preferredCallTime, consent = form.elements.consent;
    if (name.value.trim().length < 2) { flag(name, 'Please enter your full name.'); bad.push(name); }
    var digits = phone.value.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) { flag(phone, 'Enter a valid phone number (7–15 digits).'); bad.push(phone); }
    if (!EMAIL_RE.test(email.value.trim())) { flag(email, 'Enter a valid email address.'); bad.push(email); }
    if (slot && !slot.value) { flag(slot, 'Pick a time for our call.'); bad.push(slot); }
    if (consent && !consent.checked) { flag(consent, ''); bad.push(consent); }
    if (bad.length) {
      bad[0].focus({ preventScroll: false });
      if (consent && !consent.checked && bad.length === 1) {
        $('[data-form-msg]', form).textContent = 'Please tick the box so we can contact you.';
      }
    }
    return !bad.length;
  }

  function buildPayload(form) {
    var f = form.elements;
    var val = function (n) { return f[n] ? String(f[n].value || '').trim() : ''; };
    var data = {
      name: val('name'),
      email: val('email'),
      phone: (val('country_code') + ' ' + val('phone_number')).trim(),
      destination: 'New Zealand',
      page: location.host + location.pathname,
      from_name: 'NZ landing page · ' + (form.getAttribute('data-source') || 'Form'),
      botcheck: val('botcheck'),
      preferredCallTime: val('preferredCallTime'),
      consent: f.consent && f.consent.checked ? 'yes' : '',
      studyLevel: val('studyLevel'),
      intake: val('intake'),
      englishTest: val('englishTest'),
      interest: val('interest'),
      question: val('question')
    };
    var utm = readUtm() || {};
    UTM_KEYS.forEach(function (k) { if (utm[k]) data[k] = utm[k]; });
    Object.keys(data).forEach(function (k) { if (data[k] === '' && k !== 'botcheck') delete data[k]; });
    return data;
  }

  function showDone(form, data) {
    var tpl = $('#tpl-done').content.cloneNode(true);
    var first = (data.name || '').split(/\s+/)[0];
    $('[data-done-name]', tpl).textContent = first || 'friend';
    $('[data-done-slot]', tpl).textContent = data.preferredCallTime ? 'at ' + data.preferredCallTime : 'soon';
    var done = tpl.firstElementChild;
    form.hidden = true;
    form.parentNode.insertBefore(done, form.nextSibling);
    done.setAttribute('tabindex', '-1');
    done.focus({ preventScroll: true });
  }

  function initForms() {
    $$('form[data-lead-form]').forEach(function (form) {
      var btn = $('[data-submit]', form);
      var btnHtml = btn.innerHTML;
      var msg = $('[data-form-msg]', form);

      var phone = form.elements.phone_number;
      phone.addEventListener('input', function () {
        var clean = phone.value.replace(/[^\d\s-]/g, '');
        if (clean !== phone.value) phone.value = clean;
      });
      form.addEventListener('input', function (e) {
        var w = fieldWrap(e.target);
        if (w && w.classList.contains('is-invalid')) {
          w.classList.remove('is-invalid');
          var err = $('.err', w);
          if (err) err.remove();
          e.target.removeAttribute('aria-invalid');
        }
      });
      form.addEventListener('change', function (e) {
        if (e.target.name === 'consent' && e.target.checked) fieldWrap(e.target).classList.remove('is-invalid');
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(form)) return;
        var data = buildPayload(form);
        btn.disabled = true;
        btn.textContent = 'Reserving your call…';

        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
          .then(function (res) {
            if (res && res.success) {
              store.set('tc_lead', '1');
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({ event: 'generate_lead', lead_source: form.getAttribute('data-source') || '', country: 'new-zealand' });
              showDone(form, data);
            } else {
              msg.textContent = (res && res.message) || 'Something went wrong. Please try again.';
            }
          })
          .catch(function () {
            msg.textContent = 'Network error. Please check your connection and try again, or WhatsApp us on +91 70109 02329.';
          })
          .then(function () {
            btn.disabled = false;
            btn.innerHTML = btnHtml;
          });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Lead pop-up: every "[data-lead]" button opens it with context.
   * ------------------------------------------------------------------ */
  function initModal() {
    var dlg = $('[data-modal]');
    var form = $('form', dlg);
    var titleEl = $('[data-modal-title]', dlg);
    var subEl = $('[data-modal-sub]', dlg);
    var ctxEl = $('[data-modal-ctx]', dlg);
    var interest = $('[data-modal-interest]', dlg);
    var intake = $('[data-modal-intake]', dlg);
    var supported = typeof dlg.showModal === 'function';

    function resetForm() {
      var done = $('.done', dlg);
      if (done) done.remove();
      form.hidden = false;
      clearErrors(form);
    }

    function open(opts) {
      if (!supported) { location.hash = '#consult'; return; }
      resetForm();
      titleEl.textContent = opts.title || 'Book a free consultation';
      subEl.textContent = opts.sub || 'Pick a slot and a counsellor will call you.';
      interest.value = opts.interest || opts.title || '';
      intake.value = opts.intake || '';
      ctxEl.hidden = !opts.ctx;
      ctxEl.textContent = opts.ctx || '';
      form.setAttribute('data-source', opts.source || 'Popup');
      dlg.classList.remove('is-closing');
      dlg.showModal();
      setTimeout(function () { form.elements.name.focus(); }, 60);
    }

    function close() {
      if (!dlg.open) return;
      if (reduce) { dlg.close(); return; }
      dlg.classList.add('is-closing');
      setTimeout(function () { dlg.classList.remove('is-closing'); dlg.close(); }, 240);
    }

    $$('[data-lead]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ctx = btn.getAttribute('data-interest');
        open({
          title: btn.getAttribute('data-title'),
          sub: btn.getAttribute('data-sub'),
          interest: ctx,
          ctx: ctx && ctx.length < 90 ? ctx.replace(/^NZ plan\. /, '') : (ctx ? ctx.slice(0, 86) + '…' : ''),
          intake: btn.getAttribute('data-intake-value'),
          source: btn.getAttribute('data-source')
        });
      });
    });
    $('[data-modal-close]', dlg).addEventListener('click', close);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

    // Exit intent: once per session, desktop only, never after a lead.
    if (!finePointer || !supported) return;
    var armedAt = Date.now() + 20000;
    doc.addEventListener('mouseout', function (e) {
      if (e.relatedTarget || e.clientY > 8 || Date.now() < armedAt) return;
      if (dlg.open || store.get('tc_lead') || store.get('tc_exit', true)) return;
      store.set('tc_exit', '1', true);
      open({
        title: 'Before you go: a free profile check',
        sub: 'Leave your number and a counsellor will tell you your best-fit universities and intake. It costs nothing.',
        interest: 'Free profile check (exit intent)',
        source: 'Exit intent'
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Marquee loop + WhatsApp hint.
   * ------------------------------------------------------------------ */
  function initMisc() {
    var list = $('.marquee__list');
    var copy = list.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    $$('img', copy).forEach(function (i) { i.alt = ''; });
    list.parentNode.appendChild(copy);

    var fab = $('[data-fab]');
    setTimeout(function () {
      fab.classList.add('show-tip');
      setTimeout(function () { fab.classList.remove('show-tip'); }, 4500);
    }, 9000);
  }

  /* universities.html still links to the old section ids. */
  function mapLegacyHash() {
    var LEGACY = {
      home: 'top', contact: 'consult', services: 'process', testimonials: 'reasons',
      scholarships: 'loans', 'financial-aid': 'loans', 'earn-while-you-learn': 'reasons', relocate: 'visas'
    };
    var id = LEGACY[location.hash.slice(1)];
    if (!id) return;
    history.replaceState(null, '', '#' + id);
    setTimeout(function () { doc.getElementById(id).scrollIntoView(); }, 50);
  }

  function boot() {
    mapLegacyHash();
    fillSelects();
    initHeader();
    initHero();
    initPassNotches();
    initReveal();
    initPointerFx();
    initReasons();
    initIntakes();
    initDocs();
    initJourney();
    initUnis();
    initLoan();
    initFaq();
    initForms();
    initModal();
    initMisc();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
