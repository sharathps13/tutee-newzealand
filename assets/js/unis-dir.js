/* nz-universities.html: the full directory (all 195 Code-signatory providers), search, type filter, details
   pop-up and shortlist (shared with the main page through unis.js). */
(() => {
  const { open, esc, initials, Shortlist } = window.TCUnis;
  const all = (window.NZ_UNIVERSITIES || []).slice();
  const $ = s => document.querySelector(s);
  const list = $('#dir-list'), q = $('#dir-q'), more = $('#dir-more'), count = $('#dir-count');
  const chips = [...document.querySelectorAll('.dir__chips button')];
  const PAGE = 30; let shown = PAGE, filter = 'all';
  $('#dir-total').textContent = all.length;
  const typeLabel = t => t === 'Private Training Establishment' ? 'Private training' : t === 'Wananga' ? 'Wānanga' : t;
  const matchType = u => filter === 'all' || (filter === 'ITP' ? (u.type === 'Institute of Technology' || u.type === 'Wananga') : u.type === filter);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const PLUS = '<svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>', CHECK = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>';
  let rows = all;
  function render() {
    const term = norm(q.value.trim());
    rows = all.filter(u => matchType(u) && (!term || norm([u.name, u.location, u.programs, u.alt, u.type].join(' ')).includes(term)));
    count.textContent = rows.length + (rows.length === 1 ? ' institution' : ' institutions');
    list.innerHTML = rows.slice(0, shown).map((u, i) => {
      const on = Shortlist.has(u.name);
      return '<li class="dc"><button type="button" class="dc__open" data-i="' + i + '" aria-label="' + esc(u.name) + ': details"></button>' +
        '<span class="uc__mono">' + esc(initials(u.name)) + '</span>' +
        '<div class="dc__main"><p class="dc__type">' + esc(typeLabel(u.type)) + ' · ' + esc(u.assurance) + '</p><h3>' + esc(u.name) + '</h3>' +
        '<p class="uc__city"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg>' + esc(u.location) + '</p>' +
        (u.programs ? '<p class="dc__prog">' + esc(u.programs) + '</p>' : '') + '</div>' +
        '<button type="button" class="uc__sl" data-sl="' + esc(u.name) + '" aria-pressed="' + on + '">' + (on ? CHECK + '<span>Shortlisted</span>' : PLUS + '<span>Shortlist</span>') + '</button></li>';
    }).join('') || '<li class="dc dc--empty">No institution matches “' + esc(q.value) + '”.</li>';
    more.hidden = rows.length <= shown;
  }
  q.addEventListener('input', () => { shown = PAGE; render(); });
  chips.forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; chips.forEach(c => c.setAttribute('aria-pressed', c === b)); shown = PAGE; render(); }));
  more.addEventListener('click', () => { shown += PAGE; render(); });
  list.addEventListener('click', e => {
    const sl = e.target.closest('.uc__sl'); if (sl) { Shortlist.toggle(sl.dataset.sl); return; }
    const o = e.target.closest('.dc__open'); if (o) open(rows[+o.dataset.i]);
  });
  Shortlist.on(() => render());
})();
