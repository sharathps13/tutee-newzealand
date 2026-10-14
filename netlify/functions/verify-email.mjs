/**
 * GET /api/verify-email?domain=gmail.com
 *
 * Tells the counselling form whether an email domain can actually receive mail,
 * so a mistyped address (name@gmial.co, name@gmail.con) is caught while the
 * student is still on the page. It is a DNS lookup only: nothing is sent to the
 * address, and the address itself never reaches this function (only the part
 * after the @).
 *
 *   MX records present          → deliverable: true
 *   no MX, but an A/AAAA record → deliverable: true   (RFC 5321 implicit MX)
 *   null MX (RFC 7505) or none  → deliverable: false
 *   lookup timed out / failed   → deliverable: null   (the page never blocks on this)
 *
 * Specific to this site, unlike enquiry.mjs, which is shared and lives in _tooling.
 * Zero npm dependencies (node:dns only), so Netlify still needs no build step.
 */
import { resolveMx, resolve4, resolve6 } from 'node:dns/promises';

const DOMAIN_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

const within = (promise, ms) => Promise.race([promise,
  new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms))]);

const GONE = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN', 'ESERVFAIL']);

export async function checkDomain(input) {
  const domain = String(input ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!DOMAIN_RE.test(domain)) return { deliverable: false, reason: 'invalid-domain' };

  try {
    const mx = await within(resolveMx(domain), 3500);
    const real = mx.filter(r => r.exchange && r.exchange !== '.');
    return real.length ? { deliverable: true, reason: 'mx' } : { deliverable: false, reason: 'null-mx' };
  } catch (exc) {
    if (!GONE.has(exc.code)) return { deliverable: null, reason: 'lookup-failed' };
  }
  // no MX record: a domain with an address record can still take mail
  for (const lookup of [resolve4, resolve6]) {
    try {
      if ((await within(lookup(domain), 2500)).length) return { deliverable: true, reason: 'address-record' };
    } catch (exc) {
      if (!GONE.has(exc.code)) return { deliverable: null, reason: 'lookup-failed' };
    }
  }
  return { deliverable: false, reason: 'no-mail-server' };
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export default async function (req) {
  if (req.method !== 'GET') return json(405, { success: false, message: 'Method not allowed.' });
  const domain = new URL(req.url).searchParams.get('domain') || '';
  try {
    return json(200, { success: true, ...(await checkDomain(domain)) });
  } catch (exc) {
    console.error(`verify-email: unhandled: ${exc?.name}: ${exc?.message}`);
    return json(200, { success: true, deliverable: null, reason: 'error' });
  }
}

export const config = { path: '/api/verify-email' };
