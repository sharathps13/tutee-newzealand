/**
 * GET /api/news-img?u=<image url> — relays a news thumbnail through this site so the page's CSP can stay
 * img-src 'self'. Only the two newsrooms' image hosts are allowed (no open proxy), only image responses are
 * passed on, and they are capped at 3 MB and cached for a day.
 */
import { IMAGE_HOSTS } from './news.mjs';
const MAX = 3 * 1024 * 1024;

export default async function (req) {
  const u = new URL(req.url).searchParams.get('u') || '';
  let target;
  try { target = new URL(u); } catch { return new Response('Bad request', { status: 400 }); }
  if (target.protocol !== 'https:' || !IMAGE_HOSTS.includes(target.hostname)) return new Response('Forbidden', { status: 403 });
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TuteeConnectNews/1.0)', Accept: 'image/avif,image/webp,image/*' }, signal: ctl.signal });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) return new Response('Not found', { status: 404 });
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX) return new Response('Too large', { status: 413 });
    return new Response(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'Netlify-CDN-Cache-Control': 'public, s-maxage=604800', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Upstream error', { status: 502 }); }
  finally { clearTimeout(t); }
}

export const config = { path: '/api/news-img' };
