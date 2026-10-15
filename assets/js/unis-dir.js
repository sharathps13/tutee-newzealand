/* nz-universities.html: the full directory (all 195 Code-signatory providers), search, course / area / type filters, details
   pop-up and shortlist (shared with the main page through unis.js). */
(() => {
  const { open, esc, initials, Shortlist } = window.TCUnis;
  const all = (window.NZ_UNIVERSITIES || []).slice();
  const $ = s => document.querySelector(s);
  const list = $('#dir-list'), q = $('#dir-q'), more = $('#dir-more'), count = $('#dir-count');
  const selCourse = $('#dir-course'), selArea = $('#dir-area'), selType = $('#dir-type'), reset = $('#dir-reset');
  const PAGE = 30; let shown = PAGE;
  $('#dir-total').textContent = all.length;
  const typeLabel = t => t === 'Private Training Establishment' ? 'Private training' : t === 'Wananga' ? 'Wānanga' : t;
  const matchType = u => !selType.value || (selType.value === 'ITP' ? (u.type === 'Institute of Technology' || u.type === 'Wananga') : u.type === selType.value);
  // course areas, matched against each provider's listed subjects (universities and institutes teach broadly, so they
  // count for every area they list; "vocational" providers count for trades)
  const COURSES = [
    ['Business & management', /business|management|commerce|accounting|finance|marketing/i],
    ['IT & computing', /computer|computing|information technology|\bit\b|software|data/i],
    ['Engineering & trades', /engineering|trades|construction|electrical|automotive|vocational/i],
    ['Health & nursing', /nursing|health|medic|dental|pharmac|veterinary|care/i],
    ['Hospitality & tourism', /hospitality|culinary|tourism|hotel|cookery/i],
    ['Creative arts & design', /creative|design|arts|music|film|media|architecture|performing|hairdress|beauty/i],
    ['Education & teaching', /education|teaching/i],
    ['Science, agriculture & environment', /science|agricultur|primary industr|forestry|viticulture|horticult|environment|marine/i],
    ['Aviation & maritime', /aviation|pilot|flight|maritime/i],
    ['Law', /\blaw\b|legal/i],
    ['English language', /english/i],
    ['Theology', /theology|ministry/i]
  ];
  const BROAD = u => u.type === 'University' || u.type === 'Institute of Technology' || u.type === 'Wananga';
  const matchCourse = u => { if (!selCourse.value) return true; const c = COURSES.find(x => x[0] === selCourse.value); return c[1].test(u.programs || '') || (BROAD(u) && c[0] !== 'English language' && c[0] !== 'Theology' && c[0] !== 'Aviation & maritime'); };
  // areas: the region at the end of each location
  const AREAS = [
    ['Auckland', /auckland/i], ['Waikato & Bay of Plenty', /waikato|bay of plenty|hamilton|tauranga|rotorua/i],
    ['Wellington & Manawatū', /wellington|manawatu|palmerston|whanganui/i], ['Canterbury', /canterbury|christchurch/i],
    ['Otago & Southland', /otago|southland|dunedin|queenstown|invercargill/i],
    ['Rest of New Zealand', /northland|taranaki|hawke|nelson|west coast|marlborough|gisborne/i]
  ];
  const matchArea = u => { if (!selArea.value) return true; const a = AREAS.find(x => x[0] === selArea.value); return a[1].test(u.location || ''); };
  selCourse.insertAdjacentHTML('beforeend', COURSES.map(c => '<option>' + c[0] + '</option>').join(''));
  selArea.insertAdjacentHTML('beforeend', AREAS.map(a => '<option>' + a[0] + '</option>').join(''));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const PLUS = '<svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>', CHECK = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>';
  let rows = all;
  function render() {
    const term = norm(q.value.trim());
    rows = all.filter(u => matchType(u) && matchCourse(u) && matchArea(u) && (!term || norm([u.name, u.location, u.programs, u.alt, u.type].join(' ')).includes(term)));
    count.textContent = rows.length + (rows.length === 1 ? ' institution' : ' institutions');
    list.innerHTML = rows.slice(0, shown).map((u, i) => {
      const on = Shortlist.has(u.name);
      return '<li class="dc"><button type="button" class="dc__open" data-i="' + i + '" aria-label="' + esc(u.name) + ': details"></button>' +
        '<span class="uc__mono">' + esc(initials(u.name)) + '</span>' +
        '<div class="dc__main"><p class="dc__type">' + esc(typeLabel(u.type)) + ' · ' + esc(u.assurance) + '</p><h3>' + esc(u.name) + '</h3>' +
        '<p class="uc__city"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg>' + esc(u.location) + '</p>' +
        (u.programs ? '<p class="dc__prog">' + esc(u.programs) + '</p>' : '') + '</div>' +
        '<button type="button" class="uc__sl" data-sl="' + esc(u.name) + '" aria-pressed="' + on + '">' + (on ? CHECK + '<span>Shortlisted</span>' : PLUS + '<span>Shortlist</span>') + '</button></li>';
    }).join('') || '<li class="dc dc--empty">No institution matches ' + (q.value.trim() ? '“' + esc(q.value) + '” with ' : '') + 'these filters. Try clearing one.</li>';
    more.hidden = rows.length <= shown;
    reset.hidden = !(selCourse.value || selArea.value || selType.value);
  }
  q.addEventListener('input', () => { shown = PAGE; render(); });
  [selCourse, selArea, selType].forEach(s => s.addEventListener('change', () => { shown = PAGE; render(); }));
  reset.addEventListener('click', () => { selCourse.value = selArea.value = selType.value = ''; shown = PAGE; render(); });
  more.addEventListener('click', () => { shown += PAGE; render(); });
  list.addEventListener('click', e => {
    const sl = e.target.closest('.uc__sl'); if (sl) { Shortlist.toggle(sl.dataset.sl); return; }
    const o = e.target.closest('.dc__open'); if (o) open(rows[+o.dataset.i]);
  });
  Shortlist.on(() => render());
})();
