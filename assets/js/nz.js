/* Tutee Connect · Study in New Zealand landing page. Leads POST to /api/enquiry. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // responsive WebP photo sets: assets/img/hd/<slot>-<width>.webp
  const HDW = { 'hero-': [640, 1024, 1600, 1920, 2400, 2880], 'postcard-': [640, 1024, 1600], 'consult-': [640, 1024, 1600] };
  const hdSet = s => (HDW[Object.keys(HDW).find(k => s.startsWith(k))] || [640, 1024, 1600, 2400]).map(w => './assets/img/hd/' + s + '-' + w + '.webp ' + w + 'w').join(', ');
  const hdSrc = s => './assets/img/hd/' + s + '-1024.webp';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;

  /* ---------- a refresh always starts at the hero (no restored scroll position, no section hash) ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (nav && nav.type === 'reload' && location.hash) history.replaceState(null, '', location.pathname + location.search);
  scrollTo(0, 0);

  /* ---------- storage, UTM capture (first touch, 30 days), legacy anchors ---------- */
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } }, del: k => { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } } };
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const ENQUIRY_ENDPOINT = '/api/enquiry';     // this site's own Netlify function; it forwards to Apps Script
  const LEAD_DONE_KEY = 'tc_nz_lead_done';      // a sent form shows "Form completed" for 30 days
  const readUtm = () => { try { const s = JSON.parse(store.get('tc_utm') || 'null'); if (s && Date.now() - s.at < 2592e6) return s.v; } catch (e) { /* corrupt */ } return null; };
  if (!readUtm()) { const p = new URLSearchParams(location.search), f = {}; UTM_KEYS.forEach(k => { const v = p.get(k); if (v) f[k] = v.slice(0, 150); }); if (Object.keys(f).length) store.set('tc_utm', JSON.stringify({ at: Date.now(), v: f })); }
  // universities.html and older campaigns link to the previous page's section ids
  const LEGACY = { top: 'hero', home: 'hero', contact: 'consult', services: 'process', testimonials: 'stories', scholarships: 'why', 'financial-aid': 'trust', 'earn-while-you-learn': 'why', relocate: 'process', reasons: 'why', intakes: 'consult', visas: 'process', documents: 'process', universities: 'unis', loans: 'trust' };
  const legacyId = LEGACY[location.hash.slice(1)];
  if (legacyId) history.replaceState(null, '', '#' + legacyId);


  /* ---------- split headings into masked words ---------- */
  function splitWords(el) {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) { f.appendChild(document.createTextNode(t)); return; } const w = document.createElement('span'), i = document.createElement('span'); w.className = 'w'; i.textContent = t; w.appendChild(i); f.appendChild(w); });
        n.replaceWith(f);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------- content built from data ---------- */
  const banks = [['icici.png', 'ICICI Bank'], ['hdfc-credila.jpg', 'HDFC Credila'], ['axis.jpg', 'Axis Bank'], ['avanse.jpg', 'Avanse'], ['auxilo.jpg', 'Auxilo'], ['idfc.jpg', 'IDFC FIRST Bank'], ['incred.jpg', 'InCred'], ['mpower.jpg', 'MPOWER'], ['prodigy.jpg', 'Prodigy Finance'], ['union.jpg', 'Union Bank of India'], ['tata-capital.jpg', 'Tata Capital'], ['poonawalla-fincorp.jpg', 'Poonawalla Fincorp']];
  const bl = banks.map(b => '<li><img src="./assets/img/loan-partner/' + b[0] + '" alt="' + b[1] + '" loading="lazy"></li>').join('');
  $('#banks').innerHTML = '<ul>' + bl + '</ul><ul aria-hidden="true">' + bl + '</ul>';

  const POST = [
    { msg: 'Amma, the lake here changes colour every hour. Classes are small and my lecturer already knows my name!', name: 'Karthik', to: ['Amma & Appa', 'Anna Nagar, Chennai', 'Tamil Nadu, India'], place: 'Wānaka', reo: 'Glendhu Bay', img: 'postcard-wanaka', c: '#0F5556', date: '12 MAR 26' },
    { msg: 'Got a part-time job at a café in week three. The loan plan is working out exactly as they said.', name: 'Ananya', to: ['Mr & Mrs Rao', 'Indiranagar, Bengaluru', 'Karnataka, India'], place: 'Auckland', reo: 'Tāmaki Makaurau', img: 'postcard-auckland', c: '#8C0B0B', date: '04 APR 26' },
    { msg: 'Dunedin feels like a whole town of students. Found three Tamil friends in the first week.', name: 'Harini', to: ['Amma', 'RS Puram, Coimbatore', 'Tamil Nadu, India'], place: 'Dunedin', reo: 'Ōtepoti', img: 'postcard-dunedin', c: '#B07510', date: '21 FEB 26' }
  ]; (window.__TC_DATA = window.__TC_DATA || {}).post = POST;   // read by Tutee AI
  $('#cards').innerHTML = POST.map((p, i) => '<article class="pcard" tabindex="0" aria-label="Postcard from ' + p.name + ' in ' + p.place + '"><div class="pcard__in">' +
    '<div class="pcard__face pc-back"><div class="pc-msg"><p>' + p.msg + '</p><b>– ' + p.name + '</b></div>' +
    '<div class="pc-side"><span class="pc-stamp"><svg viewBox="0 0 50 62" aria-hidden="true"><rect width="50" height="62" fill="' + p.c + '"/><path d="M25 54C25 40 24 32 30 25C36 18 34 9 27 9C20 9 17 16 21 21C24 25 29 22 28 18" fill="none" stroke="#F4B73D" stroke-width="2.6" stroke-linecap="round"/><path d="M25 46q-6-2-9-7M25 40q-5-2-7-6M26 46q6-2 9-7M26 40q5-2 7-6" fill="none" stroke="#FBF6EE" stroke-width="1.4" stroke-linecap="round" opacity=".7"/><text x="25" y="59" text-anchor="middle" font-family="DM Mono, monospace" font-size="5.5" fill="#FBF6EE" letter-spacing=".6">AOTEAROA</text></svg></span>' +
    '<svg class="pc-post" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="30"/><circle cx="40" cy="40" r="22"/><defs><path id="pp' + i + '" d="M40 40m-26 0a26 26 0 1 1 52 0a26 26 0 1 1-52 0"/></defs><text><textPath href="#pp' + i + '">' + p.place.toUpperCase() + ' · NEW ZEALAND ·</textPath></text><text x="40" y="43" text-anchor="middle" style="font-size:7px">' + p.date + '</text><path d="M72 30q6 -4 12 0t12 0M72 40q6 -4 12 0t12 0M72 50q6 -4 12 0t12 0"/></svg>' +
    '<div class="pc-addr">' + p.to.map(t => '<span>' + t + '</span>').join('') + '</div><span class="pc-from">Postcard · Aotearoa NZ</span></div></div>' +
    '<div class="pcard__face pc-front"><img src="' + hdSrc(p.img) + '" srcset="' + hdSet(p.img) + '" sizes="(max-width: 1000px) 92vw, 30vw" alt="' + p.place + '" loading="lazy" decoding="async"><small>Greetings from</small><strong>' + p.place + '</strong><span class="reo" style="color:var(--kowhai)">' + p.reo + '</span></div>' +
    '</div></article>').join('');
  // a mouse flips the card while it is over it (any device with a mouse, including touchscreen laptops);
  // touch and pen flip on tap; keyboard on Enter / Space
  // the card only goes 3D while it turns (.is-turning), then settles back to flat, crisp layers
  const flip = (c, on) => {
    if (on === c.classList.contains('is-flip')) return;
    if (!c.classList.contains('is-turning')) { c.classList.add('is-turning'); void c.offsetWidth; c.classList.add('is-anim'); }
    c.classList.toggle('is-flip', on);
    clearTimeout(c._turn); c._turn = setTimeout(() => c.classList.remove('is-turning', 'is-anim'), 1050);
  };
  $$('.pcard').forEach(c => {
    let lastType = '';
    c.addEventListener('pointerenter', e => { lastType = e.pointerType; if (e.pointerType === 'mouse') flip(c, true); });
    c.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') flip(c, false); });
    c.addEventListener('pointerdown', e => { lastType = e.pointerType; });
    c.addEventListener('click', () => { if (lastType !== 'mouse') flip(c, !c.classList.contains('is-flip')); });
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(c, !c.classList.contains('is-flip')); } });
  });

  // the map's satellite render isn't fetched with the hero: it loads as the universities section approaches
  // (it only shows after the outline has drawn, so there is plenty of time)
  (() => { const imgs = $$('#nzm img[data-src]'); const go = () => imgs.forEach(i => { i.src = i.dataset.src; i.removeAttribute('data-src'); if (i.decode) i.decode().catch(() => {}); });   // decoded before it's attached, so the fade-in frame doesn't stall
    if (!('IntersectionObserver' in window)) { go(); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { go(); io.disconnect(); } }, { rootMargin: '1500px 0px' }); io.observe($('#nzm')); })();
  // photos are decoded ahead of time, a screen or so before they scroll into view, so the first frame that shows
  // them doesn't stall while the browser decodes a large image
  (() => { if (!('IntersectionObserver' in window) || !HTMLImageElement.prototype.decode) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target); e.target.decode().catch(() => {}); }), { rootMargin: '1400px 0px' });
    const watch = () => $$('img[loading="lazy"]').forEach(i => { if (!i.dataset.pre) { i.dataset.pre = 1; io.observe(i); } });
    watch(); addEventListener('load', watch); })();
  // the postcards' handwriting font (73 KB) is only requested once the section is close to the screen
  (() => { const st = $('#stories'); if (!('IntersectionObserver' in window)) { st.classList.add('is-near'); return; } const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { st.classList.add('is-near'); io.disconnect(); } }, { rootMargin: '1500px 0px' }); io.observe(st); })();

  /* ---------- live NZ education news: fetched from /api/news when the section is near; hides itself if unavailable ---------- */
  (() => {
    const sec = $('#news'), list = $('#news-list'); if (!sec) return;
    const ago = d => { const s = (Date.now() - Date.parse(d)) / 1000; if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; if (s < 6048e2) { const n = Math.round(s / 86400); return n + (n === 1 ? ' day ago' : ' days ago'); } const t = new Date(d); return t.getDate() + ' ' + 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[t.getMonth()]; };   // no Intl: its first use costs ~100ms on a phone
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tile = '<svg class="ic" aria-hidden="true"><use href="#i-book"/></svg>';
    const hide = () => { sec.hidden = true; if (ST) ST.refresh(); };
    // live from /api/news; the saved snapshot (assets/js/news-snapshot.js) stands in when that isn't reachable,
    // e.g. index.html opened straight from disk or a static preview
    const snapshot = () => window.NEWS_SNAPSHOT || [];
    const load = () => (location.protocol === 'file:' ? Promise.resolve(null) : fetch('/api/news', { headers: { Accept: 'application/json' } }).then(r => (r.ok ? r.json() : null)).catch(() => null))
      .then(j => {
        const live = ((j && j.items) || []);
        const items = (live.length ? live : snapshot()).filter(i => /^https:\/\//.test(i.url)).slice(0, 4);
        if (!items.length) { hide(); return; }
        list.innerHTML = items.map(i => '<li class="nc"><a href="' + esc(i.url) + '" target="_blank" rel="noopener">' +
          (i.image && (i.image.indexOf('/api/news-img?') === 0 || i.image.indexOf('./assets/img/news/') === 0) ? '<span class="nc__img' + (i.logo ? ' nc__img--logo' : '') + '"><img src="' + esc(i.image) + '" alt="" loading="lazy" decoding="async"></span>' : '<span class="nc__img nc__img--tile">' + tile + '</span>') +
          '<span class="nc__body"><span class="nc__meta">' + esc(i.source) + ' · ' + ago(i.date) + '</span><span class="nc__t">' + esc(i.title) + '</span></span></a></li>').join('');
        // running ticker: repeat the stories until one copy is wider than the screen, then double it so the loop is seamless
        const one = list.innerHTML; let set = one;
        list.innerHTML = set; while (list.scrollWidth < innerWidth * 1.1 && set.length < one.length * 8) { set += one; list.innerHTML = set; }
        const w = list.scrollWidth;
        list.innerHTML = set + set.replace(/<li class="nc">/g, '<li class="nc" aria-hidden="true">').replace(/<a /g, '<a tabindex="-1" ');
        list.style.setProperty('--dur', Math.max(25, Math.round(w / 45)) + 's');   // about 45px per second
        list.classList.add('is-running');
        list.removeAttribute('aria-busy');
        $$('img', list).forEach(im => im.addEventListener('error', () => { const s = im.parentElement; s.classList.add('nc__img--tile'); s.innerHTML = tile; }, { once: true }));
      })
      .catch(hide);
    // load when the section comes near, or a few seconds after the page has loaded (whichever is first), once
    let started = false; const go = () => { if (!started) { started = true; load(); } };
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '1200px 0px' }); io.observe(sec); } else go();
    addEventListener('load', () => setTimeout(go, 3000));
  })();
  /* ---------- phones: sections become swipe rails (CSS) with dots that follow the scroll ---------- */
  const phone = matchMedia('(max-width: 700px)');
  function rail(track, onIndex, withDots) {
    const items = [...track.children]; if (items.length < 2) return;
    let dots = null, cur = -1;
    if (withDots) {
      dots = document.createElement('div'); dots.className = 'dots'; dots.setAttribute('aria-hidden', 'true');
      dots.innerHTML = items.map(() => '<button type="button" tabindex="-1"></button>').join('');
      track.after(dots);
      $$('button', dots).forEach((b, i) => b.addEventListener('click', () => track.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' })));
    }
    const update = () => {
      if (!phone.matches) return;
      const step = items[1].offsetLeft - items[0].offsetLeft || 1;
      let i = Math.round(track.scrollLeft / step);
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) i = items.length - 1;
      i = Math.max(0, Math.min(items.length - 1, i));
      if (i === cur) return; cur = i;
      if (dots) $$('button', dots).forEach((b, j) => b.classList.toggle('on', j === i));
      if (onIndex) onIndex(i);
    };
    track.addEventListener('scroll', update, { passive: true });
    if (dots) dots.firstElementChild.classList.add('on');
  }
  // why Tutee Connect, phones: the six services are icon tiles; the chosen one opens in a panel below
  (() => {
    const box = $('#services'), tiles = $$('.svc', box);
    const panel = document.createElement('div');
    panel.className = 'svc-panel'; panel.id = 'svc-panel'; panel.setAttribute('aria-live', 'polite');
    box.after(panel);
    const pick = (i, user) => {
      tiles.forEach((t, j) => { t.classList.toggle('on', j === i); t.setAttribute('aria-pressed', j === i); });
      const t = tiles[i];
      panel.innerHTML = '<span class="svc-panel__n">' + String(i + 1).padStart(2, '0') + ' / 06</span>' + t.querySelector('svg').outerHTML + '<b>' + t.querySelector('h3').innerHTML + '</b><p>' + t.querySelector('p').innerHTML + '</p>';
      if (user && !reduce) panel.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.16,1,.3,1)' });
    };
    tiles.forEach((t, i) => {
      if (phone.matches) { t.setAttribute('role', 'button'); t.tabIndex = 0; }
      t.addEventListener('click', () => { if (phone.matches) pick(i, true); });
      t.addEventListener('keydown', e => { if (phone.matches && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(i, true); } });
    });
    pick(0, false);
  })();
  // touch screens: say how the postcards work there
  if (!matchMedia('(hover: hover)').matches) { const h = $('.stories__head > p'); if (h) h.lastChild.textContent = 'Tap a postcard to read the message'; }

  /* ---------- city gallery: each card opens an immersive "step inside" view ---------- */
  (() => {
    const CITIES = [
      { id: 'auckland', code: 'AKL', name: 'Auckland', reo: 'Tāmaki Makaurau', island: 'North', at: [67.3, 21.5], tag: 'The City of Sails: harbours, volcanoes and New Zealand’s biggest job market.',
        week: { img: 'city-auckland', pic: 'Waitematā Harbour and the city skyline', alt: 'Auckland waterfront and skyline' },
        weekend: { img: 'weekend-auckland', pic: 'Piha black-sand beach, about 45 minutes west', alt: 'Lion Rock on Piha Beach, west of Auckland' },
        day: [['i-sunrise', '8:00 am', 'Flat white on the way to a 9 am lecture in the city campus.'], ['i-sun', '1:00 pm', 'Lunch by the Viaduct with your study group.'], ['i-sunset', '6:00 pm', 'A part-time shift in the CBD, or sunset from Maungawhau / Mt Eden.']],
        end: [['i-waves', 'Saturday', 'Surf or walk the black sand at Piha.'], ['i-mountain', 'Sunday', 'Ferry across the harbour to Waiheke Island.'], ['i-music', 'Festival season', 'Auckland’s Diwali festival and weekend night markets.']],
        facts: [['i-sun', 'Climate', '24° / 15°', 'Summer / winter highs, mild all year'], ['i-home', 'Room rent', 'NZ$250–380', 'Per week, shared flat'], ['i-users', 'Population', '1.7 million', 'NZ’s largest city'], ['i-briefcase', 'Part-time work', 'Plenty', 'Retail, hospitality, tech']],
        unis: ['University of Auckland', 'AUT', 'Massey (Albany)'], known: ['Business', 'Engineering', 'IT', 'Health'], vibe: [5, 3, 4, 2] },
      { id: 'wellington', code: 'WLG', name: 'Wellington', reo: 'Te Whanganui-a-Tara', island: 'North', at: [67.4, 53.3], tag: 'The capital: compact, creative and walkable, with the harbour at the end of every street.',
        week: { img: 'city-wellington', pic: 'The Wellington Cable Car, up to Kelburn campus', alt: 'The red Wellington Cable Car above the city and harbour' },
        weekend: { img: 'weekend-wellington', pic: 'Harbourside on the city waterfront', alt: 'Wellington waterfront buildings on a sunny day' },
        day: [['i-sunrise', '8:00 am', 'Ride the red cable car up the hill to Kelburn campus.'], ['i-sun', '1:00 pm', 'Lunch and vintage shops on Cuba Street.'], ['i-sunset', '6:00 pm', 'A walk along the waterfront, then Te Papa museum (free entry).']],
        end: [['i-cash', 'Sunday', 'Harbourside Market for cheap fruit, veg and street food.'], ['i-mountain', 'Morning', 'Climb Mt Victoria for the view over the harbour.'], ['i-waves', 'Afternoon', 'Ferry out to Matiu / Somes Island.']],
        facts: [['i-sun', 'Climate', '20° / 11°', 'Summer / winter highs, famously windy'], ['i-home', 'Room rent', 'NZ$230–330', 'Per week, shared flat'], ['i-users', 'Population', '215,000', 'City; about 440,000 in the region'], ['i-briefcase', 'Part-time work', 'Good', 'Hospitality, government, creative']],
        unis: ['Victoria University of Wellington', 'Massey (Wellington)'], known: ['Law', 'Public policy', 'Design', 'Film & screen'], vibe: [4, 4, 4, 3] },
      { id: 'christchurch', code: 'CHC', name: 'Christchurch', reo: 'Ōtautahi', island: 'South', at: [51.3, 69.3], tag: 'The Garden City: flat, green and easy to cycle, with mountains and coast an hour away.',
        week: { img: 'city-christchurch', pic: 'New Regent Street in the central city', alt: 'Pastel shopfronts and a tram on New Regent Street, Christchurch' },
        weekend: { img: 'weekend-christchurch', pic: 'The road to Akaroa on Banks Peninsula', alt: 'Hills above Akaroa Harbour on Banks Peninsula' },
        day: [['i-sunrise', '8:00 am', 'Cycle to class through Hagley Park.'], ['i-sun', '1:00 pm', 'Lunch at Riverside Market in the rebuilt city centre.'], ['i-sunset', '6:00 pm', 'An evening punt or walk along the Ōtākaro / Avon River.']],
        end: [['i-waves', 'Saturday', 'Drive over the hills to Akaroa on Banks Peninsula.'], ['i-mountain', 'Winter', 'Ski fields such as Mt Hutt, about 90 minutes away.'], ['i-compass', 'Sunday', 'Walk or bike the Port Hills tracks.']],
        facts: [['i-sun', 'Climate', '23° / 11°', 'Summer / winter highs, four clear seasons'], ['i-home', 'Room rent', 'NZ$190–280', 'Per week, shared flat'], ['i-users', 'Population', '400,000', 'South Island’s largest city'], ['i-briefcase', 'Part-time work', 'Good', 'Construction, agritech, hospitality']],
        unis: ['University of Canterbury', 'Lincoln University', 'Ara Institute'], known: ['Engineering', 'Agritech', 'Sciences', 'Teaching'], vibe: [3, 4, 4, 4] },
      { id: 'dunedin', code: 'DUD', name: 'Dunedin', reo: 'Ōtepoti', island: 'South', at: [35.1, 86], tag: 'New Zealand’s student city: Scottish stone, flatting culture and wildlife on the doorstep.',
        week: { img: 'city-dunedin', pic: 'Dunedin Railway Station', alt: 'The Dunedin Railway Station in stone and tile' },
        weekend: { img: 'weekend-dunedin', pic: 'Second Beach, St Clair', alt: 'Surf rolling into the coast at St Clair, Dunedin' },
        day: [['i-sunrise', '8:00 am', 'Walk to lectures past the University of Otago clocktower.'], ['i-sun', '1:00 pm', 'Lunch with friends around the Octagon.'], ['i-sunset', '6:00 pm', 'Flat dinner with your flatmates. Student flats here are a tradition.']],
        end: [['i-waves', 'Saturday', 'Surf or swim at St Clair beach.'], ['i-compass', 'Sunday', 'Albatross and penguins out on the Otago Peninsula.'], ['i-mountain', 'Any day', 'Climb Baldwin Street, one of the world’s steepest streets.']],
        facts: [['i-sun', 'Climate', '19° / 10°', 'Summer / winter highs, cool and fresh'], ['i-home', 'Room rent', 'NZ$180–260', 'Per week, shared flat'], ['i-users', 'Population', '135,000', 'About one in five are students'], ['i-briefcase', 'Part-time work', 'Steady', 'Hospitality, retail, campus jobs']],
        unis: ['University of Otago', 'Otago Polytechnic'], known: ['Health sciences', 'Medicine', 'Dentistry', 'Research'], vibe: [3, 5, 5, 5] },
      { id: 'queenstown', code: 'ZQN', name: 'Queenstown', reo: 'Tāhuna', island: 'South', at: [21.2, 80], tag: 'The adventure capital: lake, mountains and a year-round hospitality and tourism industry.',
        week: { img: 'city-queenstown', pic: 'TSS Earnslaw on Lake Wakatipu', alt: 'The steamship TSS Earnslaw on Lake Wakatipu, Queenstown' },
        weekend: { img: 'weekend-queenstown', pic: 'The Remarkables, above the lake', alt: 'Snow on The Remarkables mountain range, Queenstown' },
        day: [['i-sunrise', '8:00 am', 'Hospitality classes with a view of Lake Wakatipu.'], ['i-sun', '1:00 pm', 'Lunch on the lakefront between classes.'], ['i-sunset', '6:00 pm', 'A shift at a hotel or restaurant: the town runs on tourism.']],
        end: [['i-mountain', 'Winter', 'Ski or snowboard at The Remarkables or Coronet Peak.'], ['i-landmark', 'Saturday', 'Gold-rush history and cafés in Arrowtown.'], ['i-waves', 'Summer', 'Jet boats, lake swims and hikes.']],
        facts: [['i-sun', 'Climate', '22° / 8°', 'Summer / winter highs, snowy winters'], ['i-home', 'Room rent', 'NZ$300–450', 'Per week; book early'], ['i-users', 'Population', '50,000', 'Queenstown Lakes district'], ['i-briefcase', 'Part-time work', 'Plenty', 'Hotels, ski fields, tourism']],
        unis: ['Queenstown Resort College', 'SIT Queenstown'], known: ['Hospitality', 'Tourism', 'Event management'], vibe: [3, 5, 2, 1] }
    ]; (window.__TC_DATA = window.__TC_DATA || {}).cities = CITIES;   // read by Tutee AI
    const VIBE = ['City buzz', 'Nature on the doorstep', 'Student life', 'Easy on the budget'];
    const n = CITIES.length, imm = $('#imm'), layers = $('#imm-layers'), hero = $('#imm-hero'), modeBtns = $$('.imm__mode button'), pill = $('.imm__pill');
    const srcset = hdSet;
    let cur = 0, mode = 'week', lastFocus = null, timer = 0, swapT = 0;

    // New Zealand time now, and the gap to India
    const tz = (zone, d) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(d).map(x => [x.type, x.value])); return { h: +p.hour, m: +p.minute, wd: p.weekday, ms: Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) }; };
    const nzNow = () => { try { return tz('Pacific/Auckland', new Date()); } catch (e) { return null; } };
    const nzSlot = () => { const t = nzNow(); if (!t) return { weekend: false, i: -1 }; return { weekend: t.wd === 'Sat' || t.wd === 'Sun', i: t.h >= 6 && t.h < 11 ? 0 : t.h >= 11 && t.h < 16 ? 1 : t.h >= 16 && t.h < 23 ? 2 : -1 }; };
    function clock() {
      const t = nzNow(); if (!t) { $('.imm__clock').hidden = true; return; }
      let gap = ''; try { const d = Math.round((t.ms - tz('Asia/Kolkata', new Date()).ms) / 6e4); gap = ' · ' + Math.floor(d / 60) + 'h' + (d % 60 ? ' ' + d % 60 + 'm' : '') + ' ahead of India'; } catch (e) { /* no tz data */ }
      $('#imm-clock').textContent = 'It’s ' + (((t.h + 11) % 12) + 1) + ':' + String(t.m).padStart(2, '0') + (t.h < 12 ? ' am' : ' pm') + ' in ' + CITIES[cur].name + gap;
    }

    function placePill() { const b = modeBtns.find(x => x.dataset.mode === mode); pill.style.width = b.offsetWidth + 'px'; pill.style.transform = 'translateX(' + (b.offsetLeft - 5) + 'px)'; }
    function showPhoto(instant, poster) {
      const s = CITIES[cur][mode], el = document.createElement('div');
      el.className = 'imm__layer' + (instant ? ' is-now is-in' : '');
      if (poster) el.style.backgroundImage = 'url("' + poster + '")';
      el.innerHTML = '<img src="' + hdSrc(s.img) + '" srcset="' + srcset(s.img) + '" sizes="100vw" alt="' + s.alt + '" decoding="async">';
      if (instant) layers.innerHTML = '';
      layers.appendChild(el);
      if (!instant) { const go = () => { void el.offsetWidth; el.classList.add('is-in'); }, im = el.querySelector('img'); if (im.complete) go(); else { im.addEventListener('load', go, { once: true }); im.addEventListener('error', go, { once: true }); } }
      setTimeout(() => { while (layers.children.length > 2) layers.firstElementChild.remove(); }, 1600);
    }
    function fill() {
      const c = CITIES[cur], s = c[mode], now = nzSlot(), items = mode === 'week' ? c.day : c.end;
      $('#imm-code').textContent = c.code; $('#imm-reo').textContent = c.reo; $('#imm-name').textContent = c.name; $('#imm-tag').textContent = c.tag; $('#imm-pic').textContent = s.pic;
      $('#imm-day').innerHTML = items.map((d, i) => { const isNow = mode === 'week' ? (!now.weekend && now.i === i) : (now.weekend && i === 0); return '<li' + (isNow ? ' class="is-now"' : '') + '>' + (isNow ? '<span class="imm__nowtag">You’d be here now</span>' : '') + '<svg class="ic" aria-hidden="true"><use href="#' + d[0] + '"/></svg><time>' + d[1] + '</time><p>' + d[2] + '</p></li>'; }).join('');
      $('#imm-facts').innerHTML = c.facts.map(f => '<div><dt><svg class="ic" aria-hidden="true"><use href="#' + f[0] + '"/></svg>' + f[1] + '</dt><dd>' + f[2] + '<small>' + f[3] + '</small></dd></div>').join('');
      $('#imm-lists').innerHTML = '<p class="imm__lbl">Study here at</p><ul class="imm__chips imm__chips--uni">' + c.unis.map(u => '<li>' + u + '</li>').join('') + '</ul><p class="imm__lbl">Known for</p><ul class="imm__chips">' + c.known.map(u => '<li>' + u + '</li>').join('') + '</ul>';
      $('#imm-vibe').innerHTML = VIBE.map((v, i) => '<li><span>' + v + '</span><span>' + c.vibe[i] + ' / 5</span><span class="imm__bar"><i style="transform:scaleX(0)" data-v="' + c.vibe[i] / 5 + '"></i></span></li>').join('');
      void $('#imm-vibe').offsetWidth; $$('#imm-vibe i').forEach(b => b.style.transform = 'scaleX(' + b.dataset.v + ')');
      $('#imm-go-t').textContent = 'Plan my move to ' + c.name;
      $('#imm-prev-t').textContent = CITIES[(cur - 1 + n) % n].name; $('#imm-next-t').textContent = CITIES[(cur + 1) % n].name;
      $('#imm-count').textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
      clock();
    }
    function swap() { if (reduce) { fill(); return; } imm.classList.add('is-swap'); clearTimeout(swapT); swapT = setTimeout(() => { fill(); imm.classList.remove('is-swap'); }, 230); }
    function setCity(i) { cur = (i + n) % n; showPhoto(); swap(); }
    function setMode(m) { if (m === mode) return; mode = m; modeBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m)); placePill(); showPhoto(); swap(); }
    const rectClip = (r, rad) => 'inset(' + Math.max(0, r.top) + 'px ' + Math.max(0, innerWidth - r.right) + 'px ' + Math.max(0, innerHeight - r.bottom) + 'px ' + Math.max(0, r.left) + 'px round ' + rad + 'px)';

    function openCity(i, card) {
      cur = i; mode = nzSlot().weekend ? 'weekend' : 'week';
      modeBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
      const poster = mode === 'week' ? (card.querySelector('.city__img img') || {}).currentSrc : '';
      lastFocus = document.activeElement;
      imm.classList.remove('is-open', 'is-ready'); imm.hidden = false;
      document.documentElement.classList.add('imm-lock');
      fill(); showPhoto(true, poster); placePill(); timer = setInterval(clock, 30000);
      if (!reduce && imm.animate) imm.animate([{ clipPath: rectClip(card.getBoundingClientRect(), 30) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 1000, easing: 'cubic-bezier(.7,0,.2,1)' });
      void imm.offsetWidth; imm.classList.add('is-open'); setTimeout(() => imm.classList.add('is-ready'), 1400);
      $('#imm-close').focus({ preventScroll: true });
    }
    function closeCity(then) {
      if (imm.hidden) return;
      const card = $('.city[data-city="' + CITIES[cur].id + '"]'), r = card && card.getBoundingClientRect(), seen = r && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
      let fin = false; const done = () => { if (fin) return; fin = true; imm.hidden = true; imm.classList.remove('is-open', 'is-ready'); document.documentElement.classList.remove('imm-lock'); clearInterval(timer); layers.style.transform = ''; if (then) then(); else if (lastFocus) lastFocus.focus({ preventScroll: true }); };
      imm.classList.remove('is-open', 'is-ready');
      if (reduce || !imm.animate || then) { done(); return; }
      imm.animate(seen ? [{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: rectClip(r, 30) }] : [{ opacity: 1 }, { opacity: 0 }], { duration: seen ? 800 : 400, easing: 'cubic-bezier(.7,0,.2,1)' }).onfinish = done; setTimeout(done, 900);
    }

    // cards: tilt towards the pointer, a "step inside" lens follows it, click opens the city
    // one "step inside" tag, fixed to the viewport so the card's tilt and the scrolling track can't skew it
    const tag = document.createElement('span');
    tag.className = 'city-tag'; tag.setAttribute('aria-hidden', 'true');
    tag.innerHTML = '<svg class="ic"><use href="#i-compass"/></svg>Step inside';
    document.body.appendChild(tag);
    addEventListener('scroll', () => tag.classList.remove('is-on'), { passive: true });
    $$('.city[data-city]').forEach(card => {
      const i = CITIES.findIndex(c => c.id === card.dataset.city); if (i < 0) return;
      $('.city__open', card).addEventListener('click', () => openCity(i, card));
      if (reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      card.addEventListener('pointermove', e => { tag.style.transform = 'translate(' + (e.clientX + 16) + 'px,' + (e.clientY + 18) + 'px)'; tag.classList.add('is-on'); });
      card.addEventListener('pointerleave', () => tag.classList.remove('is-on'));
    });

    modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    // fetch the other scene early when someone reaches for the toggle
    modeBtns.forEach(b => b.addEventListener('pointerenter', () => { const s = CITIES[cur][b.dataset.mode], im = new Image(); im.sizes = '100vw'; im.srcset = srcset(s.img); }));
    $('#imm-prev').addEventListener('click', () => setCity(cur - 1));
    $('#imm-next').addEventListener('click', () => setCity(cur + 1));
    $('#imm-close').addEventListener('click', () => closeCity());
    addEventListener('resize', () => { if (!imm.hidden) placePill(); });
    imm.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeCity(); return; }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.target.closest('.imm__mode')) { e.preventDefault(); setCity(cur + (e.key === 'ArrowRight' ? 1 : -1)); return; }
      if (e.key !== 'Tab') return;
      const f = $$('button, a[href]', imm).filter(x => x.offsetParent !== null), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    // swipe between cities on touch screens
    let sx = 0, sy = 0;
    hero.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    hero.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) setCity(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
    // look around: the photo drifts against the pointer
    if (!reduce && matchMedia('(hover: hover)').matches) {
      imm.addEventListener('pointermove', e => { const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; layers.style.transform = 'translate(' + (-x * 36) + 'px,' + (-y * 24) + 'px)'; });
    }
    // the CTA carries the city into the counselling form
    $('#imm-go').addEventListener('click', () => { const name = CITIES[cur].name; closeCity(() => { $('#h-dest').value = 'New Zealand – ' + name; const q = $('#q-city'); if (q) q.value = name; goTo('#consult'); setTimeout(() => $('#c-name').focus({ preventScroll: true }), 1700); }); });
  })();

  /* ---------- city route: a flight itinerary (AKL → WLG → CHC → DUD → ZQN) plus arrows on every card ----------
     A plane flies along the route as you move through the cities; each stop jumps to its city; the ends of the route
     leave the section (back to the previous one, or skip on). Desktop (pinned): it moves the page scroll that drives
     the horizontal track. Smaller screens: it scrolls the swipe rail. */
  let citiesPin = null;   // { st, dist } while the desktop pinned layout is active
  const cityNav = (() => {
    const box = $('#cjour'); if (!box) return null;
    const track = $('#track'), cards = $$('.city', track), list = $('#cjour-stops'), plane = $('#cjour-plane'), fill = $('#cjour-fill');
    const names = cards.map(c => c.dataset.city ? $('h3', c).textContent.trim() : 'Not sure?'), last = cards.length - 1, nCities = cards.filter(c => c.dataset.city).length;
    const codes = cards.map(c => c.dataset.city ? $('.city__big', c).textContent.trim() : '?');
    list.innerHTML = codes.map((c, i) => '<li style="--at:' + (i / last * 100).toFixed(3) + '%"><button type="button" data-i="' + i + '" aria-label="' + (i < nCities ? 'Go to ' + names[i] : 'Not sure? Get help choosing a city') + '"><span>' + c + '</span></button></li>').join('');
    const stopsEls = $$('li', list);
    // arrows on each card's sides (above the card's own "step inside" button)
    cards.forEach((c, i) => {
      const mk = (dir, label) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'city__nav city__nav--' + dir; b.setAttribute('aria-label', label); b.innerHTML = '<svg class="ic"><use href="#i-arrow"/></svg>'; b.addEventListener('click', e => { e.stopPropagation(); go(i + (dir === 'next' ? 1 : -1)); }); c.appendChild(b); };
      if (!c.dataset.city) return;   // the "Can't decide?" card has no arrows
      if (i > 0) mk('prev', 'Previous city: ' + names[i - 1]);
      if (i < last) mk('next', i + 1 < nCities ? 'Next city: ' + names[i + 1] : 'Next: not sure which city?');
    });
    let queued = false, lastV = 0;
    // where each card sits, in the active mode's units: pinned = scroll progress 0..1, rail = scrollLeft in px
    const stops = () => cards.map(c => {
      const centre = c.offsetLeft - track.offsetLeft + c.offsetWidth / 2;
      if (citiesPin) return Math.min(1, Math.max(0, (centre - innerWidth / 2) / citiesPin.dist()));
      return Math.min(track.scrollWidth - track.clientWidth, Math.max(0, centre - track.clientWidth / 2));
    });
    const now = () => citiesPin ? citiesPin.st.progress : track.scrollLeft;
    const set = s => {
      if (citiesPin) { const st = citiesPin.st, y = st.start + s * (st.end - st.start); scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
      else track.scrollTo({ left: s, behavior: reduce ? 'auto' : 'smooth' });
    };
    const toValue = s => { const P = stops(); if (s <= P[0]) return 0; for (let i = 0; i < last; i++) if (s <= P[i + 1]) return i + (P[i + 1] > P[i] ? (s - P[i]) / (P[i + 1] - P[i]) : 1); return last; };
    const ui = v => {
      const i = Math.round(v), f = v / last;
      box.style.setProperty('--pf', f.toFixed(4)); fill.parentElement.style.setProperty('--p', (f * 100).toFixed(2) + '%');
      if (Math.abs(v - lastV) > .01) plane.style.setProperty('--rot', v < lastV ? '225deg' : '45deg'); lastV = v;   // the plane faces the way you're travelling
      stopsEls.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-past', k < i); });
      $('#cjour-n').textContent = String(Math.min(i, nCities - 1) + 1).padStart(2, '0'); $('#cjour-name').textContent = i < nCities ? names[i] : 'Not sure? We’ll help you choose';
    };
    const sync = () => { queued = false; ui(toValue(now())); };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
    function go(i) { i = Math.max(0, Math.min(last, i)); set(stops()[i]); }
    list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(+b.dataset.i); });
    list.addEventListener('keydown', e => { const k = e.key; if (k !== 'ArrowRight' && k !== 'ArrowLeft') return; e.preventDefault(); const i = Math.round(toValue(now())) + (k === 'ArrowRight' ? 1 : -1); go(i); const b = $$('button', list)[Math.max(0, Math.min(last, i))]; if (b) b.focus({ preventScroll: true }); });
    // leave the section either way, without scrolling through every city
    // jump straight there (no smooth scroll), so the cities' horizontal scroll animation doesn't play on the way
    // …behind a quick cream wipe: it sweeps over the screen in the direction of travel, the page jumps underneath,
    // then the wipe lifts off the new section
    const veil = document.createElement('div'); veil.className = 'jumpveil'; veil.setAttribute('aria-hidden', 'true'); document.body.appendChild(veil);
    const jump = t => { const y = t.getBoundingClientRect().top + scrollY; scrollTo({ top: y, behavior: 'auto' }); };
    $$('[data-jump]', box).forEach(b => b.addEventListener('click', () => {
      const t = $(b.dataset.jump); if (!t) return;
      if (reduce) { jump(t); return; }
      veil.dataset.dir = b.classList.contains('cjour__skip--back') ? 'up' : 'down';
      veil.classList.remove('is-out'); veil.classList.add('is-in');
      setTimeout(() => { jump(t); requestAnimationFrame(() => { veil.classList.remove('is-in'); veil.classList.add('is-out'); setTimeout(() => veil.classList.remove('is-out'), 520); }); }, 380);
    }));
    addEventListener('scroll', onScroll, { passive: true }); track.addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll, { passive: true });
    ui(0);
    return { sync: onScroll };
  })();

  const FAQ = [
    ['Is the first consultation really free?', 'Yes. Speaking to a counsellor costs nothing and there is no obligation. We call you in the slot you choose.'],
    ['Do I need IELTS, PTE or TOEFL?', 'Most universities ask for an English test score. We coach you and book the test, and tell you the exact score each course needs.'],
    ['Can I work while I study?', 'Most student visas allow part-time work during term and full-time work in scheduled breaks. We confirm the current limits for your visa.'],
    ['Can I get an education loan?', 'Yes. Our twelve lending partners offer secured and unsecured loans covering tuition, flights and living costs. We compare offers for you.'],
    ['Is there a pathway to work or residence?', 'Eligible graduates can apply for a post-study work visa of up to three years, and some go on to residence pathways. We assess your profile on the call.'],
    ['Can my family come with me?', 'Partners and children apply for their own visas based on their relationship to you. We plan the right timing in the consultation.'],
    ['Do you help after I land?', 'Yes. Airport pickup, SIM card, accommodation, bank account and part-time work support, and later your post-study work visa.']
  ]; (window.__TC_DATA = window.__TC_DATA || {}).faq = FAQ;   // read by Tutee AI
  $('#acc').innerHTML = FAQ.map((f, i) => '<div class="qa"><button type="button" aria-expanded="false" aria-controls="qa' + i + '"><span class="qa__n">' + String(i + 1).padStart(2, '0') + '</span><span class="qa__q">' + f[0] + '</span><span class="qa__x"><svg class="ic"><use href="#i-plus"/></svg></span></button><div class="qa__a" id="qa' + i + '" role="region"><div><p>' + f[1] + '</p></div></div></div>').join('');
  $$('.qa button').forEach(b => b.addEventListener('click', () => { const q = b.parentElement, open = !q.classList.contains('open'); $$('.qa.open').forEach(x => { x.classList.remove('open'); $('button', x).setAttribute('aria-expanded', 'false'); }); if (open) { q.classList.add('open'); b.setAttribute('aria-expanded', 'true'); } setTimeout(() => ST && ST.refresh(), 600); }));

  /* ---------- smooth scroll ---------- */
  // ScrollTrigger measures the page when it starts, so it is started further down (startScroll), once every section
  // has been built: the page is then laid out once before first paint, not twice.
  // Scrolling is the browser's own (no smooth-scroll library): it runs on the compositor thread, so it stays smooth
  // even while the page is busy painting a new section. A script-driven smooth scroll stalls whenever painting does.
  const startScroll = () => {
    if (G && ST) G.registerPlugin(ST);
    // the phone address bar showing / hiding must not re-measure every trigger
    if (ST) ST.config({ ignoreMobileResize: true });
  };
  const goTo = sel => { const t = typeof sel === 'string' ? $(sel) : sel; if (!t) return; t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); };
  window.__goTo = goTo;   // used by unis.js and ai.js
  $$('[data-scroll]').forEach(a => a.addEventListener('click', e => { const h = a.getAttribute('href'); if (h && h[0] === '#') { e.preventDefault(); goTo(h === '#top' ? '#hero' : h); } }));
  let tt; function toast(m) { const t = $('#toast'); $('span', t).textContent = m; t.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('is-on'), 2400); }

  /* ---------- consult form: 2 steps + country code picker ---------- */
  const CC = 'AF|Afghanistan|93;AL|Albania|355;DZ|Algeria|213;AS|American Samoa|1684;AD|Andorra|376;AO|Angola|244;AI|Anguilla|1264;AG|Antigua and Barbuda|1268;AR|Argentina|54;AM|Armenia|374;AW|Aruba|297;AU|Australia|61;AT|Austria|43;AZ|Azerbaijan|994;BS|Bahamas|1242;BH|Bahrain|973;BD|Bangladesh|880;BB|Barbados|1246;BY|Belarus|375;BE|Belgium|32;BZ|Belize|501;BJ|Benin|229;BM|Bermuda|1441;BT|Bhutan|975;BO|Bolivia|591;BA|Bosnia and Herzegovina|387;BW|Botswana|267;BR|Brazil|55;IO|British Indian Ocean Territory|246;VG|British Virgin Islands|1284;BN|Brunei|673;BG|Bulgaria|359;BF|Burkina Faso|226;BI|Burundi|257;KH|Cambodia|855;CM|Cameroon|237;CA|Canada|1;CV|Cape Verde|238;KY|Cayman Islands|1345;CF|Central African Republic|236;TD|Chad|235;CL|Chile|56;CN|China|86;CO|Colombia|57;KM|Comoros|269;CG|Congo|242;CD|Congo (DRC)|243;CK|Cook Islands|682;CR|Costa Rica|506;CI|Côte d’Ivoire|225;HR|Croatia|385;CU|Cuba|53;CW|Curaçao|599;CY|Cyprus|357;CZ|Czechia|420;DK|Denmark|45;DJ|Djibouti|253;DM|Dominica|1767;DO|Dominican Republic|1809;EC|Ecuador|593;EG|Egypt|20;SV|El Salvador|503;GQ|Equatorial Guinea|240;ER|Eritrea|291;EE|Estonia|372;SZ|Eswatini|268;ET|Ethiopia|251;FK|Falkland Islands|500;FO|Faroe Islands|298;FJ|Fiji|679;FI|Finland|358;FR|France|33;GF|French Guiana|594;PF|French Polynesia|689;GA|Gabon|241;GM|Gambia|220;GE|Georgia|995;DE|Germany|49;GH|Ghana|233;GI|Gibraltar|350;GR|Greece|30;GL|Greenland|299;GD|Grenada|1473;GP|Guadeloupe|590;GU|Guam|1671;GT|Guatemala|502;GG|Guernsey|44;GN|Guinea|224;GW|Guinea-Bissau|245;GY|Guyana|592;HT|Haiti|509;HN|Honduras|504;HK|Hong Kong|852;HU|Hungary|36;IS|Iceland|354;IN|India|91;ID|Indonesia|62;IR|Iran|98;IQ|Iraq|964;IE|Ireland|353;IM|Isle of Man|44;IL|Israel|972;IT|Italy|39;JM|Jamaica|1876;JP|Japan|81;JE|Jersey|44;JO|Jordan|962;KZ|Kazakhstan|7;KE|Kenya|254;KI|Kiribati|686;XK|Kosovo|383;KW|Kuwait|965;KG|Kyrgyzstan|996;LA|Laos|856;LV|Latvia|371;LB|Lebanon|961;LS|Lesotho|266;LR|Liberia|231;LY|Libya|218;LI|Liechtenstein|423;LT|Lithuania|370;LU|Luxembourg|352;MO|Macau|853;MG|Madagascar|261;MW|Malawi|265;MY|Malaysia|60;MV|Maldives|960;ML|Mali|223;MT|Malta|356;MH|Marshall Islands|692;MQ|Martinique|596;MR|Mauritania|222;MU|Mauritius|230;YT|Mayotte|262;MX|Mexico|52;FM|Micronesia|691;MD|Moldova|373;MC|Monaco|377;MN|Mongolia|976;ME|Montenegro|382;MS|Montserrat|1664;MA|Morocco|212;MZ|Mozambique|258;MM|Myanmar|95;NA|Namibia|264;NR|Nauru|674;NP|Nepal|977;NL|Netherlands|31;NC|New Caledonia|687;NZ|New Zealand|64;NI|Nicaragua|505;NE|Niger|227;NG|Nigeria|234;NU|Niue|683;KP|North Korea|850;MK|North Macedonia|389;MP|Northern Mariana Islands|1670;NO|Norway|47;OM|Oman|968;PK|Pakistan|92;PW|Palau|680;PS|Palestine|970;PA|Panama|507;PG|Papua New Guinea|675;PY|Paraguay|595;PE|Peru|51;PH|Philippines|63;PL|Poland|48;PT|Portugal|351;PR|Puerto Rico|1787;QA|Qatar|974;RE|Réunion|262;RO|Romania|40;RU|Russia|7;RW|Rwanda|250;WS|Samoa|685;SM|San Marino|378;ST|São Tomé and Príncipe|239;SA|Saudi Arabia|966;SN|Senegal|221;RS|Serbia|381;SC|Seychelles|248;SL|Sierra Leone|232;SG|Singapore|65;SX|Sint Maarten|1721;SK|Slovakia|421;SI|Slovenia|386;SB|Solomon Islands|677;SO|Somalia|252;ZA|South Africa|27;KR|South Korea|82;SS|South Sudan|211;ES|Spain|34;LK|Sri Lanka|94;KN|St Kitts and Nevis|1869;LC|St Lucia|1758;VC|St Vincent and the Grenadines|1784;SD|Sudan|249;SR|Suriname|597;SE|Sweden|46;CH|Switzerland|41;SY|Syria|963;TW|Taiwan|886;TJ|Tajikistan|992;TZ|Tanzania|255;TH|Thailand|66;TL|Timor-Leste|670;TG|Togo|228;TO|Tonga|676;TT|Trinidad and Tobago|1868;TN|Tunisia|216;TR|Türkiye|90;TM|Turkmenistan|993;TC|Turks and Caicos Islands|1649;TV|Tuvalu|688;UG|Uganda|256;UA|Ukraine|380;AE|United Arab Emirates|971;GB|United Kingdom|44;US|United States|1;UY|Uruguay|598;VI|US Virgin Islands|1340;UZ|Uzbekistan|998;VU|Vanuatu|678;VA|Vatican City|39;VE|Venezuela|58;VN|Vietnam|84;WF|Wallis and Futuna|681;YE|Yemen|967;ZM|Zambia|260;ZW|Zimbabwe|263'
    .split(';').map(r => { const [iso, name, dial] = r.split('|'); return { iso: iso.toLowerCase(), name, dial: '+' + dial }; });
  const POPULAR = ['in', 'ae', 'sa', 'qa', 'om', 'kw', 'bh', 'lk', 'np', 'bd', 'sg', 'my'];
  const flag = iso => './assets/img/flags/' + iso + '.png';
  const ccEl = $('#cc'), ccBtn = $('#cc-btn'), ccPop = $('#cc-pop'), ccList = $('#cc-list'), ccQ = $('#cc-q');
  let ccSel = CC.find(c => c.iso === 'in'), ccHl = -1, ccItems = [];
  const opt = c => '<li class="cc__opt" role="option" data-iso="' + c.iso + '" aria-selected="' + (c === ccSel) + '"><img src="' + flag(c.iso) + '" alt="" loading="lazy" width="26" height="18"><span>' + c.name + '</span><small>' + c.dial + '</small></li>';
  function renderCC(q) {
    q = (q || '').trim().toLowerCase().replace(/^\+/, '');
    const hit = c => !q || c.name.toLowerCase().includes(q) || c.dial.slice(1).startsWith(q) || c.iso === q;
    let html = '';
    if (!q) html += '<li class="cc__group" role="presentation">Popular</li>' + POPULAR.map(i => opt(CC.find(c => c.iso === i))).join('') + '<li class="cc__group" role="presentation">All countries</li>';
    const rest = CC.filter(hit);
    html += rest.map(opt).join('') || '<li class="cc__empty">No country matches "' + q + '"</li>';
    ccList.innerHTML = html; ccItems = $$('.cc__opt', ccList); ccHl = -1;
  }
  function openCC(on) {
    ccPop.hidden = !on; ccEl.classList.toggle('open', on); ccBtn.setAttribute('aria-expanded', on);
    if (on) { ccQ.value = ''; renderCC(''); setTimeout(() => ccQ.focus(), 30); const s = ccList.querySelector('[aria-selected="true"]'); if (s) s.scrollIntoView({ block: 'nearest' }); }
  }
  function pickCC(iso, quiet) {
    ccSel = CC.find(c => c.iso === iso); $('#cc-flag').src = flag(iso); $('#cc-code').textContent = ccSel.dial;
    ccBtn.setAttribute('aria-label', 'Country code: ' + ccSel.name + ' ' + ccSel.dial); openCC(false);
    if (quiet) return;
    ccBtn.focus();
    if ($('#c-phone').value.trim()) verifyPhone();   // re-check the number against the new country
  }
  ccBtn.addEventListener('click', () => openCC(ccPop.hidden));
  ccQ.addEventListener('input', () => renderCC(ccQ.value));
  ccList.addEventListener('click', e => { const o = e.target.closest('.cc__opt'); if (o) pickCC(o.dataset.iso); });
  ccQ.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ccHl = Math.max(0, Math.min(ccItems.length - 1, ccHl + (e.key === 'ArrowDown' ? 1 : -1))); ccItems.forEach((o, i) => o.classList.toggle('hl', i === ccHl)); ccItems[ccHl] && ccItems[ccHl].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = ccItems[Math.max(0, ccHl)]; if (o) pickCC(o.dataset.iso); }
    else if (e.key === 'Escape') { openCC(false); ccBtn.focus(); }
  });
  document.addEventListener('click', e => { if (!ccEl.contains(e.target)) openCC(false); });

  const panes = $$('#cform .cpane'), stepsUI = $$('#csteps li'); let step = 0;
  function go(n) {
    const back = n < step; step = n;
    panes.forEach((p, i) => { p.classList.toggle('on', i === n); p.classList.toggle('back-in', i === n && back); });
    stepsUI.forEach((s, i) => { s.classList.toggle('done', i < n); s.classList.toggle('now', i === n); });
    $('#c-back').hidden = n === 0; $('#c-n').textContent = 'Step ' + (n + 1) + ' of 2';
    $('#c-next').innerHTML = n === 1 ? 'Request my call <svg class="ic"><use href="#i-arrow"/></svg>' : 'Continue <svg class="ic"><use href="#i-arrow"/></svg>';
    $('#c-err').textContent = '';
  }
  /* ---------- email + phone verification ----------
     Not a code sent to the student: checks that the address and number are real.
     Email: strict format, typo suggestions (gmial.com → gmail.com), throwaway inboxes and
     placeholders refused, then /api/verify-email confirms the domain has a mail server.
     Phone: libphonenumber (mobile metadata, loaded when the form is near) checks the number
     is a real mobile for the chosen country; obvious fakes (9999999999, 9876543210) are refused. */
  const emEl = $('#c-email'), phEl = $('#c-phone');
  function setState(el, state, msg) {
    const f = el.parentElement, m = $('.ff__msg', f);
    f.dataset.state = state || ''; f.classList.toggle('bad', state === 'bad');
    el.setAttribute('aria-invalid', state === 'bad' ? 'true' : 'false');
    m.textContent = ''; if (!msg) return;
    if (typeof msg === 'string') m.textContent = msg; else m.append(...msg);
  }
  const MAIL_HOSTS = ['gmail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'hotmail.com', 'outlook.com', 'outlook.in', 'live.com', 'icloud.com', 'me.com', 'rediffmail.com', 'protonmail.com', 'proton.me', 'aol.com', 'msn.com', 'ymail.com', 'zoho.com', 'zohomail.in', 'gmx.com', 'hotmail.co.uk', 'yahoo.co.uk', 'googlemail.com'];
  const DISPOSABLE = new Set(('mailinator.com mailinator.net mailinator2.com guerrillamail.com guerrillamail.net guerrillamailblock.com sharklasers.com grr.la pokemail.net spam4.me 10minutemail.com 10minutemail.net temp-mail.org temp-mail.io tempmail.com tempmail.net tempmailo.com tempinbox.com throwawaymail.com yopmail.com yopmail.net getnada.com nada.email dispostable.com maildrop.cc mailnesia.com trashmail.com trashmail.de mintemail.com fakeinbox.com emailondeck.com mohmal.com moakt.com spamgourmet.com mailcatch.com mytemp.email tempr.email discard.email burnermail.io inboxkitten.com mail.tm mail.gw emailfake.com fakemail.net mailpoof.com tmpmail.org tmpmail.net minuteinbox.com 1secmail.com 1secmail.org 1secmail.net spambox.us harakirimail.com linshiyouxiang.net bugmenot.com').split(' '));
  const PLACEHOLDER = /^(test|testing|tester|abc|abcd|asdf|asdfgh|qwerty|xyz|example|sample|demo|fake|none|na|null|noemail|nomail|no|xxx|aaa|user|email|mail|name)\d*$/;
  const TLD_FIX = { con: 'com', cmo: 'com', ocm: 'com', vom: 'com', xom: 'com', comm: 'com', cim: 'com', cpm: 'com', cm: 'com', om: 'com', nte: 'net', ent: 'net', ogr: 'org', ocm1: 'com' };
  const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
  function lev(a, b) { const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let prev = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } } return d[b.length]; }
  function emailIssue(v) {
    if (!v) return { bad: 'Add your email address so we can send your plan.' };
    if (v.length > 254 || !EMAIL_RE.test(v) || v.split('@')[0].length > 64) return { bad: 'That email address isn’t complete. It should look like name@gmail.com.' };
    const at = v.lastIndexOf('@'), local = v.slice(0, at), domain = v.slice(at + 1).toLowerCase();
    if (DISPOSABLE.has(domain) || [...DISPOSABLE].some(d => domain.endsWith('.' + d))) return { bad: 'Temporary inboxes expire before we can send your plan. Use an email you check.' };
    if (/^(example|test|domain|email)\.(com|org|net|in)$/.test(domain) || (PLACEHOLDER.test(local.toLowerCase()) && PLACEHOLDER.test(domain.split('.')[0]))) return { bad: 'This looks like a placeholder. Use the email you actually check.' };
    // typo checks: a known mail provider one or two letters off, or a mistyped ending
    const parts = domain.split('.'), tld = parts.pop(), fixedTld = TLD_FIX[tld];
    let guess = fixedTld ? parts.concat(fixedTld).join('.') : domain;
    if (!MAIL_HOSTS.includes(guess)) { let best = null, bd = 3; MAIL_HOSTS.forEach(h => { const dd = lev(guess, h); if (dd < bd && (dd <= 1 || guess.length > 6)) { bd = dd; best = h; } }); if (best && bd <= 2) guess = best; }
    if (domain === 'gmail.co' || domain === 'gmail.in') guess = 'gmail.com';
    return guess !== domain ? { suggest: local + '@' + guess, domain } : { domain };
  }
  const mxCache = new Map();
  function mailServer(domain) {
    if (mxCache.has(domain)) return mxCache.get(domain);
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
    const p = fetch('/api/verify-email?domain=' + encodeURIComponent(domain), { headers: { Accept: 'application/json' }, signal: ctl.signal })
      .then(r => r.ok ? r.json() : null).then(j => (j && typeof j.deliverable === 'boolean') ? j.deliverable : null)
      .catch(() => null).then(v => { clearTimeout(t); if (v === null) mxCache.delete(domain); return v; });   // null = could not tell; never block on it
    mxCache.set(domain, p); return p;
  }
  let emAck = '';                    // a suggestion the student has seen and chosen to ignore
  async function verifyEmail(final) {
    const v = emEl.value.trim(); emEl.value = v;
    const r = emailIssue(v);
    if (r.bad) { setState(emEl, 'bad', r.bad); return false; }
    if (r.suggest && emAck !== v) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ff__fix'; b.textContent = r.suggest;
      b.addEventListener('click', () => { emEl.value = r.suggest; emAck = ''; verifyEmail(false); emEl.focus(); });
      setState(emEl, 'warn', ['Did you mean ', b, '?']);
      if (final) { emAck = v; return false; }          // ask once; a second submit keeps what they typed
      return true;
    }
    setState(emEl, 'checking', 'Checking this address can receive email…');
    const ok = await mailServer(r.domain);
    if (emEl.value.trim() !== v) return true;          // they kept typing; a newer check will run
    if (ok === false) { setState(emEl, 'bad', 'We can’t find a mail server for “' + r.domain + '”. Check the spelling after the @.'); return false; }
    setState(emEl, 'ok', ''); return true;
  }
  emEl.addEventListener('blur', () => { if (emEl.value.trim()) verifyEmail(false); });
  // as they type: once the field has been checked, the format is re-checked on every key (the mail-server
  // lookup waits until they pause), so the message updates or clears without leaving the field
  let emT = 0;
  emEl.addEventListener('input', () => {
    clearTimeout(emT);
    if (!emEl.parentElement.dataset.state) return;
    const r = emailIssue(emEl.value.trim());
    if (r.bad) { setState(emEl, 'bad', r.bad); return; }
    setState(emEl, '', ''); emT = setTimeout(() => verifyEmail(false), 700);
  });

  // phone: libphonenumber-js (MIT, mobile metadata) is ~190 KB, so it loads only when the form is near
  let LP = null, lpP = null;
  const loadLP = () => lpP || (lpP = new Promise(res => { const s = document.createElement('script'); s.src = './assets/vendor/libphonenumber-mobile.js'; s.onload = () => { LP = window.libphonenumber || null; res(LP); }; s.onerror = () => res(null); document.head.appendChild(s); }));
  // loaded when the form is close AND the main thread is idle (never in the middle of a scroll), or at once when a field is focused
  const idleLP = () => ('requestIdleCallback' in window ? requestIdleCallback(() => loadLP()) : setTimeout(loadLP, 200));
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { idleLP(); io.disconnect(); } }, { rootMargin: '600px 0px' }); io.observe($('#consult')); } else loadLP();
  $('#cform').addEventListener('focusin', loadLP, { once: true });
  const looksFake = d => { const n = d.replace(/^0+/, ''); return n.length >= 6 && (/^(\d)\1+$/.test(n) || '01234567890123456789'.includes(n) || '98765432109876543210'.includes(n) || /^(\d{2,3})\1{2,}$/.test(n)); };
  function parsePhone() {
    const raw = phEl.value.trim(), digits = raw.replace(/\D/g, '');
    if (!digits) return { bad: 'Add a WhatsApp number we can reach you on.' };
    if (LP) {
      // a number pasted with its own country code (+971…, 0091…) switches the flag to match
      if (/^(\+|00)/.test(raw)) { const p = LP.parsePhoneNumberFromString(raw.replace(/^00/, '+')); if (p && p.country) { const c = CC.find(x => x.iso === p.country.toLowerCase()); if (c && c.dial !== ccSel.dial) pickCC(c.iso, true); } }
      const iso = ccSel.iso.toUpperCase(), nat = digits.replace(/^0+/, '');
      const tries = [() => LP.parsePhoneNumberFromString(raw.replace(/^00/, '+'), iso), () => LP.parsePhoneNumberFromString(ccSel.dial + nat), () => LP.parsePhoneNumberFromString('+' + digits)];
      for (const t of tries) { let p = null; try { p = t(); } catch (e) { /* unparsable */ } if (p && p.isValid() && '+' + p.countryCallingCode === ccSel.dial) { if (looksFake(p.nationalNumber)) return { bad: 'This doesn’t look like a real number. Add the WhatsApp number you use.' }; return { ok: p }; } }
      return { bad: ccSel.iso === 'in' ? 'Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.' : 'This isn’t a valid ' + ccSel.name + ' mobile number. Check the country code and digits.' };
    }
    // library not available: fall back to sane length and pattern checks
    if (looksFake(digits)) return { bad: 'This doesn’t look like a real number. Add the WhatsApp number you use.' };
    if (ccSel.iso === 'in' && !/^[6-9]\d{9}$/.test(digits.replace(/^(91|0)(?=\d{10}$)/, ''))) return { bad: 'Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.' };
    if (digits.length < 6 || digits.length > 15) return { bad: 'Check the number: it looks too ' + (digits.length < 6 ? 'short.' : 'long.') };
    return { ok: null };
  }
  let phoneE164 = '';
  async function verifyPhone() {
    if (!LP) await Promise.race([loadLP(), new Promise(r => setTimeout(r, 2500))]);
    const r = parsePhone(); phoneE164 = '';
    if (r.bad) { setState(phEl, 'bad', r.bad); return false; }
    if (r.ok) { phEl.value = r.ok.formatInternational().replace(/^\+\d+\s*/, ''); phoneE164 = r.ok.formatInternational(); }
    setState(phEl, 'ok', ''); return true;
  }
  phEl.addEventListener('blur', () => { if (phEl.value.trim()) verifyPhone(); });
  phEl.addEventListener('input', () => {
    const clean = phEl.value.replace(/[^\d\s+()-]/g, ''); if (clean !== phEl.value) phEl.value = clean;   // digits only, as they type
    if (!phEl.parentElement.dataset.state) return;
    const r = parsePhone(); setState(phEl, r.bad ? 'bad' : 'ok', r.bad || '');
  });

  // name and state: checked when the student leaves the field, then live
  const nmEl = $('#c-name'), stEl = $('#c-state');
  const nameIssue = () => nmEl.value.trim().replace(/[^A-Za-z\u00C0-\u024F]/g, '').length >= 2 ? '' : 'Please enter your full name.';
  const stateIssue = () => stEl.value ? '' : 'Please select your state.';
  function verifySimple(el, issue) { const m = issue(); setState(el, m ? 'bad' : (el.value.trim() ? 'ok' : ''), m); return !m; }
  nmEl.addEventListener('blur', () => { if (nmEl.value.trim()) verifySimple(nmEl, nameIssue); });
  nmEl.addEventListener('input', () => { if (nmEl.parentElement.dataset.state) verifySimple(nmEl, nameIssue); });
  stEl.addEventListener('change', () => verifySimple(stEl, stateIssue));

  async function check() {
    $$('#cform .ff').forEach(f => f.classList.remove('bad'));
    if (step === 1) {
      const ok = !!$('#cform input[name="study_level"]:checked');
      $('#lvls').classList.toggle('bad', !ok); $('#c-level-msg').textContent = ok ? '' : 'Choose what you’re aiming for to continue.';
      if (!ok) { $('#lvls input').focus(); return 'Choose what you’re aiming for above.'; }
      return '';
    }
    const nmOk = verifySimple(nmEl, nameIssue);
    const [emOk, phOk] = await Promise.all([verifyEmail(true), verifyPhone()]);
    const stOk = verifySimple(stEl, stateIssue);
    if (!nmOk) { nmEl.focus(); return 'Please enter your full name.'; }
    if (!emOk) { emEl.focus(); return emEl.parentElement.dataset.state === 'warn' ? 'Check your email address above, then continue.' : 'Check your email address above.'; }
    if (!phOk) { phEl.focus(); return 'Check your phone number above.'; }
    if (!stOk) { stEl.focus(); return 'Please select your state.'; }
    return '';
  }
  $('#c-back').addEventListener('click', () => go(step - 1));
  let checking = false;
  $('#cform').addEventListener('submit', async e => {
    e.preventDefault();
    if (checking) return;
    checking = true; const nb = $('#c-next'); nb.disabled = true;
    let err = ''; try { err = await check(); } finally { checking = false; nb.disabled = false; }
    if (err) { $('#c-err').textContent = err; return; }
    if (step < 1) { go(step + 1); return; }
    if (leadDone()) return;
    // the same fields the Finland form sends; the function forwards them to the Website Leads sheet + email
    const fd = new FormData($('#cform')), data = {};
    fd.forEach((v, k) => { data[k] = String(v).trim(); });
    data.phone = phoneE164 || ccSel.dial + ' ' + phEl.value.trim();
    data.page = location.host + location.pathname;
    const utm = readUtm() || {}; UTM_KEYS.forEach(k => { if (utm[k]) data[k] = utm[k]; });
    const btn = $('#c-next'), btnHtml = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Sending…'; $('#c-err').textContent = '';
    fetch(ENQUIRY_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
      .then(r => r.json().catch(() => ({ success: false })))
      .then(res => {
        if (!res || !res.success) { $('#c-err').textContent = (res && res.message) || 'Something went wrong. Please try again, or WhatsApp us on +91 73583 64959.'; return; }
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'generate_lead', lead_source: 'Counselling form', country: 'new-zealand' });
        const d = { name: data.name, call_time: data.call_time || '', at: Date.now() };
        store.set(LEAD_DONE_KEY, JSON.stringify(d));
        showLeadDone(d, true);
      })
      .catch(() => { $('#c-err').textContent = 'Network error. Check your connection and try again, or WhatsApp us on +91 73583 64959.'; })
      .then(() => { btn.disabled = false; btn.innerHTML = btnHtml; });
  });

  /* ---------- "Form completed": a sent form stays completed in this browser for 30 days ---------- */
  function leadDone() {
    try { const d = JSON.parse(store.get(LEAD_DONE_KEY) || 'null'); return d && Date.now() - d.at < 30 * 864e5 ? d : null; } catch (e) { return null; }
  }
  function showLeadDone(d, animate) {
    const first = String(d.name || '').trim().split(/\s+/)[0];
    $('#sent-h').textContent = 'Thank you' + (first ? ', ' + first : '') + '!';
    const when = d.call_time && !/^any/i.test(d.call_time) ? ' in the ' + d.call_time.replace(/\s*\(.*\)/, '').toLowerCase() : '';
    $('#sent-p').textContent = 'Your New Zealand enquiry is with our counselling team. A counsellor will call you' + when + ' within one working day.';
    $('#cform').hidden = true;
    const sent = $('#sent'); sent.hidden = false;
    if (animate && !reduce) { sent.classList.remove('on'); sent.classList.add('is-enter'); requestAnimationFrame(() => requestAnimationFrame(() => sent.classList.add('on'))); sent.focus({ preventScroll: true }); }
    else sent.classList.add('on');
  }
  // "+ Submit another enquiry": forget the sent flag and bring back a fresh form
  $('#sent-again').addEventListener('click', () => {
    store.del(LEAD_DONE_KEY);
    const form = $('#cform'); form.reset(); phoneE164 = '';
    $$('#cform .ff').forEach(x => { x.dataset.state = ''; x.classList.remove('bad'); const m = $('.ff__msg', x); if (m) m.textContent = ''; });
    $('#lvls').classList.remove('bad'); $('#c-level-msg').textContent = '';
    const sl = window.TCShortlist ? window.TCShortlist.get() : []; $('#c-unis').value = sl.join(', ');
    $('#sent').hidden = true; $('#sent').classList.remove('on', 'is-enter'); form.hidden = false;
    go(0); nmEl.focus({ preventScroll: true });
  });
  { const d = leadDone(); if (d) showLeadDone(d, false); }

  // the hero quick-start bar carries its choices into the lead as hidden fields
  const LEVEL_FROM_QUICK = { "Master's level": "Master's", "Bachelor's level": "Bachelor's", 'Diploma level': 'Diploma', 'PhD level': 'PhD' };
  $('#qform').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#q-course').value !== 'Not sure yet') $('#c-course').value = $('#q-course').value;
    const lv = $('#cform input[name="study_level"][value="' + (LEVEL_FROM_QUICK[$('#q-level').value] || '') + '"]'); if (lv) lv.checked = true;
    const city = $('#q-city').value; $('#h-dest').value = /^any/i.test(city) ? 'General New Zealand Inquiry' : 'New Zealand – ' + city;
    goTo('#consult'); setTimeout(() => $('#c-name').focus({ preventScroll: true }), 1700); });

  /* ---------- why NZ: expanding photo accordion ---------- */
    const REASONS = [
    ['All eight universities are globally ranked', 'QS World Rankings', 'Every New Zealand university features in the QS World University Rankings, so whichever you choose, your degree travels.', 'reason-01-otago', 'University of Otago, Dunedin', '40% 45%'],
    ['Work while you study', 'Part-time work rights', 'Most student visas allow part-time work during term and full-time work in scheduled breaks, which helps with living costs.', 'reason-02-auckland', 'Auckland skyline', '50% 50%'],
    ['Stay and work after you graduate', 'Post-study work visa', 'Eligible graduates can apply for a post-study work visa of up to three years to build real New Zealand experience.', 'reason-03-wellington', 'Wellington Harbour', '50% 60%'],
    ['One of the world’s safest countries', 'Global Peace Index', 'New Zealand is consistently ranked among the most peaceful nations, with friendly cities that are easy to get around.', 'reason-04-tekapo', 'Lake Tekapo', '50% 55%'],
    ['<span class="reo">Manaakitanga</span>, a culture of care', 'Pastoral Care Code', 'The Māori value of looking after guests shapes how universities and communities welcome international students.', 'reason-05-marae', 'Pukemokimoki Marae, Napier', '50% 50%'],
    ['Competitive fees and scholarships', 'Scholarship support', 'Tuition compares well with the UK, US and Australia, and we help you find and apply for scholarships.', 'reason-06-hagley-park', 'Hagley Park, Christchurch', '50% 50%'],
    ['Practical, industry-linked degrees', 'Hands-on learning', 'Small classes, real projects and placements in IT, engineering, health and business.', 'reason-07-unleash-space', 'University of Auckland', '50% 50%'],
    ['Research that matters', 'Research culture', 'Modern labs and a hands-on research culture, from agritech and climate to earth sciences.', 'reason-08-biology', 'University of Auckland', '50% 50%'],
    ['A clear, online visa process', 'Online application', 'Immigration New Zealand runs a straightforward online application, and we prepare the full file with you.', 'reason-09-beehive', 'Parliament, Wellington', '50% 50%'],
    ['Fjords, lakes and mountains on your doorstep', 'Life beyond campus', 'Some of the world’s most dramatic landscapes are a weekend trip away from every campus.', 'reason-10-milford', 'Milford Sound · Piopiotahi', '45% 50%']
  ]; (window.__TC_DATA = window.__TC_DATA || {}).reasons = REASONS;   // read by Tutee AI
  (() => {
    const box = $('#acc10');
    box.innerHTML = REASONS.map((r, i) => '<button class="ap' + (i ? '' : ' on') + '" type="button" role="tab" aria-selected="' + !i + '" data-i="' + i + '"><img src="' + hdSrc(r[3]) + '" srcset="' + hdSet(r[3]) + '" sizes="(max-width: 700px) ' + (i === 0 || i === 9 ? '100vw' : '50vw') + ', (max-width: 899px) 100vw, min(36vw, 520px)" alt="" loading="lazy" decoding="async" style="object-position:' + r[5] + '"><span class="ap__n">' + String(i + 1).padStart(2, '0') + '</span><span class="ap__v">' + r[0].replace(/<[^>]+>/g, '').replace(/’/g, "'") + '</span><span class="ap__body"><span class="ap__tag">' + r[1] + '</span><h3>' + r[0] + '</h3><p>' + r[2] + '</p><span class="ap__place">' + r[4] + '</span></span></button>').join('');
    const panels = $$('.ap', box);
    const open = i => { panels.forEach((p, j) => { p.classList.toggle('on', j === i); p.setAttribute('aria-selected', j === i); }); $('#acc10-n').textContent = String(i + 1).padStart(2, '0'); $('#acc10-bar').style.transform = 'scaleX(' + (i + 1) / panels.length + ')'; };
    // a mouse opens a panel just by hovering it. Checked per event (not once at load), so it also works on
    // touchscreen laptops and after the window is resized up to the desktop layout.
    const wide = matchMedia('(min-width: 900px)');
    let t; panels.forEach((p, i) => {
      p.addEventListener('click', () => open(i));
      p.addEventListener('focus', () => open(i));
      p.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse' || !wide.matches) return; clearTimeout(t); t = setTimeout(() => open(i), 90); });
      p.addEventListener('pointerleave', () => clearTimeout(t));
    });
    // phones: a grid of photo tiles; tapping one slides up a sheet with the full reason
    (() => {
      const sheet = document.createElement('div');
      sheet.className = 'rs'; sheet.hidden = true;
      sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'rs-h');
      sheet.innerHTML = '<div class="rs__back" data-close></div><div class="rs__panel" id="rs-panel"><span class="rs__grip" aria-hidden="true"></span><button type="button" class="rs__close" data-close aria-label="Close"><svg class="ic"><use href="#i-plus"/></svg></button><div class="rs__img"><img id="rs-img" alt=""><span class="rs__n" id="rs-n"></span></div><div class="rs__body"><span class="ap__tag" id="rs-tag"></span><h3 id="rs-h"></h3><p id="rs-p"></p><span class="rs__place" id="rs-place"></span><div class="rs__nav"><button type="button" class="rs__prev" id="rs-prev"><svg class="ic"><use href="#i-arrow"/></svg>Previous</button><button type="button" class="rs__next" id="rs-next">Next reason<svg class="ic"><use href="#i-arrow"/></svg></button></div></div></div>';
      document.body.appendChild(sheet);
      const panel = $('#rs-panel', sheet); let at = 0, lastFocus = null;
      const fill = i => {
        at = (i + REASONS.length) % REASONS.length; const r = REASONS[at];
        const img = $('#rs-img'); img.srcset = hdSet(r[3]); img.sizes = '100vw'; img.src = hdSrc(r[3]); img.style.objectPosition = r[5];
        $('#rs-n').textContent = String(at + 1).padStart(2, '0') + ' / 10'; $('#rs-tag').textContent = r[1]; $('#rs-h').innerHTML = r[0]; $('#rs-p').textContent = r[2]; $('#rs-place').textContent = r[4];
        $('#rs-next').lastChild.previousSibling.textContent = at === REASONS.length - 1 ? 'Back to the first' : 'Next reason';
        open(at);
      };
      const show = i => {
        lastFocus = document.activeElement; fill(i); sheet.hidden = false;
        document.documentElement.classList.add('imm-lock');
        void sheet.offsetWidth; sheet.classList.add('on'); $('.rs__close', sheet).focus({ preventScroll: true });
      };
      const hide = () => {
        if (sheet.hidden) return; sheet.classList.remove('on'); panel.style.transform = '';
        let done = false; const fin = () => { if (done) return; done = true; sheet.hidden = true; document.documentElement.classList.remove('imm-lock'); if (lastFocus) lastFocus.focus({ preventScroll: true }); };
        panel.addEventListener('transitionend', fin, { once: true }); setTimeout(fin, 450);
      };
      const swap = d => { if (reduce) { fill(at + d); return; } panel.classList.add('is-swap'); setTimeout(() => { fill(at + d); panel.classList.remove('is-swap'); }, 180); };
      panels.forEach((p, i) => p.addEventListener('click', e => { if (!phone.matches) return; e.preventDefault(); show(i); }));
      $$('[data-close]', sheet).forEach(b => b.addEventListener('click', hide));
      $('#rs-prev').addEventListener('click', () => swap(-1)); $('#rs-next').addEventListener('click', () => swap(1));
      sheet.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
        if (e.key !== 'Tab') return;
        const f = $$('button', sheet).filter(x => x.offsetParent !== null), a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      });
      // drag the sheet down to close; swipe the photo sideways for the next reason
      let sy = 0, sx = 0, dy = 0, dragging = false;
      panel.addEventListener('touchstart', e => { sy = e.touches[0].clientY; sx = e.touches[0].clientX; dy = 0; dragging = panel.scrollTop <= 0; }, { passive: true });
      panel.addEventListener('touchmove', e => { if (!dragging) return; dy = e.touches[0].clientY - sy; if (dy > 0) { panel.style.transition = 'none'; panel.style.transform = 'translateY(' + dy + 'px)'; } }, { passive: true });
      panel.addEventListener('touchend', e => {
        panel.style.transition = ''; const dx = e.changedTouches[0].clientX - sx;
        if (dragging && dy > 90) { hide(); return; }
        panel.style.transform = '';
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && e.target.closest('.rs__img')) swap(dx < 0 ? 1 : -1);
      }, { passive: true });
      if (phone.matches) { const hp = $('.why__head > p'); if (hp) hp.textContent = hp.textContent.replace('Open each reason to see it.', 'Tap any reason to read it.'); }
    })();
    box.addEventListener('keydown', e => { const i = panels.findIndex(p => p.classList.contains('on')); if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); panels[Math.min(9, i + 1)].focus(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); panels[Math.max(0, i - 1)].focus(); } });
  })();

  /* ---------- how it works: compass dial ---------- */
  const STEPS = [
    ['i-chat', 'Consult', 'Free consultation', 'One call to map your course, university options, budget and career goals, with your parents if you like.', ['Profile assessment', 'Course and country fit', 'Budget plan']],
    ['i-lang', 'English test', 'English test preparation', 'IELTS, PTE or TOEFL coaching and test booking, so your score is ready before applications open.', ['Coaching classes', 'Mock tests', 'Test booking']],
    ['i-compass', 'Apply', 'Shortlist and apply', 'A university shortlist that fits your marks and budget. We prepare and submit every application.', ['University shortlist', 'Application packs', 'Offer tracking']],
    ['i-file', 'Documents', 'Documents and offer letter', 'Transcripts, financials and references assembled and checked before they go out.', ['Document checklist', 'Verification', 'Offer of place']],
    ['i-cash', 'Loan', 'Education loan', 'Secured and unsecured offers compared across our twelve lending partners, so you choose with confidence.', ['Lender comparison', 'Paperwork support', 'Sanction letter']],
    ['i-passport', 'Visa', 'Visa and statement of purpose', 'The right student visa for your plan, and an SOP that sounds like you.', ['Visa file', 'SOP review', 'Interview prep']],
    ['i-plane', 'Arrive', 'Land and settle in', 'Airport pickup, SIM, accommodation, bank account and part-time work support. Later, your post-study work visa.', ['Pre-departure briefing', 'Arrival support', 'Post-study visa help']]
  ]; (window.__TC_DATA = window.__TC_DATA || {}).steps = STEPS;   // read by Tutee AI
  (() => {
    const stage = $('#dial-stage'), dial = $('#dial'), CX = 500, CY = 510, R = 420, N = STEPS.length;
    // instrument ticks every 5°, longer every 30°
    let ticks = ''; for (let a = 0; a <= 180; a += 5) { const r1 = R + 14, r2 = R + (a % 30 === 0 ? 30 : 22), c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); ticks += '<line class="dial__tick' + (a % 30 === 0 ? ' major' : '') + '" x1="' + (CX - r1 * c).toFixed(1) + '" y1="' + (CY - r1 * s).toFixed(1) + '" x2="' + (CX - r2 * c).toFixed(1) + '" y2="' + (CY - r2 * s).toFixed(1) + '"/>'; }
    $('#dial-ticks').innerHTML = ticks;
    stage.insertAdjacentHTML('beforeend', STEPS.map((s, i) => { const a = Math.PI - i * Math.PI / (N - 1), x = CX + R * Math.cos(a), y = CY - R * Math.sin(a); return '<button class="dnode" type="button" role="tab" data-i="' + i + '" style="left:' + (x / 10).toFixed(2) + '%;top:' + (y / 5.6).toFixed(2) + '%" aria-label="Step ' + (i + 1) + ': ' + s[2] + '"><span class="dnode__c"><svg class="ic"><use href="#' + s[0] + '"/></svg></span><b>' + s[1] + '</b></button>'; }).join(''));
    const nodes = $$('.dnode', stage); let at = 0, timer = null, inView = false, user = false;
    const paint = i => { const s = STEPS[i]; $('#dl-n').textContent = 'Step ' + String(i + 1).padStart(2, '0') + ' of 07'; $('#dl-h').textContent = s[2]; $('#dl-p').textContent = s[3]; $('#dl-ul').innerHTML = s[4].map(d => '<li><svg class="ic"><use href="#i-check"/></svg>' + d + '</li>').join(''); };
    function show(i, fromUser) {
      at = (i + N) % N; if (fromUser) user = true;
      nodes.forEach((n, j) => { n.classList.toggle('on', j === at); n.classList.toggle('done', j < at); n.setAttribute('aria-selected', j === at); });
      $('#dial-prog').style.strokeDashoffset = 1 - at / (N - 1);
      dial.classList.add('is-swapping'); setTimeout(() => { paint(at); dial.classList.remove('is-swapping'); }, 220);
      clearTimeout(timer); if (inView && !user && !reduce) timer = setTimeout(() => show(at + 1), 5000);
    }
    nodes.forEach(n => n.addEventListener('click', () => show(+n.dataset.i, true)));
    $('#dl-next').addEventListener('click', () => show(at + 1, true));
    $('#dl-prev').addEventListener('click', () => show(at - 1, true));
    dial.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(at + 1, true); if (e.key === 'ArrowLeft') show(at - 1, true); });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; clearTimeout(timer); if (inView && !user && !reduce) timer = setTimeout(() => show(at + 1), 5000); }, { threshold: .45 }).observe(dial);
    paint(0); show(0);
  })();

  /* ---------- footer: Kia ora letters react to the pointer ---------- */
  (() => {
    const g = $('#giant'); g.innerHTML = [...'Kia ora'].map(ch => ch === ' ' ? '<span class="gsp"></span>' : '<span class="gl" data-ch="' + ch + '">' + ch + '</span>').join('');
    const letters = $$('.gl', g), foot = $('.foot');
    const reset = () => { g.classList.remove('is-live'); letters.forEach(l => { l.style.removeProperty('--t'); l.style.transform = ''; }); };
    foot.addEventListener('pointermove', e => {
      g.classList.add('is-live');
      letters.forEach(l => {
        const r = l.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const d = Math.hypot(e.clientX - cx, (e.clientY - cy) * 1.4), t = Math.max(0, 1 - d / 340);
        l.style.setProperty('--t', t.toFixed(3));   // gold glows in under the pointer
        l.style.transform = 'translateY(' + (-t * 7).toFixed(1) + '%)';
      });
    });
    foot.addEventListener('pointerleave', reset);
    letters.forEach((l, i) => l.addEventListener('click', () => { l.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14%) scale(1.05)' }, { transform: 'translateY(0)' }], { duration: 450, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }));
  })();

  /* ---------- beyond your degree: four stages, one detail panel ---------- */
  (() => {
    const tabs = $$('.stg'); if (!tabs.length) return;
    const STAGES = [
      { tag: 'Stage 1 · While you study', h: 'Study, earn and bring your family', p: 'Your degree is the first step. You can work part-time while you study, and your family can come with you.',
        list: ['<b>Part-time work</b> during term and full-time in scheduled holidays, on most student visas', '<b>Partners</b> of eligible students (for example postgraduate) can apply for a work visa', '<b>Children</b> can join you and attend school in New Zealand'] },
      { tag: 'Stage 2 · After you graduate', h: 'Up to 3 years of open work rights', p: 'A post-study work visa lets you work for almost any employer, so you can build New Zealand experience in your field.',
        list: ['<b>Up to 3 years</b>, depending on the level and length of your qualification', '<b>Open work rights:</b> not tied to one employer', '<b>Partners</b> may be eligible for their own work visa'] },
      { tag: 'Stage 3 · Your career', h: 'A skilled job opens the fastest routes', p: 'Roles on New Zealand\u2019s Green List, in areas like engineering, IT, health and construction, lead straight to residence routes.',
        list: ['<b>Green List roles</b> across engineering, IT, health, trades and more', '<b>Work to Residence</b> after time in an eligible Green List role', '<b>Skilled Migrant points</b> for other skilled jobs'] },
      { tag: 'Stage 4 · Your PR', h: 'Residence, for you and your family', p: 'With the right job, residence can come quickly, and it covers your partner and dependent children too.',
        list: ['<b>Straight to Residence</b> for eligible Green List Tier 1 roles', '<b>Family included:</b> partner and dependent children on your application', '<b>Citizenship</b> becomes possible after living in New Zealand as a resident'] }
    ]; (window.__TC_DATA = window.__TC_DATA || {}).stages = STAGES;   // read by Tutee AI
    const panel = $('#stg-panel'); let cur = -1, t = 0;
    const fill = i => { const s = STAGES[i]; $('#stg-tag').textContent = s.tag; $('#stg-h').textContent = s.h; $('#stg-p').textContent = s.p; $('#stg-list').innerHTML = s.list.map(l => '<li><span>' + l + '</span></li>').join(''); };
    const show = (i, focus) => {
      if (i === cur) return; const first = cur < 0; cur = i;
      tabs.forEach((b, j) => { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; });
      panel.setAttribute('aria-labelledby', 'stg-' + i);
      const bar = $('#stg-bar'); if (bar) bar.style.transform = 'scaleX(' + (i + 1) / 4 + ')';
      if (focus) tabs[i].focus();
      if (first || reduce) { fill(i); return; }
      panel.classList.add('is-swap'); clearTimeout(t); t = setTimeout(() => { fill(i); panel.classList.remove('is-swap'); }, 200);
    };
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => show(i));
      b.addEventListener('keydown', e => { const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (d) { e.preventDefault(); show((i + d + 4) % 4, true); } });
    });
    show(0);
  })();
  document.addEventListener('click', e => { const b = e.target.closest('[data-uni]'); if (b && window.TCUnis) window.TCUnis.open({ name: b.dataset.uni, type: 'University', assurance: 'AQA audited' }); });

  /* ---------- phone / tablet menu ---------- */
  (() => {
    const btn = $('#hdr-menu'), hd = $('#hdr'); if (!btn) return;
    const set = on => { hd.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', on); btn.setAttribute('aria-label', on ? 'Close menu' : 'Open menu'); };
    btn.addEventListener('click', () => set(!hd.classList.contains('is-open')));
    $$('#hdr-nav a').forEach(a => a.addEventListener('click', () => set(false)));
    document.addEventListener('click', e => { if (!hd.contains(e.target)) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  })();
  /* ---------- header, progress, mobile bar ---------- */
  const hdr = $('#hdr'); let lastY = 0;
  // the viewport is measured on the first frame / resize only, never inside the scroll handler and never while the
  // page is still being built (reading innerHeight here used to force a full extra layout before first paint)
  let vh = 0, queued = false;
  const measure = () => { vh = innerHeight; };
  function update() { queued = false; const y = scrollY; hdr.classList.toggle('is-solid', y > 60); hdr.classList.toggle('is-hidden', y > lastY && y > vh * 1.2); lastY = y; }
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  requestAnimationFrame(() => { measure(); update(); });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
  addEventListener('load', measure);
  if (ST) ST.addEventListener('refresh', measure);

  // decorative loops pause while off screen, so they stop costing compositor work on every frame
  const mistTweens = [];
  if ('IntersectionObserver' in window) {
    const watch = (el, cb) => el && new IntersectionObserver(([e]) => cb(e.isIntersecting, el)).observe(el);
    watch($('#hero'), (on, el) => { el.classList.toggle('is-off', !on); mistTweens.forEach(t => on ? t.resume() : t.pause()); });
    watch($('.banks'), (on, el) => el.classList.toggle('is-off', !on));
    watch($('#news'), (on, el) => el.classList.toggle('is-off', !on));
    watch($('#dial'), (on, el) => el.classList.toggle('is-off', !on));
  }

  /* ---------- GSAP choreography ---------- */
  const pre = $('#pre') || document.createElement('div');
  const counters = () => $$('[data-count]').forEach(el => { const end = +el.dataset.count; if (!G || reduce) { el.textContent = end.toLocaleString('en-IN'); return; } const o = { v: 0 }; G.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' }, onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('en-IN') }); });
  document.documentElement.classList.add('go');   // hero copy is held hidden by CSS until this point, so it never flashes before animating
  startScroll();
  const shown = h => h.classList.add('is-shown');
  if (!G || !ST || reduce) { pre.classList.add('is-gone'); counters(); $$('[data-split]').forEach(shown); return; }

  const mist = $$('.mist');
  const intro = G.timeline({ defaults: { ease: 'expo.out' } });
  // no loading curtain: the hero photo paints immediately and the copy rises in over it
  intro.from(mist, { opacity: 0, duration: 1.6, ease: 'power1.out' }, 0)
    .from('#hero-h .w > span', { yPercent: 125, duration: .95, stagger: .035, onComplete: () => shown($('#hero-h')) }, .05)
    .from('#hero [data-in]', { y: 20, opacity: 0, duration: .85, stagger: .07 }, .2)
    .from('#facts > div', { x: 24, opacity: 0, duration: .85, stagger: .07 }, .3)
    .from('#qform', { y: 30, opacity: 0, duration: .9 }, .35)
    .from('.hdr__bar', { y: -24, opacity: 0, duration: .7 }, .15);
  setTimeout(() => { if (intro.progress() < 1) intro.progress(1); }, 2500);
  mist.forEach((m, i) => mistTweens.push(G.to(m, { x: (i % 2 ? -1 : 1) * (40 + i * 20), duration: 14 + i * 4, yoyo: true, repeat: -1, ease: 'sine.inOut' })));

  // scroll-driven work (pins, parallax, ~40 reveal tweens) is set up just after first paint, not before it:
  // it reads computed styles for every element it animates, which forces layout on the critical path
  const T = (sel, from, trig, start, extra) => () => G.from(sel, Object.assign({ duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: trig, start } }, from, extra));
  const tasks = [
    () => G.matchMedia().add('(min-width: 1000px)', () => {
      // hero: gentle parallax as it scrolls away (no pin, so no empty gap)
      G.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })
        .to('#slides', { yPercent: 18, ease: 'none' }, 0)
        .to(mist[0], { xPercent: -30, ease: 'none' }, 0).to(mist[1], { xPercent: 30, ease: 'none' }, 0)
        .fromTo('#hero-copy', { y: 0 }, { y: -90, ease: 'none' }, 0)
        .fromTo('#facts', { y: 0 }, { y: -140, ease: 'none' }, 0);
    }),
    // cities: a free-scrolling rail (no scroll lock). The page scrolls straight past; the cards move sideways only when
    // you ask: arrows, the route, swipe, shift/trackpad sideways scroll, or drag with the mouse.
    () => {
      const track = $('#track'); if (!track) return;
      // mouse drag: the row follows the pointer 1:1 (CSS snapping is off while dragging, so nothing fights it); on release
      // it glides to a city: the next / previous one if you flicked or dragged a fair way, otherwise back to the nearest
      const cards = $$('.city', track);
      const centreOf = k => Math.max(0, Math.min(track.scrollWidth - track.clientWidth, k.offsetLeft + k.offsetWidth / 2 - track.clientWidth / 2));
      const nearest = () => { const c = track.scrollLeft; let bi = 0; cards.forEach((k, i) => { if (Math.abs(centreOf(k) - c) < Math.abs(centreOf(cards[bi]) - c)) bi = i; }); return bi; };
      let drag = null, moved = false, anim = 0;
      const glide = to => {   // own easing (not scroll-behavior) so it never fights snapping or a second drag
        cancelAnimationFrame(anim); const from = track.scrollLeft, d = to - from, t0 = performance.now(), dur = Math.min(650, 260 + Math.abs(d) * .45);
        track.classList.add('is-dragging');
        const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); track.scrollLeft = from + d * e; if (p < 1) anim = requestAnimationFrame(step); else track.classList.remove('is-dragging'); };
        anim = requestAnimationFrame(step);
      };
      track.addEventListener('dragstart', e => e.preventDefault());   // no ghost image of the photo
      track.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse' || e.button || e.target.closest('.city__nav')) return;
        cancelAnimationFrame(anim);
        drag = { id: e.pointerId, x: e.clientX, left: track.scrollLeft, start: nearest(), samples: [[e.timeStamp, e.clientX]] }; moved = false;
      });
      track.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-dragging'); track.setPointerCapture(e.pointerId); }
        if (!moved) return;
        track.scrollLeft = drag.left - dx;
        drag.samples.push([e.timeStamp, e.clientX]); if (drag.samples.length > 5) drag.samples.shift();
      });
      const end = e => {
        if (!drag || e.pointerId !== drag.id) return;
        const d = drag; drag = null;
        if (!moved) return;
        const [t0, x0] = d.samples[0], [t1, x1] = d.samples[d.samples.length - 1], v = (x1 - x0) / Math.max(1, t1 - t0);   // px per ms, + = dragged right
        const dx = (d.samples[d.samples.length - 1][1]) - d.x;
        let i = nearest();
        // free drag: no locking onto a city. A flick carries on with momentum and eases to a stop wherever it lands.
        if (Math.abs(v) > .15) glide(Math.max(0, Math.min(track.scrollWidth - track.clientWidth, track.scrollLeft - v * 320)));
      };
      track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
      track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);   // a drag isn't a tap on "step inside"
    },
    // headings + reveals, one task per element so no single slice runs long
    ...$$('[data-split]').filter(h => h.id !== 'hero-h' && h.id !== 'unis-h').map(h => () => G.from(h.querySelectorAll('.w > span'), { yPercent: 125, duration: 1.1, stagger: .045, ease: 'expo.out', onComplete: () => shown(h), scrollTrigger: { trigger: h, start: 'top 86%' } })),
    ...$$('[data-in]').filter(el => !el.closest('#hero') && !el.closest('.unis__head')).map(el => T(el, { y: 40, opacity: 0 }, el, 'top 88%')),
    counters,
    T('.svc', { y: 50, opacity: 0, duration: 1, stagger: .08 }, '#services', 'top 82%', { clearProps: 'transform,opacity' }),
    T('.stat', { y: 30, opacity: 0, duration: 1, stagger: .1 }, '.stats', 'top 85%'),
    // reasons + process
    T('#acc10', { y: 60, opacity: 0 }, '#acc10', 'top 85%', { clearProps: 'transform,opacity' }),   // the row of 10 photo panels rises as one piece: one layer to draw instead of ten
    () => G.from('#dial-prog', { strokeDashoffset: 1, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: '#dial', start: 'top 80%' } }),
    () => G.from('.dnode', { scale: 0, opacity: 0, duration: .8, stagger: .08, ease: 'back.out(2)', clearProps: 'transform,opacity', scrollTrigger: { trigger: '#dial', start: 'top 80%' } }),
    () => G.from('.dial__tick', { opacity: 0, duration: .6, stagger: .01, scrollTrigger: { trigger: '#dial', start: 'top 80%' } }),
    // postcards drop in like they've been dealt onto a table
    // universities: the NZ coastline draws itself as you scroll (pinned on desktop), then pins and the list appear
    () => G.matchMedia().add({ big: '(min-width: 900px)', small: '(max-width: 899px)' }, ctx => {
      const nzm = $('#nzm'); if (!nzm) return;
      const coast = $$('.nzm__coast'), leads = $$('.nzm__lead'), pins = $$('.nzm__pin'), items = $$('.nzm__list li');
      // dash = each path's real length, so the outline can be revealed from 0 to 100% of itself
      // the section heading (kicker, split title words, intro, button) reveals inside the map's own timeline
      // …drawn like the map: each line is first traced as an outline (left to right), then its colour fills in
      const inkEls = [$('.unis__head .kick'), ...$$('#unis-h .w > span'), $('.unis__side p')].filter(Boolean);
      $('#unis-h').classList.add('is-shown');   // no word masks: the drawing replaces the rise-in
      const headIn = (tl, dur) => {
        inkEls.forEach(el => { el.style.setProperty('--ink', getComputedStyle(el).color); el.classList.add('tdraw'); });
        tl.fromTo(inkEls, { '--draw': 0 }, { '--draw': 1, duration: dur * .55, stagger: dur * .05, ease: 'power1.inOut' }, 0)
          .fromTo(inkEls, { '--fill': 0 }, { '--fill': 1, duration: dur * .5, stagger: dur * .05, ease: 'power1.inOut' }, dur * .45)
          .fromTo('.unis__side .btn', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: dur * .35, ease: 'power2.out' }, dur * .7);
        return tl;
      };
      const L = p => { const l = p.getTotalLength(); p.style.strokeDasharray = l + ' ' + l; return l; };
      const draw = (els, from) => els.map(p => ({ el: p, len: L(p), from }));
      if (ctx.conditions.big) {
        // the drawing plays the first time you scroll through on each page load; after that the map is simply there
        const seen = false;   // every page load plays it once
        if (!seen) nzm.classList.add('is-pinned');
        // the heading above sticks with the map; the map's sticky offset follows the heading's real height
        const head = $('.unis__head'), setH = () => nzm.style.setProperty('--headh', head.offsetHeight + 'px'); setH();
        const ro = 'ResizeObserver' in window ? new ResizeObserver(setH) : null; if (ro) ro.observe(head);
        const tl = G.timeline(seen ? { defaults: { ease: 'none' }, paused: true } : { defaults: { ease: 'none' }, scrollTrigger: { trigger: nzm, start: 'top 85%', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true, onLeave: () => finish() } });   // starts as the map scrolls in; the stage is sticky, so it stays in view while it draws
        draw(coast).forEach((d, i) => tl.fromTo(d.el, { strokeDashoffset: d.len, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: .8 }, i * .05));
        headIn(tl, .8);   // the heading above rises in slowly, alongside the outline
        tl
          .fromTo('.nzm__map', { scale: 2.4, svgOrigin: '206 33' }, { scale: 1, svgOrigin: '206 33', duration: 1, ease: 'power2.inOut' }, 0)   // zooms out from the top of Northland, so the big outline only extends downwards
          .fromTo(coast, { strokeWidth: .55 }, { strokeWidth: 1.3, duration: 1, ease: 'power2.inOut' }, 0)
          .fromTo('.nzm__stage', { '--lit': 0 }, { '--lit': 1, duration: .3 }, .95)   // the 3D tilt + sheen switch on with the satellite view
          .fromTo(['.nzm__ocean', '.nzm__photo', '.nzm__lbl'], { opacity: 0 }, { opacity: 1, duration: .3, stagger: .05 }, .95)   // the satellite view washes in once the outline is complete and the zoom has settled
          .fromTo(coast, { stroke: '#0A3B3C' }, { stroke: 'rgba(226,246,242,.32)', duration: .25 }, .98)                                 // …and the drawn line becomes a fine surf line
          .fromTo(pins, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: .14, stagger: .1, ease: 'back.out(3)' }, 1.02)
          ;
        draw(leads).forEach((d, i) => tl.fromTo(d.el, { strokeDashoffset: d.len, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: .2 }, 1.06 + i * .1));
        tl
          .fromTo(items, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: .18, stagger: .1 }, 1.14)
          .fromTo('.nzm__all', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .2 }, 1.95)
          .to({}, { duration: .3 });
        // once scrolled past: finish the drawing for good and drop the tall scroll space it needed, keeping the view still
        // once scrolled past: lock the drawing in its finished state straight away (cheap), then remove the tall scroll
        // space it needed the moment scrolling pauses, keeping the view still. Doing that collapse mid-scroll would make
        // the browser repaint the whole screen in the middle of a scroll, which shows as a hitch.
        let pending = false;
        const collapse = () => {
          if (!pending) return; pending = false; removeEventListener('scroll', onScrollIdle);
          // keep the section after the map exactly where it is on screen (measured, so it also holds when the browser's
          // own scroll anchoring has already compensated part of the change)
          const ref = nzm.parentElement.closest('section').nextElementSibling || document.body, before = ref.getBoundingClientRect().top;
          nzm.classList.remove('is-pinned');
          const y = scrollY + (ref.getBoundingClientRect().top - before);
          scrollTo({ top: y, behavior: 'instant' });
          (window.requestIdleCallback || setTimeout)(() => ST.refresh(), { timeout: 400 });   // re-measure the triggers below once idle
        };
        let idleT; const onScrollIdle = () => { clearTimeout(idleT); idleT = setTimeout(collapse, 180); };
        function finish() {
          if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.progress(1);
          pending = true; addEventListener('scroll', onScrollIdle, { passive: true }); onScrollIdle();
        }
        if (seen) tl.progress(1);
        // 3D tilt toward the pointer (mouse only; the CSS keeps it off for reduced motion)
        const stage = $('.nzm__stage', nzm); let raf = 0, ev = null;
        const tilt = () => { raf = 0; if (!ev) return; const r = stage.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
          stage.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); stage.style.setProperty('--my', (y * 100).toFixed(1) + '%'); };
        const move = e => { if (e.pointerType !== 'mouse') return; ev = e; stage.classList.add('is-hover'); if (!raf) raf = requestAnimationFrame(tilt); };
        const leave = () => { ev = null; stage.classList.remove('is-hover'); stage.style.setProperty('--tx', 0); stage.style.setProperty('--ty', 0); };
        stage.addEventListener('pointermove', move); stage.addEventListener('pointerleave', leave);
        return () => { if (ro) ro.disconnect(); nzm.classList.remove('is-pinned'); stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerleave', leave); leave(); };
      }
      // phones: crop the map to the islands; touching or focusing a university lights up its pin (one at a time)
      const svg = $('.nzm__svg', nzm), vb = svg.getAttribute('viewBox');
      svg.setAttribute('viewBox', '47 23 294 373');
      const light = e => { const li = e.target.closest && e.target.closest('.nzm__list li'); if (!li) return; const i = items.indexOf(li); items.forEach((el, k) => { el.classList.toggle('is-on', k === i); if (pins[k]) pins[k].classList.toggle('is-on', k === i); }); };
      nzm.addEventListener('pointerdown', light); nzm.addEventListener('focusin', light);
      const tm = G.timeline({ scrollTrigger: { trigger: nzm, start: 'top 75%' } });
      headIn(tm, 1.6);
      draw(coast).forEach((d, i) => tm.fromTo(d.el, { strokeDashoffset: d.len }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, i * .1));
      tm
        .fromTo(['.nzm__photo', '.nzm__lbl'], { opacity: 0 }, { opacity: 1, duration: .8, stagger: .1 }, 1.2)
        .to(coast, { stroke: 'rgba(226,246,242,.32)', strokeWidth: .8, duration: .6 }, 1.4)
        .fromTo(pins, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: .35, stagger: .07, ease: 'back.out(3)' }, '-=.4')
        .fromTo(items, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .4, stagger: .06, ease: 'expo.out' }, '<');
      return () => { nzm.removeEventListener('pointerdown', light); nzm.removeEventListener('focusin', light); svg.setAttribute('viewBox', vb); [...items, ...pins].forEach(el => el.classList.remove('is-on')); };
    }),
    T('.stg', { y: 30, opacity: 0, stagger: .08 }, '.stages', 'top 88%', { clearProps: 'transform,opacity' }),
    T('.pcard', { y: 80, rotate: i => [-6, 3, -3][i] || 0, opacity: 0, duration: 1.2, stagger: .14 }, '#cards', 'top 82%', { clearProps: 'transform,opacity' }),
    // faq + consult + footer
    T('.qa', { y: 24, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out' }, '#acc', 'top 85%'),
    T('#cbox', { y: 80, opacity: 0, duration: 1.3 }, '#cbox', 'top 85%'),
    T('.cnext li', { x: -24, opacity: 0, duration: 1, stagger: .12 }, '.cnext', 'top 88%'),
    () => G.fromTo('.gl', { y: 0, yPercent: 105 }, { y: 0, yPercent: 0, duration: .9, stagger: .045, ease: 'expo.out', clearProps: 'transform', scrollTrigger: { trigger: '.giant', start: 'top 88%' } })
  ];
  // run the tasks in the browser's idle gaps (a few per frame), then one refresh so every trigger is measured once
  const runTasks = deadline => {
    const t0 = performance.now(), budget = () => !deadline || (deadline.didTimeout ? performance.now() - t0 < 24 : deadline.timeRemaining() > 6);
    do tasks.shift()(); while (tasks.length && budget());
    if (tasks.length) schedule(); else ST.refresh();
  };
  const schedule = () => 'requestIdleCallback' in window ? requestIdleCallback(runTasks, { timeout: 500 }) : setTimeout(() => runTasks({ didTimeout: true }), 16);
  // start once the web fonts have arrived (their swap re-lays-out every line of text; doing it inside a task stalls it),
  // with a 1.5s cap so a slow font never holds the animations back
  if (location.hash) runTasks(null);
  else { let begun = false; const begin = () => { if (!begun) { begun = true; schedule(); } }; if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(begin)); setTimeout(begin, 1500); }

  addEventListener('load', () => { ST.refresh(); const t = location.hash && document.getElementById(location.hash.slice(1)); if (t) { intro.progress(1); const jump = () => { const y = t.getBoundingClientRect().top + scrollY; scrollTo({ top: y, behavior: 'instant' }); }; setTimeout(jump, 60); setTimeout(() => { ST.refresh(); jump(); }, 900); } });
  window.__shot = (at, p) => { intro.progress(1); pre.classList.add('is-gone'); const el = $('#' + at), base = el.closest('.pin-spacer') || el; const y = base.getBoundingClientRect().top + scrollY + (p || 0) * Math.max(0, base.offsetHeight - innerHeight); scrollTo({ top: y, behavior: 'instant' }); ST.update(); return Math.round(y); };
})();
