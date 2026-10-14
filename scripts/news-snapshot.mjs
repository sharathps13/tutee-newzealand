// Save a snapshot of the current news strip so the section still shows when the live /api/news isn't
// reachable (index.html opened from disk, a static preview, or a feed outage).
// Writes assets/js/news-snapshot.js (window.NEWS_SNAPSHOT) and the story images to assets/img/news/.
// usage: node scripts/news-snapshot.mjs      (re-run whenever you want the fallback refreshed)
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { latest } from '../netlify/functions/news.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), imgDir = join(root, 'assets/img/news');
mkdirSync(imgDir, { recursive: true });
for (const f of readdirSync(imgDir)) unlinkSync(join(imgDir, f));
const items = await latest();
const out = [];
for (const [n, i] of items.entries()) {
  let image = '';
  if (i.image) {
    const src = decodeURIComponent(i.image.replace('/api/news-img?u=', ''));
    try {
      const r = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TuteeConnectNews/1.0)' } });
      const type = r.headers.get('content-type') || '';
      if (r.ok && type.startsWith('image/')) { const ext = type.includes('webp') ? 'webp' : type.includes('png') ? 'png' : 'jpg'; const name = `story-${n + 1}.${ext}`; writeFileSync(join(imgDir, name), Buffer.from(await r.arrayBuffer())); image = './assets/img/news/' + name; }
    } catch { /* keep the icon tile */ }
  }
  out.push({ ...i, image });
}
writeFileSync(join(root, 'assets/js/news-snapshot.js'), `/* Fallback for the news strip, saved ${new Date().toISOString()} by scripts/news-snapshot.mjs. */\nwindow.NEWS_SNAPSHOT = ${JSON.stringify(out, null, 1)};\n`);
console.log(out.map(i => `${i.source} | ${i.title} | ${i.image || 'tile'}`).join('\n'));
