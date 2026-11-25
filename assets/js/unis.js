/* Tutee Connect · NZ universities: shared by index.html (top universities section) and nz-universities.html
   (full directory). Provides the university details pop-up and the shortlist ("add to cart"), which is kept in
   localStorage so it follows the student between the two pages and into the counselling form. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // The eight universities (the only institutions allowed to use the title in NZ), in QS order as in the dataset.
  // campus and facts feed the pop-up and Tutee AI. Only long-standing, well-known facts: no fees, scores, ranking
  // positions or dates that change each year (those go to a counsellor). Nothing here links off the page.
  const TOP = [
    { name: 'University of Auckland', reo: 'Waipapa Taumata Rau', city: 'Auckland', est: 1883, known: ['Medicine', 'Engineering', 'Business', 'Law'], blurb: 'New Zealand’s largest university, in the heart of its biggest city and job market.',
      campus: 'City Campus in central Auckland, with the Grafton Campus for medical and health sciences',
      facts: ['New Zealand’s largest university', 'Usually New Zealand’s highest-placed university in the QS World University Rankings', 'Faculties cover arts, business, creative arts, education, engineering, law, medical and health sciences, and science', 'Close to Auckland’s CBD, the country’s biggest job market'] },
    { name: 'University of Otago', reo: 'Ōtākou Whakaihu Waka', city: 'Dunedin', est: 1869, known: ['Medicine', 'Dentistry', 'Health Sciences', 'Law'], blurb: 'The country’s oldest university and its classic student city, strong in health and research.',
      campus: 'Main campus in Dunedin, with health sciences teaching in Christchurch and Wellington',
      facts: ['New Zealand’s oldest university, founded in 1869', 'Home of New Zealand’s only dental school', 'Four academic divisions: Commerce (Otago Business School), Health Sciences, Humanities and Sciences', 'Dunedin is a compact student city: much of student life is within walking distance of campus'] },
    { name: 'Massey University', reo: 'Te Kunenga ki Pūrehuroa', city: 'Palmerston North · Auckland · Wellington', est: 1927, known: ['Agriculture', 'Veterinary Science', 'Aviation', 'Design'], blurb: 'Three campuses, and home of New Zealand’s only veterinary school.',
      campus: 'Three campuses: Manawatū (Palmerston North), Auckland (Albany) and Wellington',
      facts: ['Home of New Zealand’s only veterinary school', 'Its School of Aviation trains commercial pilots', 'The Wellington campus is home to its College of Creative Arts (design, fine arts and music)', 'Strong in agriculture and food science'] },
    { name: 'Victoria University of Wellington', reo: 'Te Herenga Waka', city: 'Wellington', est: 1897, known: ['Law', 'Public Policy', 'Architecture', 'Computer Science'], blurb: 'In the capital, close to government, the creative industries and the tech scene.',
      campus: 'Kelburn (main campus), Pipitea (law, government and business, beside Parliament) and Te Aro (architecture and design), all in Wellington',
      facts: ['In New Zealand’s capital, close to government, embassies and the creative and tech industries', 'Its Law School is in the historic Old Government Buildings at Pipitea', 'Known for law, public policy, architecture and design, and computer science'] },
    { name: 'University of Canterbury', reo: 'Te Whare Wānanga o Waitaha', city: 'Christchurch', est: 1873, known: ['Engineering', 'Sciences', 'Forestry', 'Education'], blurb: 'Renowned for engineering, on a green campus in the Garden City.',
      campus: 'Ilam campus in Christchurch, a green, park-like campus',
      facts: ['New Zealand’s second-oldest university, founded in 1873', 'Best known for engineering, with one of the country’s largest engineering schools', 'Christchurch is the South Island’s largest city'] },
    { name: 'University of Waikato', reo: 'Te Whare Wānanga o Waikato', city: 'Hamilton · Tauranga', est: 1964, known: ['Computer Science', 'Management', 'Law', 'Environmental Science'], blurb: 'Strong in computing and management, with campuses in Hamilton and Tauranga.',
      campus: 'Main campus in Hamilton, and a city-centre campus in Tauranga',
      facts: ['Its Waikato Management School holds triple-crown accreditation (AACSB, EQUIS and AMBA)', 'Strong in computer science and management', 'Hamilton is in the Waikato region, south of Auckland'] },
    { name: 'Lincoln University', reo: 'Te Whare Wānaka o Aoraki', city: 'Lincoln (near Christchurch)', est: 1878, known: ['Agriculture', 'Agribusiness', 'Viticulture', 'Environment'], blurb: 'A specialist land-based university: farming, food, wine and the environment.',
      campus: 'One campus in the town of Lincoln, about 20 km from central Christchurch',
      facts: ['New Zealand’s specialist land-based university', 'The smallest of New Zealand’s eight universities, so classes are smaller', 'Founded in 1878 as a school of agriculture'] },
    { name: 'Auckland University of Technology', reo: 'Te Wānanga Aronui o Tāmaki Makau Rau', city: 'Auckland', est: 2000, known: ['Health Sciences', 'Engineering', 'Design', 'Business'], blurb: 'Career-focused degrees with industry placements, in central Auckland.',
      campus: 'City Campus (central Auckland), North Campus (Northcote) and South Campus (Manukau)',
      facts: ['Became a university in 2000; its roots go back to 1895', 'Known for practical, career-focused degrees, many with industry placements', 'Its City Campus is in central Auckland'] }
  ];
  const byName = n => TOP.find(t => t.name === n);
  // monogram: first letters of the words (a lone "&" is kept between them); words that start with "(" or a digit, such
  // as "(i)" or "1)" in multi-school register names, are skipped so they never show as "(F(" or "1NZ"
  const initials = n => { const s = n.replace(/\b(of|and|the)\b/gi, '').split(/\s+/).filter(w => /^[A-Za-zÀ-ɏ&]/.test(w)).map(w => w[0]).join(''); return (s.slice(0, 3).endsWith('&') ? s.replace('&', '') : s).slice(0, 3).toUpperCase(); };

  /* ---------------- shortlist store ----------------
     Only real New Zealand institutions can be shortlisted: the eight universities and the 195 providers in
     universities-data.js (NZQA register). Anything else (stray letters, made-up names) is refused, and entries like
     that saved by an older version of the page are dropped when it loads. */
  const institutions = () => TOP.map(t => ({ name: t.name, alt: t.reo })).concat((window.NZ_UNIVERSITIES || []).map(u => ({ name: u.name, alt: u.alt || '' })));
  let knownSet = null;
  const isKnown = n => { if (!knownSet) knownSet = new Set(institutions().map(u => u.name)); return knownSet.has(n); };
  // on the main page the 195-provider list arrives a moment after the page (nz.js loads it once the page is idle);
  // until then a saved entry is kept if it could be a name, and checked properly when the list arrives
  const dataReady = () => !!window.NZ_UNIVERSITIES;
  const plausible = n => (String(n).match(/[A-Za-z]/g) || []).length >= 3;
  // what the student typed → { name } of the one institution it means, or { err } saying why it can't be added
  function resolve(typed) {
    const q = String(typed || '').toLowerCase().replace(/\s+/g, ' ').trim(), all = institutions();
    if (!q) return { err: '' };
    const exact = all.find(u => u.name.toLowerCase() === q); if (exact) return { name: exact.name };
    if (q === 'aut') return { name: 'Auckland University of Technology' };
    const words = q.split(/[^a-z0-9\u00c0-\u024f]+/).filter(w => w.length >= 2);
    if (q.replace(/[^a-z]/g, '').length < 3 || !words.length) return { err: '“' + typed + '” is too short to find. Type at least three letters of the name, then pick it from the list.' };
    const hits = [...new Set(all.filter(u => { const hay = (u.name + ' ' + u.alt).toLowerCase(); return words.every(w => hay.includes(w)); }).map(u => u.name))];
    if (hits.length === 1) return { name: hits[0] };
    const unis = hits.filter(n => byName(n));
    if (unis.length === 1) return { name: unis[0] };   // "otago": the university, not Otago Polytechnic
    if (hits.length > 1) return { err: 'More than one institution matches “' + typed + '”. Pick the one you mean from the list.' };
    return { err: '“' + typed + '” isn’t a New Zealand university or institute we know. Pick one from the list.' };
  }
  const KEY = 'tc_shortlist';
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string' && (dataReady() ? isKnown(x) : byName(x) || plausible(x))).slice(0, 20) : []; } catch (e) { return []; } };
  let list = read();
  const subs = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* private mode */ } subs.forEach(f => f(list)); };
  // analytics (through analytics.js): the shortlist size and a listed institution's name only, never anything about the
  // student (a name the student typed into the form's add box is sent as "Other", since it is free text)
  const added = n => { const known = byName(n) || (window.NZ_UNIVERSITIES || []).some(u => u.name === n); if (window.tcTrack) window.tcTrack('shortlist_add', { count: list.length, institution: known ? n : 'Other', page: document.getElementById('cform') ? 'landing' : 'directory' }); };
  const Shortlist = {
    get: () => list.slice(),
    has: n => list.includes(n),
    toggle(n) { if (!list.includes(n) && (!isKnown(n) || list.length >= 20)) return false; list = list.includes(n) ? list.filter(x => x !== n) : list.concat(n); save(); if (list.includes(n)) added(n); return list.includes(n); },
    add(n) { if (!list.includes(n) && isKnown(n) && list.length < 20) { list = list.concat(n); save(); added(n); } },
    resolve, isKnown,
    remove(n) { list = list.filter(x => x !== n); save(); },
    clear() { list = []; save(); },
    on(f) { subs.push(f); f(list); }
  };
  try { if (dataReady() && JSON.stringify(list) !== (localStorage.getItem(KEY) || '[]')) localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* private mode */ }
  addEventListener('tc-unis-data', () => { knownSet = null; const ok = list.filter(isKnown); if (ok.length !== list.length) { list = ok; save(); } });
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
      (window.TCAI ? '<button type="button" class="btn btn--line um__ai" data-um-ai><svg class="ic" aria-hidden="true"><use href="#i-chat"/></svg>Ask Tutee AI about it</button>' : '') + '</div>';
    $('[data-um-sl]', modal).addEventListener('click', () => { Shortlist.toggle(u.name); render(u); });
    // the questions go to Tutee AI on this page: the pop-up closes and the chat opens on this university
    const ai = $('[data-um-ai]', modal);
    if (ai) ai.addEventListener('click', () => { const q = Object.assign({}, u, t.name ? t : {}); close(() => window.TCAI.askAbout(q)); });
  }
  function open(u) {
    current = u; lastFocus = document.activeElement; render(u); modal.hidden = false;
    document.documentElement.classList.add('imm-lock');
    void modal.offsetWidth; modal.classList.add('on'); $('.um__x', modal).focus({ preventScroll: true });
  }
  function close(then) {
    if (modal.hidden) return; modal.classList.remove('on');
    setTimeout(() => { modal.hidden = true; document.documentElement.classList.remove('imm-lock'); if (typeof then === 'function') then(); else if (lastFocus) lastFocus.focus({ preventScroll: true }); }, 220);
  }
  $$('[data-um-close]', modal).forEach(b => b.addEventListener('click', () => close()));
  modal.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  /* ---------------- shortlist tray ("cart") ----------------
     Maroon (the page's call-to-action colour) so it never blends into a section. Every addition makes it pop, flips
     the count, sends a ring out and reads "Added: <name>" for a moment; a removal just settles the count. Until the
     student first opens it, it glows softly every ~10s. On the main page it steps aside while the form is on screen. */
  const onIndex = !!document.getElementById('cform');
  const LBL = 'shortlisted · Review & send';
  const tray = document.createElement('div');
  tray.className = 'sl'; tray.innerHTML =
    '<button type="button" class="sl__btn" aria-expanded="false" aria-controls="sl-panel"><b class="sl__n">0</b><span class="sl__lbl" aria-live="polite">' + LBL + '</span><svg class="ic sl__up" aria-hidden="true"><use href="#i-chev"/></svg></button>' +
    '<div class="sl__panel" id="sl-panel" hidden><div class="sl__head"><b>My shortlist</b><button type="button" class="sl__clear">Clear</button></div><ul class="sl__list"></ul>' +
    '<a class="btn btn--go btn--block sl__go" href="' + (onIndex ? '#consult' : './index.html#consult') + '">Add to my counselling form <svg class="ic"><use href="#i-arrow"/></svg></a><p class="sl__note">A counsellor will check entry requirements, fees and intakes for each.</p></div>';
  document.body.appendChild(tray);
  const tBtn = $('.sl__btn', tray), tPanel = $('.sl__panel', tray);
  const setOpen = on => { tPanel.hidden = !on; tBtn.setAttribute('aria-expanded', on); tray.classList.toggle('is-open', on); };
  const SEEN = 'tc_shortlist_seen';   // the idle glow stops for good (this visit) once the tray has been opened
  try { if (sessionStorage.getItem(SEEN)) tray.classList.add('is-seen'); } catch (e) { /* private mode */ }
  tBtn.addEventListener('click', () => {
    setOpen(tPanel.hidden);
    tray.classList.add('is-seen'); try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* private mode */ }
  });
  // the form already shows the shortlist as chips, so the tray steps aside while the form is on screen
  const cbox = document.getElementById('cbox');
  if (onIndex && cbox && 'IntersectionObserver' in window) new IntersectionObserver(es => { const away = es[0].isIntersecting; tray.classList.toggle('is-away', away); if (away) setOpen(false); }, { threshold: .15 }).observe(cbox);
  document.addEventListener('click', e => { if (!tray.contains(e.target)) setOpen(false); });
  $('.sl__clear', tray).addEventListener('click', () => Shortlist.clear());
  $('.sl__go', tray).addEventListener('click', e => {
    setOpen(false);
    if (onIndex) { e.preventDefault(); const f = document.getElementById('c-unis'); if (f) f.value = list.join(', '); if (window.__goTo) window.__goTo('#consult'); else location.hash = '#consult'; }
  });
  $('.sl__list', tray).addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) Shortlist.remove(b.dataset.rm); });
  const tLbl = $('.sl__lbl', tray);
  let prev = null, addedT = 0;
  const replay = c => { tray.classList.remove('bump', 'settle'); void tray.offsetWidth; tray.classList.add(c); };
  Shortlist.on(l => {
    $('.sl__n', tray).textContent = l.length;
    tray.classList.toggle('has-items', l.length > 0);
    if (!l.length) { setOpen(false); clearTimeout(addedT); tLbl.textContent = LBL; }
    $('.sl__list', tray).innerHTML = l.map(n => '<li><span>' + esc(n) + '</span><button type="button" data-rm="' + esc(n) + '" aria-label="Remove ' + esc(n) + '"><svg class="ic"><use href="#i-plus"/></svg></button></li>').join('');
    // the bump restarts via a reflow; skipped on page load (prev is null), where that reflow would lay out the whole page early.
    // Reduced motion: the CSS drops the pop and the ring, but the label still announces what was added.
    if (prev && l.length) {
      const added = l.filter(n => !prev.includes(n));
      if (added.length) {
        replay('bump');
        tLbl.textContent = 'Added: ' + added[added.length - 1];
        clearTimeout(addedT); addedT = setTimeout(() => { tLbl.textContent = LBL; }, 2500);
      } else if (l.length < prev.length) replay('settle');
    }
    prev = l.slice();
    // keep the form's hidden "shortlist" field in step with the shortlist (same comma-separated value as before)
    const f = document.getElementById('c-unis'); if (f) f.value = l.join(', ');
  });

  // the attention cue on the shortlist buttons only runs while their list is on screen
  // (watch: the box to observe, when the list itself has no height of its own)
  const live = (el, watch) => {
    if (!('IntersectionObserver' in window)) { el.classList.add('is-live'); return; }
    new IntersectionObserver(es => el.classList.toggle('is-live', es[0].isIntersecting)).observe(watch || el);
  };

  /* ---------------- shortlist chips in the counselling form (index.html) ----------------
     Each shortlisted university is a chip whose × removes it from the shortlist itself (so the tray and the buttons
     update too). The add box takes any real New Zealand institution, typed in full, in part ("mass", "uoa") or picked
     from the list; anything else stays in the box with a message under it. */
  const chips = document.getElementById('sl-chips');
  if (chips) {
    const add = document.getElementById('c-unis-add'), addBtn = document.getElementById('c-unis-addbtn'), empty = document.getElementById('sl-empty'), msg = document.getElementById('sl-msg');
    const KNOWN = TOP.map(t => t.name);
    const say = t => { msg.textContent = t; add.closest('.slbox').classList.toggle('bad', !!t); add.setAttribute('aria-invalid', t ? 'true' : 'false'); };
    let refocus = -1;
    Shortlist.on(l => {
      chips.innerHTML = l.map(n => '<li class="slchip"><span>' + esc(n) + '</span><button type="button" data-rm="' + esc(n) + '" aria-label="Remove ' + esc(n) + ' from your shortlist"><svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg></button></li>').join('');
      chips.hidden = !l.length; empty.hidden = l.length > 0;
      // after a removal, focus stays in the chips (the next one along), or goes to the add box when none are left
      if (refocus > -1) { const bs = $$('button', chips); (bs[Math.min(refocus, bs.length - 1)] || add).focus(); refocus = -1; }
    });
    chips.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; refocus = $$('button', chips).indexOf(b); Shortlist.remove(b.dataset.rm); });
    // one entry or several separated by commas; a known university is stored under its usual name so its button lights up
    // returns true when the box is empty afterwards (everything typed was added)
    const fromBox = () => {
      const left = [], errs = [];
      add.value.split(/[,;]/).map(s => s.trim().replace(/\s+/g, ' ').slice(0, 120)).filter(Boolean).forEach(s => {
        const r = resolve(s);
        if (!r.name) { left.push(s); if (r.err) errs.push(r.err); return; }
        if (Shortlist.has(r.name)) return;
        if (Shortlist.get().length >= 20) { left.push(s); errs.push('Your shortlist is full (20). Remove one to add another.'); return; }
        Shortlist.add(r.name);
      });
      add.value = left.join(', '); say(errs[0] || '');
      return !left.length;
    };
    add.addEventListener('input', () => { if (msg.textContent) say(''); });
    window.TCShortlistBox = { flush: fromBox };   // the form's check (nz.js) adds what's typed, or stops on a bad entry
    add.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ',') && !e.isComposing) { e.preventDefault(); fromBox(); } });   // Enter adds, never submits
    add.addEventListener('input', e => { if ((!e.inputType || e.inputType === 'insertReplacementText') && KNOWN.includes(add.value.trim())) fromBox(); });   // picked from the suggestions
    add.addEventListener('blur', fromBox);   // typed but not added: kept when they move on
    addBtn.addEventListener('click', () => { fromBox(); add.focus(); });
    add.addEventListener('tc-pick', fromBox);   // a university picked from the suggestion list (nz.js)
    // (the form's own check calls TCShortlistBox.flush before it reads the shortlist)
  }

  /* ---------------- shortlist buttons on the universities map list (index.html) ----------------
     Each university in the list gets its own round "+" next to its name, so shortlisting no longer needs the pop-up. */
  const mapList = $('.nzm__list');
  if (mapList) {
    $$('li', mapList).forEach((li, i) => { const u = $('[data-uni]', li); if (u) li.insertAdjacentHTML('beforeend', '<button type="button" class="nzm__sl" data-sl="' + esc(u.dataset.uni) + '" aria-pressed="false" style="--i:' + i + '"></button>'); });
    Shortlist.on(() => $$('.nzm__sl', mapList).forEach(b => { const on = Shortlist.has(b.dataset.sl); b.setAttribute('aria-pressed', on); b.innerHTML = on ? CHECK : PLUS; b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + b.dataset.sl + (on ? ' from' : ' to') + ' shortlist'); b.title = on ? 'Shortlisted' : 'Add to shortlist'; }));
    mapList.addEventListener('click', e => { const b = e.target.closest('.nzm__sl'); if (b) Shortlist.toggle(b.dataset.sl); });
    live(mapList, mapList.closest('.nzm__stage'));   // on desktop the names are placed absolutely, so the list box is empty
  }

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

  window.TCUnis = { open, TOP, esc, initials, Shortlist, live };
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
