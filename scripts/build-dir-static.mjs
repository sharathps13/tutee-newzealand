// Writes the static institution list into nz-universities.html, so all 195 providers are in the page without
// JavaScript. The list is generated from assets/js/universities-data.js (the single source of truth) with the same
// card markup unis-dir.js renders; unis-dir.js replaces it with its own (filterable, 30 at a time) list on load.
//
//   node scripts/build-dir-static.mjs        (run again whenever universities-data.js changes)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(readFileSync(root + 'assets/js/universities-data.js', 'utf8'), ctx);
const all = ctx.window.NZ_UNIVERSITIES;

// the same helpers as unis.js / unis-dir.js
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const initials = n => n.replace(/\b(of|and|the)\b/gi, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
const typeLabel = t => t === 'Private Training Establishment' ? 'Private training' : t === 'Wananga' ? 'Wānanga' : t;
const PLUS = '<svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>';

const items = all.map((u, i) => '      <li class="dc"><button type="button" class="dc__open" data-i="' + i + '" aria-label="' + esc(u.name) + ': details"></button>' +
  '<span class="uc__mono">' + esc(initials(u.name)) + '</span>' +
  '<div class="dc__main"><p class="dc__type">' + esc(typeLabel(u.type)) + ' · ' + esc(u.assurance) + '</p><h3>' + esc(u.name) + '</h3>' +
  '<p class="uc__city"><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg>' + esc(u.location) + '</p>' +
  (u.programs ? '<p class="dc__prog">' + esc(u.programs) + '</p>' : '') + '</div>' +
  '<button type="button" class="uc__sl" data-sl="' + esc(u.name) + '" aria-pressed="false" style="--i:' + (i % 8) + '">' + PLUS + '<span>Shortlist</span></button></li>').join('\n');

const file = root + 'nz-universities.html';
const html = readFileSync(file, 'utf8');
const start = '<!-- static-list:start -->', end = '<!-- static-list:end -->';
const a = html.indexOf(start), b = html.indexOf(end);
if (a < 0 || b < a) throw new Error('static-list markers not found in nz-universities.html');
writeFileSync(file, html.slice(0, a + start.length) + '\n' + items + '\n      ' + html.slice(b));
console.log('nz-universities.html: wrote ' + all.length + ' institutions (' + all.filter(u => u.type === 'University').length + ' universities)');
