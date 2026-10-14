/**
 * GET /api/news — the four most relevant recent New Zealand education stories, for the "In the news" strip.
 *
 * Sources (public RSS, reputable NZ newsrooms):
 *   RNZ (Radio New Zealand, public broadcaster)  https://www.rnz.co.nz/rss/education.xml
 *   NZ Herald, Education section                  https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/education/?outputType=xml
 *   Universities New Zealand (the eight universities' peak body)  https://www.universitiesnz.ac.nz/rss.xml
 *
 * Stories are scored for relevance to someone planning to study in New Zealand (universities, international
 * students, visas, scholarships, tertiary…); crime / court / disaster stories and paywalled ("premium") Herald
 * articles are left out. Images come from the feed (Herald) or the article's og:image (RNZ) and are returned
 * as /api/news-img?u=… so the page's strict CSP (img-src 'self') holds.
 *
 * Cached in memory for 20 minutes and at Netlify's CDN for 30, so the newsrooms see a handful of requests an hour.
 * Zero npm dependencies.
 */
const FEEDS = [
  { source: 'RNZ', url: 'https://www.rnz.co.nz/rss/education.xml' },
  { source: 'NZ Herald', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/education/?outputType=xml' },
  { source: 'Universities NZ', url: 'https://www.universitiesnz.ac.nz/rss.xml', boost: 2 },
];
export const IMAGE_HOSTS = ['www.nzherald.co.nz', 'media.rnztools.nz', 'www.universitiesnz.ac.nz'];
// Universities NZ posts carry no photos; their stories show the publisher's logo instead
const LOGOS = { 'Universities NZ': 'https://www.universitiesnz.ac.nz/sites/all/themes/uninz/images/universities-logo-blue.png' };
const UA = 'Mozilla/5.0 (compatible; TuteeConnectNews/1.0; +https://www.tuteeconnect.com)';
const TTL = 20 * 60 * 1000, MAX_AGE_DAYS = 45, COUNT = 4;

const RELEVANT = /\b(universit\w*|tertiary|polytechnic|wānanga|wananga|student\w*|scholarship\w*|study|studying|education|school\w*|teacher\w*|NCEA|campus|graduate\w*|degree\w*|enrol\w*|visa\w*|immigration|international|learning|curriculum|research|apprentic\w*|skills)\b/i;
const STRONG = /\b(international students?|foreign students?|student visas?|post-study|universit\w*|tertiary|polytechnic|scholarship\w*|India\w*|graduate\w*|enrol\w*|immigration|research|STEM|engineering|medical school|fees?)\b/gi;
const AVOID = /\b(sex\w*|abuse\w*|offender\w*|assault\w*|rape|death|dead|died|dies|killed|murder\w*|court|police|charged|guilty|sentenc\w*|liquidat\w*|stab\w*|suicide|drugs?|fraud|bully\w*|harass\w*|violen\w*|weapon\w*|crash\w*|fire|injur\w*|strike\w*|cuts?|redundan\w*|layoffs?|closure|closing|misconduct|scandal|investigation|poverty|bleak|miss(es|ing)? out|missing|crisis|shortage\w*|struggl\w*|debt|protest\w*|poison\w*|accused|secretary general|reports? of concern|restricted|safety|complain\w*|unknown|found in|recall\w*)\b/i;

const entities = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
// feeds put HTML in descriptions, sometimes entity-encoded: unwrap CDATA, decode, strip tags, decode again
const decode = s => entities(entities(String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]) : ''; };

async function get(url, ms = 6000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: ctl.signal, redirect: 'follow' }); return r.ok ? await r.text() : ''; }
  catch { return ''; } finally { clearTimeout(t); }
}

export function parseFeed(xml, source) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(([, it]) => {
    const media = [...it.matchAll(/<media:content[^>]*url="([^"]+)"[^>]*?(?:width="(\d+)")?[^>]*\/?>/gi)].map(m => ({ url: m[1].replace(/&amp;/g, '&'), w: +(m[1].match(/width=(\d+)/)?.[1] || m[2] || 0) }));
    const enclosure = it.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i)?.[1];
    const best = media.sort((a, b) => b.w - a.w).find(m => m.w <= 900) || media[0];
    return {
      source, boost: 0, title: tag(it, 'title'), url: tag(it, 'link'), summary: tag(it, 'description').slice(0, 220),
      date: new Date(tag(it, 'pubDate') || Date.now()).toISOString(),
      image: best?.url || (enclosure ? enclosure.replace(/&amp;/g, '&') : ''),
    };
  }).filter(i => i.title && /^https:\/\//.test(i.url));
}

export function rank(items, now = Date.now()) {
  const seen = new Set();
  return items
    .filter(i => !/\/premium\//.test(i.url))                       // paywalled
    .filter(i => now - Date.parse(i.date) < (i.boost ? 180 : MAX_AGE_DAYS) * 864e5)   // the universities' body posts less often
    .filter(i => { const k = i.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(i => { const text = i.title + ' ' + i.summary; return { ...i, score: AVOID.test(text) ? -1 : RELEVANT.test(text) ? 1 + i.boost + (text.match(STRONG) || []).length * 2 : 0 }; })
    .filter(i => i.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.date) - Date.parse(a.date));
}

async function ogImage(url) {
  const html = await get(url, 5000);
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m ? m[1].replace(/&amp;/g, '&') : '';
}

const proxied = u => { try { const h = new URL(u).hostname; return IMAGE_HOSTS.includes(h) ? '/api/news-img?u=' + encodeURIComponent(u) : ''; } catch { return ''; } };

let cache = null;
export async function latest() {
  if (cache && Date.now() - cache.at < TTL) return cache.items;
  const lists = await Promise.all(FEEDS.map(async f => parseFeed(await get(f.url), f.source).map(i => ({ ...i, boost: f.boost || 0 }))));
  // alternate sources so one newsroom doesn't fill every slot, then take the best four
  const ranked = rank(lists.flat());
  const pick = [];
  for (const i of ranked) { if (pick.length >= COUNT) break; if (pick.filter(p => p.source === i.source).length < 2) pick.push(i); }
  await Promise.all(pick.map(async i => { if (!i.image) i.image = await ogImage(i.url); if (!i.image && LOGOS[i.source]) { i.image = LOGOS[i.source]; i.logo = true; } }));
  const items = pick.map(({ source, title, url, summary, date, image, logo }) => ({ source, title, url, summary, date, image: proxied(image), logo: !!logo }));
  if (items.length) cache = { at: Date.now(), items };
  return items;
}

export default async function () {
  let items = [];
  try { items = await latest(); } catch (e) { console.error('news: ' + e.message); }
  return new Response(JSON.stringify({ success: true, items, updated: new Date().toISOString() }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}

export const config = { path: '/api/news' };
