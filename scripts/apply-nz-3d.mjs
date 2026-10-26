// Puts the Blender render (scripts/blender/nz_render.py) on the page:
//   node scripts/apply-nz-3d.mjs <render_dir>
// - converts nz-3d.png → assets/img/nz/nz-3d.webp
// - replaces the map's coastline paths with the rendered coastline (projected through the Blender camera), so the
//   drawn outline sits exactly on the render's shore
// - moves the university pins onto their projected positions and re-aims each leader line from its pin
// - prints the values nz.js needs (zoom origin, phone crop)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2]; if (!dir) throw new Error('usage: node scripts/apply-nz-3d.mjs <render_dir>');
const pj = JSON.parse(readFileSync(join(dir, 'projection.json'), 'utf8'));
const [RW, RH] = pj.size, F = pj.frame;
const G = ([px, py]) => [F.x + px / RW * F.w, F.y + py / RH * F.h];   // render pixel → page SVG units

/* ---------- coastline: the 4 largest rings (North, South, Stewart, Great Barrier), simplified ---------- */
const area = p => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0) / 2);
const simplify = (pts, tol) => {
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let dm = 0, ix = -1; const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > dm) { dm = d; ix = i; } }
    if (dm > tol) { keep[ix] = 1; st.push([a, ix], [ix, b]); } }
  return pts.filter((_, i) => keep[i]);
};
const ring = (p, tol) => { let far = 1; p.forEach((q, i) => { if (Math.hypot(q[0] - p[0][0], q[1] - p[0][1]) > Math.hypot(p[far][0] - p[0][0], p[far][1] - p[0][1])) far = i; }); return [...simplify(p.slice(0, far + 1), tol).slice(0, -1), ...simplify(p.slice(far), tol)]; };
const rings = pj.rings.map(r => r.map(G)).map(p => ({ p, a: area(p) })).sort((a, b) => b.a - a.a).slice(0, 4);
// North Island first (it draws first and the zoom starts from its northern tip)
rings.sort((a, b) => Math.min(...a.p.map(q => q[1])) - Math.min(...b.p.map(q => q[1])));
const coast = rings.map(r => 'M' + ring(r.p, .22).map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z');
const all = rings.flatMap(r => r.p), xs = all.map(q => q[0]), ys = all.map(q => q[1]);
const north = rings[0].p.reduce((m, q) => q[1] < m[1] ? q : m);
const pins = pj.pins.map(G);

/* ---------- image ---------- */
const port = 9600 + Math.floor(Math.random() * 300);
const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'nz3d-' + port)}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch {} await sleep(250); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const png = readFileSync(join(dir, 'nz-3d.png')).toString('base64');
const r = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `new Promise((ok, no) => { const i = new Image(); i.onload = () => { const c = Object.assign(document.createElement('canvas'), { width: i.naturalWidth, height: i.naturalHeight }); c.getContext('2d').drawImage(i, 0, 0); ok(c.toDataURL('image/webp', .86)); }; i.onerror = () => no('decode'); i.src = 'data:image/png;base64,${png}'; })` });
if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
const webp = Buffer.from(r.result.result.value.split(',')[1], 'base64');
writeFileSync(join(root, 'assets/img/nz/nz-3d.webp'), webp); ws.close(); edge.kill();
console.log('nz-3d.webp', Math.round(webp.length / 1024) + ' KB');

/* ---------- index.html ---------- */
const file = join(root, 'index.html'); let html = readFileSync(file, 'utf8');
// imagery: the render is an <img> layer under the SVG (.nzm__photo), placed in SVG viewBox units via CSS variables
html = html.replace(/<img class="nzm__3d"[^>]*>/, `<img class="nzm__3d" data-src="./assets/img/nz/nz-3d.webp" alt="" decoding="async" style="--x:${F.x};--y:${F.y};--w:${F.w};--h:${F.h}">`);
// coastline in page units (no offset transform any more)
html = html.replace(/<g class="nzm__map" transform="translate\(40 20\)">[\s\S]*?(<\/g><g class="nzm__lbl")/, `<g class="nzm__map">${coast.map((d, i) => `<path class="nzm__coast" id="nzc${i + 1}" d="${d}"/>`).join('')}$1`)
           .replace(/<g class="nzm__map">[\s\S]*?(<\/g><g class="nzm__lbl")/, `<g class="nzm__map">${coast.map((d, i) => `<path class="nzm__coast" id="nzc${i + 1}" d="${d}"/>`).join('')}$1`);
// pins and leader lines
let k = 0;
html = html.replace(/<g class="nzm__pin"><circle class="nzm__ring" cx="[\d.]+" cy="[\d.]+" r="7"\/><circle class="nzm__dot" cx="[\d.]+" cy="[\d.]+" r="3.2"\/><\/g>/g, () => { const [x, y] = pins[k++].map(v => v.toFixed(1)); return `<g class="nzm__pin"><circle class="nzm__ring" cx="${x}" cy="${y}" r="7"/><circle class="nzm__dot" cx="${x}" cy="${y}" r="3.2"/></g>`; });
let j = 0;
html = html.replace(/<path class="nzm__lead" d="M[\d.]+ [\d.]+ (L[^"]+)"\/>/g, (m, rest) => { const [x, y] = pins[j++].map(v => v.toFixed(1)); return `<path class="nzm__lead" d="M${x} ${y} ${rest}"/>`; });
writeFileSync(file, html);
console.log(`index.html: ${coast.length} coast paths, ${k} pins, ${j} leader lines`);
console.log(`nz.js values → zoom svgOrigin: '${north[0].toFixed(0)} ${north[1].toFixed(0)}'   phone viewBox: '${(Math.min(...xs) - 10).toFixed(0)} ${(Math.min(...ys) - 10).toFixed(0)} ${(Math.max(...xs) - Math.min(...xs) + 20).toFixed(0)} ${(Math.max(...ys) - Math.min(...ys) + 20).toFixed(0)}'`);
