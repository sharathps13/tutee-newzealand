/**
 * Tutee Connect · New Zealand landing page → Google Sheet + lead email
 *
 * Receives leads from the site's Netlify function (/api/lead), appends one row per lead to the "Leads" tab
 * of the spreadsheet this script is bound to, and emails business@tuteeconnect.com.
 * The very first lead (or running setup()) creates and formats the table.
 *
 * Script Properties (Project Settings → Script Properties):
 *   LEAD_SECRET   the same long random string as LEAD_SECRET in Netlify. Requests without it are refused.
 *
 * Deploy: Deploy → New deployment → Web app · Execute as: Me · Who has access: Anyone. Copy the /exec URL
 * into Netlify as APPS_SCRIPT_URL. Full steps: apps-script/SETUP.md
 */

const CONFIG = {
  SHEET_NAME: 'Leads',
  NOTIFY_TO: 'business@tuteeconnect.com',
  SENDER_NAME: 'Tutee Connect · NZ Landing Page',
  TIMEZONE: 'Asia/Kolkata',
  SOURCE: 'New Zealand Landing Page',
  // Columns, in this order. The first nine are the agreed layout; "Preferred Call Time" is extra (delete it
  // here and in rowFor_() if you don't want it).
  HEADERS: ['Date', 'Time', 'Full Name', 'Phone Number', 'Email', 'State', 'Shortlisted Universities', 'Course', 'Lead Source', 'Preferred Call Time'],
  WIDTHS: [110, 90, 190, 160, 240, 130, 260, 190, 200, 210],
  COLOURS: { header: '#0A3B3C', headerText: '#FFFFFF', band: '#FBF6EE', line: '#E6D9C4' },
  DUPLICATE_WINDOW_SECONDS: 600,
};

/* ------------------------------------------------------------------ web app */

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('LEAD_SECRET');
    if (!secret || body.secret !== secret) return reply_({ success: false, error: 'unauthorised' });
    const result = saveLead_(body.lead || {});
    return reply_(result);
  } catch (err) {
    console.error(err && err.stack || err);
    return reply_({ success: false, error: String(err && err.message || err) });
  }
}

// GET on the /exec URL: a quick "is it alive" check that reveals nothing about the leads
function doGet() {
  return reply_({ success: true, service: 'tutee-nz-leads' });
}

/* --------------------------------------------------------------- core logic */

function saveLead_(raw) {
  const lead = normalise_(raw);
  if (!lead.name || !lead.email || !lead.phone) return { success: false, error: 'missing name, email or phone' };

  // the same person submitting twice within 10 minutes (double click, retry) is stored and emailed once
  const cache = CacheService.getScriptCache();
  const key = 'lead_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, (lead.email + '|' + lead.phone).toLowerCase()));
  if (cache.get(key)) return { success: true, duplicate: true };

  const now = new Date();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);                                   // two leads at the same moment never collide
  let sheet, row;
  try {
    sheet = ensureSheet_();
    sheet.appendRow(rowFor_(lead, now));
    row = sheet.getLastRow();
    formatRow_(sheet, row);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  cache.put(key, '1', CONFIG.DUPLICATE_WINDOW_SECONDS);

  sendEmail_(lead, now, sheet, row);
  return { success: true, row: row };
}

function normalise_(d) {
  const s = (v, n) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  return {
    name: s(d.name, 120), email: s(d.email, 200).toLowerCase(), phone: s(d.phone, 40), state: s(d.state, 80),
    universities: s(d.universities, 200), course: s(d.course, 80), callTime: s(d.preferredCallTime, 120),
    interest: s(d.interest, 200), page: s(d.page, 200), source: CONFIG.SOURCE,
    level: s(d.level, 80), city: s(d.city, 80), country: s(d.country, 80),
    utms: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].filter(k => d[k]).map(k => [k.replace('utm_', ''), s(d[k], 150)]),
    utm: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].filter(k => d[k]).map(k => k.replace('utm_', '') + ': ' + s(d[k], 150)).join(' · '),
  };
}

// cell values; text that could be read as a formula (= + - @) is stored as plain text
function rowFor_(lead, now) {
  const text = v => (/^[=+\-@]/.test(v) ? "'" + v : v);
  return [now, now, text(lead.name), "'" + lead.phone, text(lead.email), text(lead.state), text(lead.universities), text(lead.course), lead.source, text(lead.callTime)];
}

/* ------------------------------------------------------------- the table */

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSpreadsheetTimeZone() !== CONFIG.TIMEZONE) ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME, 0);
  if (sheet.getLastRow() === 0) buildTable_(sheet);
  return sheet;
}

function buildTable_(sheet) {
  const n = CONFIG.HEADERS.length, c = CONFIG.COLOURS;
  sheet.getRange(1, 1, 1, n).setValues([CONFIG.HEADERS])
    .setFontWeight('bold').setFontColor(c.headerText).setBackground(c.header)
    .setVerticalAlignment('middle').setHorizontalAlignment('left').setWrap(true);
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);
  CONFIG.WIDTHS.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  // tidy the grid down to the table's width
  const extra = sheet.getMaxColumns() - n;
  if (extra > 0) sheet.deleteColumns(n + 1, extra);
  // column formats: real date/time values (so the sheet sorts and filters correctly), phone as text
  sheet.getRange('A2:A').setNumberFormat('dd mmm yyyy');
  sheet.getRange('B2:B').setNumberFormat('hh:mm am/pm');
  sheet.getRange('D2:D').setNumberFormat('@');
  sheet.getRange(1, 1, sheet.getMaxRows(), n).setFontFamily('Arial').setFontSize(10);
  sheet.getRange(1, 1, 1, n).setFontSize(10);
  // filter buttons on the header row, and alternating row colours
  sheet.getRange(1, 1, sheet.getMaxRows(), n).createFilter();
  sheet.getRange(1, 1, sheet.getMaxRows(), n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(c.header).setFirstRowColor('#FFFFFF').setSecondRowColor(c.band);
}

function formatRow_(sheet, row) {
  const n = CONFIG.HEADERS.length;
  sheet.getRange(row, 1).setNumberFormat('dd mmm yyyy');
  sheet.getRange(row, 2).setNumberFormat('hh:mm am/pm');
  sheet.getRange(row, 1, 1, n).setVerticalAlignment('top').setWrap(true);
}

/* ------------------------------------------------------------------ email */

function sendEmail_(lead, now, sheet, row) {
  const ss = sheet.getParent();
  const t = HtmlService.createTemplateFromFile('Email');
  t.lead = lead;
  t.date = Utilities.formatDate(now, CONFIG.TIMEZONE, 'EEE, d MMM yyyy');
  t.time = Utilities.formatDate(now, CONFIG.TIMEZONE, 'h:mm a') + ' IST';
  t.digits = lead.phone.replace(/\D/g, '');
  t.sheetUrl = ss.getUrl() + '#gid=' + sheet.getSheetId() + '&range=A' + row;
  t.row = row;
  const html = t.evaluate().getContent();

  const plain = [
    'New lead from the ' + CONFIG.SOURCE,
    '',
    'Date: ' + t.date, 'Time: ' + t.time, 'Name: ' + lead.name, 'Phone: ' + lead.phone, 'Email: ' + lead.email,
    'State: ' + (lead.state || '-'), 'Shortlisted universities: ' + (lead.universities || '-'), 'Course: ' + (lead.course || '-'),
    'Level: ' + (lead.level || '-'), 'Preferred city: ' + (lead.city || '-'), 'Phone country: ' + (lead.country || '-'),
    'Preferred call time: ' + (lead.callTime || '-'), 'Lead source: ' + lead.source, 'Page: ' + (lead.page || '-'),
    '', 'Sheet: ' + t.sheetUrl,
  ].filter(l => l !== null).join('\n');

  MailApp.sendEmail({
    to: CONFIG.NOTIFY_TO,
    subject: 'New NZ lead: ' + lead.name + (lead.course ? ' · ' + lead.course : ''),
    htmlBody: html,
    body: plain,
    replyTo: lead.email,                                  // "Reply" answers the student directly
    name: CONFIG.SENDER_NAME,
  });
}

/* ------------------------------------------------------------- helpers */

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------- run these by hand */

// Run once from the editor: asks for permissions and creates the formatted "Leads" table.
function setup() {
  const sheet = ensureSheet_();
  console.log('Ready: "' + sheet.getName() + '" in ' + sheet.getParent().getUrl());
}

// Run from the editor to see a real row and the real email, without the website.
function sendTestLead() {
  const r = saveLead_({
    name: 'Test Lead (delete me)', email: 'test.lead@example.com', phone: '+91 98401 23456', state: 'Tamil Nadu',
    universities: 'University of Auckland, University of Otago', course: 'IT & Computer Science',
    preferredCallTime: 'Afternoon, 2 – 5 PM (India time)', utm_source: 'test',
  });
  console.log(JSON.stringify(r));
}
