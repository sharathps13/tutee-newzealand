/* Tutee AI: the page's assistant (bottom-left). Asks /api/ai (Claude, grounded in the page's content); if that
   isn't reachable (local preview, file://, no API key yet) it answers from the page's own FAQ and data instead. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'tc_ai_chat';
  const WELCOME = 'Kia ora! I’m **Tutee AI**. Ask me anything about studying in New Zealand: universities, cities, costs, work rights, visas or the route to residence.';
  const CHIPS = ['Which university is best for IT?', 'Can I work while I study?', 'How can I get PR in New Zealand?', 'What does it cost to live in Auckland?', 'Can my family come with me?'];

  const root = document.createElement('div');
  root.className = 'tai';
  root.innerHTML =
    '<button type="button" class="tai__launch" aria-expanded="false" aria-controls="tai-panel"><img src="./assets/img/brand/mark-64.png" alt="" width="40" height="40"><span class="tai__label"><b>Tutee AI</b><small>Ask me anything</small></span><span class="tai__dot" aria-hidden="true"></span></button>' +
    '<section class="tai__panel" id="tai-panel" role="dialog" aria-label="Tutee AI chat" hidden>' +
      '<header class="tai__head"><img src="./assets/img/brand/mark-64.png" alt="" width="40" height="40"><div><b>Tutee AI</b><small><i></i>Answers about studying in New Zealand</small></div>' +
      '<button type="button" class="tai__reset" title="New chat" aria-label="Start a new chat"><svg class="ic"><use href="#i-rotate"/></svg></button><button type="button" class="tai__close" aria-label="Close chat"><svg class="ic"><use href="#i-plus"/></svg></button></header>' +
      '<div class="tai__msgs" id="tai-msgs" aria-live="polite" data-lenis-prevent></div>' +
      '<div class="tai__chips" id="tai-chips"></div>' +
      '<form class="tai__form" id="tai-form"><textarea id="tai-in" rows="1" maxlength="1000" placeholder="Ask about universities, costs, visas…" aria-label="Your question"></textarea><button type="submit" class="tai__send" aria-label="Send"><svg class="ic"><use href="#i-arrow"/></svg></button></form>' +
      '<p class="tai__note">Tutee AI can make mistakes. Check important details with a counsellor.</p>' +
    '</section>';
  document.body.appendChild(root);
  const launch = $('.tai__launch', root), panel = $('#tai-panel'), msgs = $('#tai-msgs'), form = $('#tai-form'), input = $('#tai-in'), chips = $('#tai-chips');

  let history = []; try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { history = []; }
  const persist = () => { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-20))); } catch (e) { /* ignore */ } };

  // minimal, safe markdown: **bold**, [text](#anchor | page.html | https://), "- " lists, paragraphs
  function md(text) {
    const inline = s => esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((#[\w-]+|[\w-]+\.html(?:#[\w-]+)?|https:\/\/[^\s)]+)\)/g, (m, t, h) => '<a href="' + h + '"' + (/^https:/.test(h) || /\.html/.test(h) ? ' target="_blank" rel="noopener"' : ' data-ai-jump') + '>' + t + '</a>');
    const out = []; let ul = null;
    String(text).split('\n').forEach(line => {
      const l = line.trim();
      if (/^[-*•]\s+/.test(l)) { if (!ul) { ul = []; } ul.push('<li>' + inline(l.replace(/^[-*•]\s+/, '')) + '</li>'); return; }
      if (ul) { out.push('<ul>' + ul.join('') + '</ul>'); ul = null; }
      if (l) out.push('<p>' + inline(l) + '</p>');
    });
    if (ul) out.push('<ul>' + ul.join('') + '</ul>');
    return out.join('');
  }
  const bubble = (role, text) => { const d = document.createElement('div'); d.className = 'tai__m tai__m--' + role; d.innerHTML = role === 'user' ? '<p>' + esc(text) + '</p>' : md(text); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
  function paint() {
    msgs.innerHTML = ''; bubble('bot', WELCOME);
    history.forEach(m => bubble(m.role === 'user' ? 'user' : 'bot', m.content));
    chips.hidden = history.length > 0;
    chips.innerHTML = CHIPS.map(c => '<button type="button">' + esc(c) + '</button>').join('');
  }

  /* ---------- local fallback: best match from the page's own content ---------- */
  const STOP = new Set('a an the is are am i me my we you your to of in on for and or can do does how what which who where when why it be with at as from about this that there their will would should could get nz new zealand study studying student students'.split(' '));
  const words = s => String(s).toLowerCase().replace(/<[^>]+>/g, ' ').match(/[a-z0-9À-ɏ]+/g) || [];
  let docs = null;
  function buildDocs() {
    const d = window.__TC_DATA || {}, strip = h => String(h).replace(/<[^>]+>/g, ''), out = [];
    (d.faq || []).forEach(f => out.push({ k: f[0], a: f[1] + ' [Ask a counsellor](#consult) for your exact case.' }));
    (d.stages || []).forEach((s, i) => out.push({ k: s.h + ' ' + s.tag + ' ' + ['part time work family partner children', 'post study work visa graduate', 'job green list skilled career', 'pr permanent residence resident citizenship'][i], a: '**' + s.h + '.** ' + s.p + '\n' + s.list.map(l => '- ' + strip(l)).join('\n') + '\nSee [study to residence](#settle).' }));
    (d.reasons || []).forEach(r => out.push({ k: strip(r[0]) + ' ' + r[1], a: '**' + strip(r[0]) + '.** ' + r[2] }));
    (d.cities || []).forEach(c => out.push({ k: c.name + ' ' + c.reo + ' cost rent live living city weather ' + c.known.join(' '), a: '**' + c.name + '** (' + c.reo + '): ' + c.tag + '\n' + c.facts.map(f => '- ' + f[1] + ': ' + f[2] + ' (' + f[3] + ')').join('\n') + '\nStudy at: ' + c.unis.join(', ') + '. See [cities](#cities).' }));
    (d.steps || []).forEach((s, i) => out.push({ k: s[2] + ' ' + s[3] + ' ' + s[4].join(' ') + ' process step', a: '**Step ' + (i + 1) + ': ' + s[2] + '.** ' + s[3] + ' See [how it works](#process).' }));
    if (window.TCUnis) window.TCUnis.TOP.forEach(u => out.push({ k: u.name + ' ' + u.reo + ' ' + u.city + ' university ' + u.known.join(' '), a: '**' + u.name + '** (' + u.city + ', est. ' + u.est + '): ' + u.blurb + ' Known for ' + u.known.join(', ') + '. See [universities](#unis).' }));
    return out.map(x => ({ ...x, w: new Set(words(x.k).filter(t => !STOP.has(t))) }));
  }
  function localAnswer(q) {
    docs = docs || buildDocs();
    const qw = words(q).filter(t => !STOP.has(t) && t.length > 1);
    let best = null, bs = 0;
    docs.forEach(d => { let s = 0; qw.forEach(t => { if (d.w.has(t)) s += 2; else if ([...d.w].some(x => x.startsWith(t.slice(0, 4)) && t.length > 3)) s += 1; }); if (s > bs) { bs = s; best = d; } });
    if (best && bs >= 2) return best.a;
    return 'Good question. A counsellor can answer that properly for your profile: [book a free counselling call](#consult), or WhatsApp us on +91 73583 64959. You can also browse [universities](#unis), [cities](#cities) or the [FAQ](#faq).';
  }

  /* ---------- ask ---------- */
  let busy = false;
  async function ask(q) {
    q = q.trim(); if (!q || busy) return;
    busy = true; chips.hidden = true; input.value = ''; autosize();
    history.push({ role: 'user', content: q }); persist(); bubble('user', q);
    const typing = bubble('bot', ''); typing.classList.add('is-typing'); typing.innerHTML = '<span></span><span></span><span></span>';
    let reply = '';
    try {
      if (location.protocol === 'file:') throw new Error('offline');
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 45000);
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }), signal: ctl.signal });
      clearTimeout(t);
      const j = await r.json().catch(() => null);
      if (j && j.success && j.reply) reply = j.reply;
      else if (j && j.message && r.status === 429) reply = j.message;
      else throw new Error('unavailable');
    } catch (e) { reply = localAnswer(q); }
    typing.remove();
    history.push({ role: 'assistant', content: reply }); persist(); bubble('bot', reply);
    busy = false; input.focus({ preventScroll: true });
  }

  /* ---------- UI wiring ---------- */
  const setOpen = on => {
    panel.hidden = !on; launch.setAttribute('aria-expanded', on); root.classList.toggle('is-open', on);
    document.documentElement.classList.toggle('tai-lock', on && matchMedia('(max-width: 700px)').matches);
    if (on) { if (!msgs.childElementCount) paint(); setTimeout(() => input.focus({ preventScroll: true }), 60); msgs.scrollTop = msgs.scrollHeight; }
  };
  launch.addEventListener('click', () => setOpen(panel.hidden));
  $('.tai__close', root).addEventListener('click', () => setOpen(false));
  $('.tai__reset', root).addEventListener('click', () => { history = []; persist(); paint(); input.focus(); });
  chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; };
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  msgs.addEventListener('click', e => {
    const a = e.target.closest('[data-ai-jump]'); if (!a) return;
    e.preventDefault(); if (matchMedia('(max-width: 700px)').matches) setOpen(false);
    const h = a.getAttribute('href'); if (window.__goTo) window.__goTo(h); else location.hash = h;
  });
  window.TCAI = { ask, open: () => setOpen(true) };
})();
