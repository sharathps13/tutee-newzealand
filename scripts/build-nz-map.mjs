// Builds the universities map (index.html #nzm) from real geographic data, so the drawn outline and the imagery match:
//   coastline  Natural Earth 1:10m land polygons (public domain)  → the <path class="nzm__coast"> outlines
//   land       Sentinel-2 cloudless 2016 true-colour mosaic by EOX (CC BY 4.0, credited in the footer) → assets/img/nz/nz-sat.webp
//   ocean      NASA Blue Marble shaded relief + bathymetry via NASA GIBS (public domain), toned to a natural deep navy
// Both go through the map's projection (plain longitude/latitude scaling), so every pixel of the image lands exactly
// under the outline, the pins and the leader lines.
//   node scripts/build-nz-map.mjs [path/to/ne_10m_land.geojson]
// (downloads ne_10m_land.geojson if no path is given; needs Microsoft Edge for the WebP encoding)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// the map's projection (map units; the SVG group adds translate(40 20) on top). 1° lat = 30 units, 1° lon ≈ 22.65.
const P = (lon, lat) => [(lon - 166.2) * 0.755 * 30 + 8, (-lat - 34.1) * 30 + 8];
const OFF = [40, 20];

/* ---------- coastline ---------- */
const src = process.argv[2] || join(tmpdir(), 'ne_10m_land.geojson');
if (!existsSync(src)) { console.log('downloading Natural Earth land…'); writeFileSync(src, Buffer.from(await (await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson')).arrayBuffer())); }
const geo = JSON.parse(readFileSync(src, 'utf8'));
const rings = [];
for (const f of geo.features) { const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; for (const p of polys) rings.push(p[0]); }
const inNZ = r => r.every(([lon, lat]) => lon > 165.5 && lon < 179.5 && lat > -48 && lat < -33.8);
const area = pts => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
// Douglas–Peucker in map units: keeps the real shape at a detail the page can show
const simplify = (pts, tol) => {
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let dmax = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len; if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
};
const islands = rings.filter(inNZ).map(r => r.map(([lon, lat]) => P(lon, lat))).map(p => ({ p, a: area(p) })).sort((x, y) => y.a - x.a);
const main = islands.filter(x => x.a > 18);   // North, South, Stewart, plus the larger offshore islands
const byName = ['north', 'south', 'stewart'];
const ordered = [main.find(x => x.p.some(q => q[1] < 30)), main.find(x => x.a === Math.max(...main.map(m => m.a))), ...main].filter((x, i, a) => x && a.indexOf(x) === i);
// a ring starts and ends at the same point, so it is simplified as two halves split at its farthest point
const simplifyRing = (p, tol) => { const [x0, y0] = p[0]; let far = 1; p.forEach((q, i) => { if (Math.hypot(q[0] - x0, q[1] - y0) > Math.hypot(p[far][0] - x0, p[far][1] - y0)) far = i; }); return [...simplify(p.slice(0, far + 1), tol).slice(0, -1), ...simplify(p.slice(far), tol)]; };
const coast = ordered.map(x => { const s = simplifyRing(x.p, .12); return 'M' + s.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z'; });
// the photo cut-out uses every island, however small (only the bigger ones get a drawn outline), so no offshore
// island is left showing the ocean layer's dark land pixels
const maskRings = islands.map(x => { const s = x.p.length > 8 ? simplifyRing(x.p, .08) : x.p; return 'M' + s.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z'; });
console.log('islands:', ordered.map((x, i) => (byName[i] || 'island') + ' ' + Math.round(x.a)).join(', '), '| points', coast.map(d => d.split('L').length).join('/'));

/* ---------- imagery ---------- */
// left tile: the islands and the Tasman Sea, sharp (4 px per map unit); right tile: the open Pacific behind the
// university list, softer. They meet at the 180° meridian, which WMS cannot cross in one request.
const LAT = [-48.6, -33.0];
const tiles = [
  { name: 'nz-sat', lon: [164, 180], wmsLon: [164, 180], ppu: 5, q: .84, land: true },
  { name: 'nz-sat-east', lon: [180, 199.6], wmsLon: [-180, -160.4], ppu: 1.5, q: .72 }
];
const port = 9500 + Math.floor(Math.random() * 300);
const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'nz-map-' + port)}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch {} await sleep(250); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const placed = [];
const get = async (url, what) => { const b = Buffer.from(await (await fetch(url)).arrayBuffer()); if (!(b[0] === 0xFF || b[1] === 0x50)) throw new Error(what + ' did not return an image: ' + b.slice(0, 200).toString()); return 'data:image/' + (b[0] === 0xFF ? 'jpeg' : 'png') + ';base64,' + b.toString('base64'); };
for (const t of tiles) {
  const [x0, y0] = P(t.lon[0], LAT[1]), [x1, y1] = P(t.lon[1], LAT[0]);
  const w = Math.round((x1 - x0) * t.ppu), h = Math.round((y1 - y0) * t.ppu);
  // the open ocean: NASA Blue Marble seabed relief, toned down from its rendered blue to a natural deep navy
  const sea = await get(`https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&CRS=EPSG:4326&BBOX=${LAT[0]},${t.wmsLon[0]},${LAT[1]},${t.wmsLon[1]}&WIDTH=${w}&HEIGHT=${h}&FORMAT=image/png`, 'NASA GIBS');
  // the land and the water right at the shore: a true-colour Sentinel-2 photo mosaic (EOX "s2cloudless" 2016, CC BY 4.0)
  const land = t.land ? await get(`https://tiles.maps.eox.at/wms?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=s2cloudless&STYLES=&SRS=EPSG:4326&BBOX=${t.wmsLon[0]},${LAT[0]},${t.wmsLon[1]},${LAT[1]}&WIDTH=${w}&HEIGHT=${h}&FORMAT=image/jpeg`, 'EOX s2cloudless') : null;
  // terrain relief: NASA ASTER GDEM greyscale hill-shading (public domain), lit from the north-west
  const shade = t.land ? await get(`https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=ASTER_GDEM_Greyscale_Shaded_Relief&STYLES=&CRS=EPSG:4326&BBOX=${LAT[0]},${t.wmsLon[0]},${LAT[1]},${t.wmsLon[1]}&WIDTH=${w}&HEIGHT=${h}&FORMAT=image/png`, 'NASA GIBS relief') : null;
  // compose in the browser: ocean, then the photo cut out along the real coastline with a soft few-km feather
  const r = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const load = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no('decode failed'); i.src = s; });
    const W = ${w}, H = ${h}, k = ${t.ppu}, c = Object.assign(document.createElement('canvas'), { width: W, height: H }), x = c.getContext('2d');
    x.filter = 'saturate(.72) brightness(.8) contrast(1.08)'; x.drawImage(await load(${JSON.stringify(sea)}), 0, 0); x.filter = 'none';
    ${t.land ? `
    const m = Object.assign(document.createElement('canvas'), { width: W, height: H }), mx = m.getContext('2d');
    mx.setTransform(k, 0, 0, k, ${-x0} * k, ${-y0} * k); mx.fillStyle = mx.strokeStyle = '#fff'; mx.lineWidth = 2.4; mx.lineJoin = 'round';
    for (const d of ${JSON.stringify(maskRings)}) { const p = new Path2D(d); mx.fill(p); mx.stroke(p); }
    const canvas = () => { const e = Object.assign(document.createElement('canvas'), { width: W, height: H }); return [e, e.getContext('2d')]; };
    const [fm, fmx] = canvas(); fmx.filter = 'blur(' + (k * 1.1) + 'px)'; fmx.drawImage(m, 0, 0);   // soft-edged land mask
    // 3D: the islands cast a soft shadow onto the sea, as if raised above it
    const [sh, shx] = canvas(); shx.drawImage(fm, 0, 0); shx.globalCompositeOperation = 'source-in'; shx.fillStyle = '#020a18'; shx.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = .55; x.filter = 'blur(' + (k * 1.8) + 'px)'; x.drawImage(sh, k * 1.1, k * 1.8); x.restore();
    // the photo, then real terrain relief (NASA ASTER GDEM hill-shading) laid over it, so ranges and valleys stand out
    const [f, fx] = canvas(); fx.drawImage(fm, 0, 0);
    fx.globalCompositeOperation = 'source-in'; fx.filter = 'brightness(1.14) contrast(1.1) saturate(1.06)'; fx.drawImage(await load(${JSON.stringify(land)}), 0, 0); fx.filter = 'none';
    fx.globalCompositeOperation = 'overlay'; fx.globalAlpha = .62; fx.filter = 'brightness(.86) contrast(1.5)'; fx.drawImage(await load(${JSON.stringify(shade)}), 0, 0); fx.filter = 'none'; fx.globalAlpha = 1;
    fx.globalCompositeOperation = 'destination-in'; fx.drawImage(fm, 0, 0);
    x.drawImage(f, 0, 0);` : ''}
    return c.toDataURL('image/webp', ${t.q});
  })()` });
  if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  const webp = Buffer.from(r.result.result.value.split(',')[1], 'base64');
  writeFileSync(join(root, 'assets/img/nz', t.name + '.webp'), webp);
  placed.push({ ...t, x: +(x0 + OFF[0]).toFixed(2), y: +(y0 + OFF[1]).toFixed(2), w: +(x1 - x0).toFixed(2), h: +(y1 - y0).toFixed(2) });
  console.log(`${t.name}.webp ${w}x${h} ${Math.round(webp.length / 1024)} KB`);
}
ws.close(); edge.kill();

/* ---------- write into index.html ---------- */
const file = join(root, 'index.html');
let html = readFileSync(file, 'utf8');
const sat = '<g class="nzm__sat" clip-path="url(#nzm-frame)" aria-hidden="true">' + placed.map(t => `<image href="./assets/img/nz/${t.name}.webp" x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" preserveAspectRatio="none"/>`).join('') + '<rect width="800" height="460" fill="url(#nzm-fade)"/></g>';   // the open Pacific behind the list eases into the page's ultramarine, so the names stay easy to read
const paths = coast.map((d, i) => `<path class="nzm__coast" id="nzc${i + 1}" d="${d}"/>`).join('');
html = html.replace(/<g class="nzm__sat"[\s\S]*?<\/g>/, '').replace(/<defs><clipPath id="nzm-frame">[\s\S]*?<\/defs>/, '');
html = html.replace(/(<svg class="nzm__svg"[^>]*>)/, `$1<defs><clipPath id="nzm-frame"><rect width="800" height="460" rx="20"/></clipPath><linearGradient id="nzm-fade"><stop offset=".40" stop-color="#0F2A53" stop-opacity="0"/><stop offset=".53" stop-color="#0E2851" stop-opacity=".84"/><stop offset=".63" stop-color="#0C234B" stop-opacity="1"/><stop offset="1" stop-color="#0B2149" stop-opacity="1"/></linearGradient></defs>${sat}`);
html = html.replace(/(<g class="nzm__map" transform="translate\(40 20\)">)[\s\S]*?(<\/g><g class="nzm__lbl")/, `$1${paths}$2`);
writeFileSync(file, html);
console.log('index.html updated: ' + coast.length + ' coast paths, ' + placed.length + ' image tiles');
