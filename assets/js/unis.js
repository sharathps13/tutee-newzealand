/* Tutee Connect · NZ universities: shared by index.html (top universities section) and nz-universities.html
   (full directory). Provides the university details pop-up and the shortlist ("add to cart"), which is kept in
   localStorage so it follows the student between the two pages and into the counselling form. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // The eight universities (the only institutions allowed to use the title in NZ), in QS order as in the dataset.
  const TOP = [
    { name: 'University of Auckland', reo: 'Waipapa Taumata Rau', city: 'Auckland', est: 1883, web: 'https://www.auckland.ac.nz', known: ['Medicine', 'Engineering', 'Business', 'Law'], blurb: 'New Zealand’s largest university, in the heart of its biggest city and job market.' },
    { name: 'University of Otago', reo: 'Ōtākou Whakaihu Waka', city: 'Dunedin', est: 1869, web: 'https://www.otago.ac.nz', known: ['Medicine', 'Dentistry', 'Health Sciences', 'Law'], blurb: 'The country’s oldest university and its classic student city, strong in health and research.' },
    { name: 'Massey University', reo: 'Te Kunenga ki Pūrehuroa', city: 'Palmerston North · Auckland · Wellington', est: 1927, web: 'https://www.massey.ac.nz', known: ['Agriculture', 'Veterinary Science', 'Aviation', 'Design'], blurb: 'Three campuses, and home of New Zealand’s only veterinary school.' },
    { name: 'Victoria University of Wellington', reo: 'Te Herenga Waka', city: 'Wellington', est: 1897, web: 'https://www.wgtn.ac.nz', known: ['Law', 'Public Policy', 'Architecture', 'Computer Science'], blurb: 'In the capital, close to government, the creative industries and the tech scene.' },
    { name: 'University of Canterbury', reo: 'Te Whare Wānanga o Waitaha', city: 'Christchurch', est: 1873, web: 'https://www.canterbury.ac.nz', known: ['Engineering', 'Sciences', 'Forestry', 'Education'], blurb: 'Renowned for engineering, on a green campus in the Garden City.' },
    { name: 'University of Waikato', reo: 'Te Whare Wānanga o Waikato', city: 'Hamilton · Tauranga', est: 1964, web: 'https://www.waikato.ac.nz', known: ['Computer Science', 'Management', 'Law', 'Environmental Science'], blurb: 'Strong in computing and management, with campuses in Hamilton and Tauranga.' },
    { name: 'Lincoln University', reo: 'Te Whare Wānaka o Aoraki', city: 'Lincoln (near Christchurch)', est: 1878, web: 'https://www.lincoln.ac.nz', known: ['Agriculture', 'Agribusiness', 'Viticulture', 'Environment'], blurb: 'A specialist land-based university: farming, food, wine and the environment.' },
    { name: 'Auckland University of Technology', reo: 'Te Wānanga Aronui o Tāmaki Makau Rau', city: 'Auckland', est: 2000, web: 'https://www.aut.ac.nz', known: ['Health Sciences', 'Engineering', 'Design', 'Business'], blurb: 'Career-focused degrees with industry placements, in central Auckland.' }
  ];
  const byName = n => TOP.find(t => t.name === n);
  const initials = n => n.replace(/\b(of|and|the)\b/gi, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();

  /* ---------------- shortlist store ---------------- */
  const KEY = 'tc_shortlist';
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 20) : []; } catch (e) { return []; } };
  let list = read();
  const subs = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* private mode */ } subs.forEach(f => f(list)); };
  const Shortlist = {
    get: () => list.slice(),
    has: n => list.includes(n),
    toggle(n) { list = list.includes(n) ? list.filter(x => x !== n) : list.concat(n); save(); return list.includes(n); },
    add(n) { if (!list.includes(n)) { list = list.concat(n); save(); } },
    remove(n) { list = list.filter(x => x !== n); save(); },
    clear() { list = []; save(); },
    on(f) { subs.push(f); f(list); }
  };
  addEventListener('storage', e => { if (e.key === KEY) { list = read(); subs.forEach(f => f(list)); } });   // other tab
  window.TCShortlist = Shortlist;

  /* ---------------- details pop-up ---------------- */
  const PLUS = '<svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>', CHECK = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>';
  const modal = document.createElement('div');
  modal.className = 'um'; modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'um-h');
  modal.innerHTML = '<div class="um__back" data-um-close></div><div class="um__card"><button type="button" class="um__x" data-um-close aria-label="Close"><svg class="ic"><use href="#i-plus"/></svg></button><div id="um-body"></div></div>';
  document.body.appendChild(modal);
  let current = null, lastFocus = null;
  const assuranceNote = a => /AQA/.test(a) ? 'Quality-audited by the Academic Quality Agency for NZ Universities' : /Cat 1/.test(a) ? 'NZQA Category 1: highly confident in educational performance' : /Cat 2/.test(a) ? 'NZQA Category 2: confident in educational performance' : /Cat 3/.test(a) ? 'NZQA Category 3: not yet confident' : /Cat 4/.test(a) ? 'NZQA Category 4: not confident' : 'No published NZQA rating yet (recently re-established)';
  function render(u) {
    const t = byName(u.name) || {};
    const known = t.known || String(u.programs || '').split(/,\s*/).filter(Boolean);
    const rows = [['Type', u.type || 'University'], ['Location', t.city || u.location || ''], t.est ? ['Established', t.est] : null, ['Quality', (u.assurance || 'AQA audited') + ' · ' + assuranceNote(u.assurance || 'AQA')], ['International students', 'Can enrol: signed the Code of Practice for international learners']].filter(Boolean);
    const on = Shortlist.has(u.name);
    $('#um-body', modal).innerHTML =
      '<div class="um__top"><span class="um__mono">' + esc(initials(u.name)) + '</span><div><p class="um__type">' + esc(u.type || 'University') + '</p><h3 id="um-h">' + esc(u.name) + '</h3>' + (t.reo ? '<p class="um__reo">' + esc(t.reo) + '</p>' : '') + '</div></div>' +
      (t.blurb ? '<p class="um__blurb">' + esc(t.blurb) + '</p>' : '') +
      (known.length ? '<p class="um__lbl">Known for</p><ul class="um__chips">' + known.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul>' : '') +
      '<dl class="um__facts">' + rows.map(r => '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>' +
      '<div class="um__acts"><button type="button" class="btn btn--gold um__sl' + (on ? ' is-on' : '') + '" data-um-sl>' + (on ? CHECK + 'Shortlisted' : PLUS + 'Add to shortlist') + '</button>' +
      (t.web ? '<a class="btn btn--line um__web" href="' + esc(t.web) + '" target="_blank" rel="noopener">Official website <svg class="ic"><use href="#i-arrow"/></svg></a>' : '') + '</div>';
    $('[data-um-sl]', modal).addEventListener('click', () => { Shortlist.toggle(u.name); render(u); });
  }
  function open(u) {
    current = u; lastFocus = document.activeElement; render(u); modal.hidden = false;
    document.documentElement.classList.add('imm-lock');
    void modal.offsetWidth; modal.classList.add('on'); $('.um__x', modal).focus({ preventScroll: true });
  }
  function close() {
    if (modal.hidden) return; modal.classList.remove('on');
    setTimeout(() => { modal.hidden = true; document.documentElement.classList.remove('imm-lock'); if (lastFocus) lastFocus.focus({ preventScroll: true }); }, 220);
  }
  $$('[data-um-close]', modal).forEach(b => b.addEventListener('click', close));
  modal.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  /* ---------------- shortlist tray ("cart") ---------------- */
  const onIndex = !!document.getElementById('cform');
  const tray = document.createElement('div');
  tray.className = 'sl'; tray.innerHTML =
    '<button type="button" class="sl__btn" aria-expanded="false" aria-controls="sl-panel"><svg class="ic" aria-hidden="true"><use href="#i-book"/></svg><span>Shortlist</span><b class="sl__n">0</b></button>' +
    '<div class="sl__panel" id="sl-panel" hidden><div class="sl__head"><b>My shortlist</b><button type="button" class="sl__clear">Clear</button></div><ul class="sl__list"></ul>' +
    '<a class="btn btn--go btn--block sl__go" href="' + (onIndex ? '#consult' : 'index.html#consult') + '">Add to my counselling form <svg class="ic"><use href="#i-arrow"/></svg></a><p class="sl__note">A counsellor will check entry requirements, fees and intakes for each.</p></div>';
  document.body.appendChild(tray);
  const tBtn = $('.sl__btn', tray), tPanel = $('.sl__panel', tray);
  const setOpen = on => { tPanel.hidden = !on; tBtn.setAttribute('aria-expanded', on); tray.classList.toggle('is-open', on); };
  tBtn.addEventListener('click', () => setOpen(tPanel.hidden));
  document.addEventListener('click', e => { if (!tray.contains(e.target)) setOpen(false); });
  $('.sl__clear', tray).addEventListener('click', () => Shortlist.clear());
  $('.sl__go', tray).addEventListener('click', e => {
    setOpen(false);
    if (onIndex) { e.preventDefault(); const f = document.getElementById('c-unis'); if (f) f.value = list.join(', '); if (window.__goTo) window.__goTo('#consult'); else location.hash = '#consult'; }
  });
  $('.sl__list', tray).addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) Shortlist.remove(b.dataset.rm); });
  let first = true;
  Shortlist.on(l => {
    $('.sl__n', tray).textContent = l.length;
    tray.classList.toggle('has-items', l.length > 0);
    if (!l.length) setOpen(false);
    $('.sl__list', tray).innerHTML = l.map(n => '<li><span>' + esc(n) + '</span><button type="button" data-rm="' + esc(n) + '" aria-label="Remove ' + esc(n) + '"><svg class="ic"><use href="#i-plus"/></svg></button></li>').join('');
    // the bump restarts via a reflow; skipped on page load, where that reflow would lay out the whole page early
    if (!first) { tray.classList.remove('bump'); void tray.offsetWidth; if (l.length) tray.classList.add('bump'); }
    first = false;
    // keep the form's "Shortlisted universities" field in step with the shortlist
    const f = document.getElementById('c-unis'); if (f) f.value = l.join(', ');
  });

  /* ---------------- top universities section (index.html) ---------------- */
  const grid = document.getElementById('uni-grid');
  if (grid) {
    grid.innerHTML = TOP.map((t, i) => '<li class="uc"><button type="button" class="uc__open" data-i="' + i + '" aria-label="' + esc(t.name) + ': details"></button>' +
      '<div class="uc__top"><span class="uc__mono">' + esc(initials(t.name)) + '</span><span class="uc__rank">#' + (i + 1) + ' in NZ</span></div>' +
      '<h3>' + esc(t.name) + '</h3><p class="uc__reo">' + esc(t.reo) + '</p><p class="uc__city"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg>' + esc(t.city) + '</p>' +
      '<ul class="uc__chips">' + t.known.slice(0, 3).map(k => '<li>' + esc(k) + '</li>').join('') + '</ul>' +
      '<div class="uc__foot"><span class="uc__more">View details</span><button type="button" class="uc__sl" data-sl="' + esc(t.name) + '" aria-pressed="false"></button></div></li>').join('');
    const paint = () => $$('.uc__sl', grid).forEach(b => { const on = Shortlist.has(b.dataset.sl); b.setAttribute('aria-pressed', on); b.innerHTML = (on ? CHECK + '<span>Shortlisted</span>' : PLUS + '<span>Shortlist</span>'); b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + b.dataset.sl + (on ? ' from' : ' to') + ' shortlist'); });
    Shortlist.on(paint);
    grid.addEventListener('click', e => {
      const sl = e.target.closest('.uc__sl'); if (sl) { Shortlist.toggle(sl.dataset.sl); return; }
      const o = e.target.closest('.uc__open'); if (o) { const t = TOP[+o.dataset.i]; open({ name: t.name, type: 'University', assurance: 'AQA audited', location: t.city }); }
    });
  }

  window.TCUnis = { open, TOP, esc, initials, Shortlist };
})();

/* click burst: thin lines spark out from wherever you click or tap, in the colours of the New Zealand flag
   (red, royal blue, white). Pure CSS animation, removed when done; off for reduced motion. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const COLORS = Array.from({ length: 16 }, (_, i) => ['#C8102E', '#1F4FBF', '#FFFFFF'][i % 3]);
  addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const b = document.createElement('span'); b.className = 'cburst'; b.setAttribute('aria-hidden', 'true');
    b.style.left = e.clientX + 'px'; b.style.top = e.clientY + 'px';
    const off = Math.random() * 22.5;
    b.innerHTML = COLORS.map((c, i) => '<i style="--a:' + (off + i * 22.5) + 'deg;--c:' + c + ';--l:' + (7 + (i % 2) * 3) + 'px"></i>').join('');
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 650);
  }, { passive: true });
})();
