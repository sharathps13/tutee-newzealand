// Render apps-script/Email.html with a sample lead, exactly as Apps Script's HtmlService would
// (<?= ?> prints escaped, <? ?> runs code), and save it as apps-script/email-preview.html.
// usage: node scripts/render-email-preview.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps-script');
const tpl = readFileSync(join(dir, 'Email.html'), 'utf8');
const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
let code = 'let __o = "";\n', last = 0;
for (const m of tpl.matchAll(/<\?(=?)([\s\S]*?)\?>/g)) {
  code += '__o += ' + JSON.stringify(tpl.slice(last, m.index)) + ';\n';
  code += m[1] ? `__o += __esc(${m[2].trim()});\n` : m[2] + '\n';
  last = m.index + m[0].length;
}
code += '__o += ' + JSON.stringify(tpl.slice(last)) + ';\nreturn __o;';
const data = {
  lead: { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', phone: '+91 98401 23456', state: 'Tamil Nadu', universities: '', course: 'IT & Computer Science', callTime: 'Afternoon, 2 – 5 PM (India time)', source: 'New Zealand Landing Page', level: "Master's level", city: 'Auckland', country: 'India', page: 'nz.tuteeconnect.com/', utms: [['source', 'instagram'], ['medium', 'paid'], ['campaign', 'nz-feb-intake']] },
  date: 'Wed, 14 Oct 2026', time: '6:42 PM IST', digits: '919840123456', sheetUrl: 'https://docs.google.com/spreadsheets/d/EXAMPLE/edit#gid=0&range=A2', row: 2,
};
const html = new Function('__esc', ...Object.keys(data), code)(esc, ...Object.values(data));
writeFileSync(join(dir, 'email-preview.html'), html);
console.log('wrote apps-script/email-preview.html');
