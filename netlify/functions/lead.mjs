/**
 * POST /api/lead — the counselling form posts here; the lead is checked, then handed to the Google Apps Script
 * web app (apps-script/Code.gs), which appends it to the Google Sheet and emails business@tuteeconnect.com.
 *
 * Why not post to Apps Script straight from the browser: the page's CSP only allows same-origin requests, the
 * Apps Script URL and its shared secret stay out of the page source, and this is where a lead is validated for
 * real (the browser checks are for UX and can be bypassed).
 *
 * Netlify environment variables (Site configuration → Environment variables):
 *   APPS_SCRIPT_URL   required  the web-app URL from Deploy → Manage deployments (ends in /exec)
 *   LEAD_SECRET       required  any long random string; the same value is saved in Apps Script's Script Properties
 *
 * Zero npm dependencies (Node 18+ fetch). The DNS mail-server check is shared with /api/verify-email.
 */
import { checkDomain } from './verify-email.mjs';

const SOURCE = 'New Zealand Landing Page';
const MAX_BODY = 16 * 1024;
const LIMITS = { name: 120, email: 200, phone: 40, state: 80, universities: 200, course: 80, preferredCallTime: 120, interest: 200, page: 200, level: 80, city: 80, country: 80 };
const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

const clean = (v, n) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export function shape(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const lead = Object.fromEntries(Object.entries(LIMITS).map(([k, n]) => [k, clean(d[k], n)]));
  lead.source = SOURCE;                                   // fixed here, never taken from the browser
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) if (d[k]) lead[k] = clean(d[k], 150);
  lead.botcheck = d.botcheck;
  return lead;
}

export async function validate(lead) {
  if (lead.botcheck) return 'Rejected.';
  if (lead.name.length < 2) return 'Please enter your full name.';
  if (!EMAIL_RE.test(lead.email)) return 'Please enter a valid email address.';
  const digits = lead.phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Please enter a valid WhatsApp number.';
  const mx = await checkDomain(lead.email.split('@').pop());
  if (mx.deliverable === false) return 'That email address can’t receive mail. Please check it.';
  return null;
}

async function toAppsScript(lead) {
  const url = (process.env.APPS_SCRIPT_URL || '').trim(), secret = (process.env.LEAD_SECRET || '').trim();
  if (!url || !secret) throw new Error('APPS_SCRIPT_URL / LEAD_SECRET not set');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000);
  try {
    // Apps Script answers a POST with a 302 to googleusercontent.com; fetch follows it and reads the JSON reply
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, lead }), redirect: 'follow', signal: ctl.signal });
    const text = await r.text();
    let out; try { out = JSON.parse(text); } catch { throw new Error(`apps script returned non-JSON (HTTP ${r.status}): ${text.slice(0, 160)}`); }
    if (!out.success) throw new Error('apps script refused: ' + (out.error || 'unknown'));
    return out;
  } finally { clearTimeout(t); }
}

export default async function (req) {
  if (req.method === 'GET') return json(200, { success: true, endpoint: 'lead', configured: Boolean(process.env.APPS_SCRIPT_URL && process.env.LEAD_SECRET) });
  if (req.method !== 'POST') return json(405, { success: false, message: 'Method not allowed.' });
  const raw = await req.text().catch(() => '');
  if (raw.length > MAX_BODY) return json(413, { success: false, message: 'Submission too large.' });
  let body; try { body = JSON.parse(raw); } catch { return json(400, { success: false, message: 'Could not read the submission.' }); }

  const lead = shape(body);
  const problem = await validate(lead);
  if (problem) return json(400, { success: false, message: problem });
  delete lead.botcheck;

  try {
    const out = await toAppsScript(lead);
    console.log(`lead: stored row ${out.row || '?'}${out.duplicate ? ' (duplicate, not re-sent)' : ''}`);
    return json(200, { success: true, message: 'Thanks! A counsellor will call you at the time you chose.' });
  } catch (e) {
    console.error('lead: ' + e.message);                  // never echo the URL or secret to the browser
    return json(502, { success: false, message: 'We could not send your details just now. Please try again, or WhatsApp us on +91 73583 64959.' });
  }
}

export const config = { path: '/api/lead' };
