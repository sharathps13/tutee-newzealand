/* Tutee AI: the page's assistant (bottom-left). Runs entirely in the browser: it answers from the page's own
   FAQ, reasons, cities, universities, steps and residence stages. No API, no key, nothing sent anywhere. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'tc_ai_chat';
  const WELCOME = 'Kia ora! I’m **Tutee AI**. Ask me anything about studying in New Zealand: universities, cities, costs, work rights, visas or the route to residence.';
  const CHIPS = ['Request a callback', 'Which university is best for IT?', 'Can I work while I study?', 'What is the route to residence?', 'What does it cost to live in Auckland?', 'Can my family come with me?'];

  const root = document.createElement('div');
  root.className = 'tai';
  root.innerHTML =
    '<button type="button" class="tai__launch" aria-expanded="false" aria-controls="tai-panel"><img src="./assets/img/brand/mark-64.png" alt="" width="40" height="40"><span class="tai__label"><b>Tutee AI</b><small>Ask me anything</small></span><span class="tai__dot" aria-hidden="true"></span></button>' +
    '<section class="tai__panel" id="tai-panel" role="dialog" aria-label="Tutee AI chat" hidden>' +
      '<header class="tai__head"><img src="./assets/img/brand/mark-64.png" alt="" width="40" height="40"><div><b>Tutee AI</b><small><i></i>Answers about studying in New Zealand</small></div>' +
      '<button type="button" class="tai__reset" title="New chat" aria-label="Start a new chat"><svg class="ic"><use href="#i-rotate"/></svg></button><button type="button" class="tai__close" aria-label="Close chat"><svg class="ic"><use href="#i-plus"/></svg></button></header>' +
      '<div class="tai__msgs" id="tai-msgs" aria-live="polite"></div>' +
      '<div class="tai__chips" id="tai-chips"></div>' +
      '<form class="tai__form" id="tai-form"><textarea id="tai-in" rows="1" maxlength="1000" placeholder="Ask about universities, costs, visas…" aria-label="Your question"></textarea><button type="submit" class="tai__send" aria-label="Send"><svg class="ic"><use href="#i-arrow"/></svg></button></form>' +
      '<p class="tai__note">Tutee AI can make mistakes. Check important details with a counsellor.</p>' +
    '</section>';
  document.body.appendChild(root);
  const launch = $('.tai__launch', root), panel = $('#tai-panel'), msgs = $('#tai-msgs'), form = $('#tai-form'), input = $('#tai-in'), chips = $('#tai-chips');

  let history = []; try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { history = []; }
  const persist = () => { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-20))); } catch (e) { /* ignore */ } };

  // minimal, safe markdown: **bold**, [text](#anchor | page.html), "- " lists, paragraphs. Links never leave the site:
  // a link to anywhere else is shown as its text only.
  function md(text) {
    const inline = s => esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((#[\w-]+|[\w-]+\.html(?:#[\w-]+)?)\)/g, (m, t, h) => '<a href="' + h + '"' + (/\.html/.test(h) ? '' : ' data-ai-jump') + '>' + t + '</a>')
      .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1');
    const out = []; let ul = null;
    const sug = [];
    String(text).split('\n').forEach(line => {
      const l = line.trim();
      const s = l.match(/^\[\[(.+)\]\]$/); if (s) { sug.push('<button type="button" class="tai__sugg" data-ask="' + esc(s[1]) + '">' + esc(s[1]) + '</button>'); return; }   // [[question]] = a follow-up you can tap
      if (/^[-*•]\s+/.test(l)) { if (!ul) { ul = []; } ul.push('<li>' + inline(l.replace(/^[-*•]\s+/, '')) + '</li>'); return; }
      if (ul) { out.push('<ul>' + ul.join('') + '</ul>'); ul = null; }
      if (l) out.push('<p>' + inline(l) + '</p>');
    });
    if (ul) out.push('<ul>' + ul.join('') + '</ul>');
    if (sug.length) out.push('<div class="tai__suggs">' + sug.join('') + '</div>');
    return out.join('');
  }
  const bubble = (role, text) => { const d = document.createElement('div'); d.className = 'tai__m tai__m--' + role; d.innerHTML = role === 'user' ? '<p>' + esc(text) + '</p>' : md(text); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
  function paint() {
    msgs.innerHTML = ''; bubble('bot', WELCOME);
    history.forEach(m => bubble(m.role === 'user' ? 'user' : 'bot', m.content));
    chips.hidden = history.length > 0;
    chips.innerHTML = CHIPS.map(c => '<button type="button">' + esc(c) + '</button>').join('');
  }

  /* ---------- the model: built from this page, runs in the browser ----------
     On first use it reads the page (FAQ, reasons, cities, universities, steps, residence stages, services, loan
     partners, contact details) into a small search index. A question is normalised (accents, plurals, typos and
     synonyms such as "PR" → residence, "IT" → computing), then routed: small talk, a university, a city fact, a
     comparison, "which university is best for…", a follow-up to the last answer, or the best-ranked passage (BM25). */
  const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const strip = h => String(h).replace(/<[^>]+>/g, '');
  const CONTACT = 'WhatsApp or call **+91 73583 64959**, email **info@tuteeconnect.com**, or [book a free counselling call](#consult).';
  const STOP = new Set(('a an the is are am i im me my we you your to of in on for and or can could do does did how what whats which who where when why it its be been being with at as from about this that these those there their them they ' +
    'will would should shall may might must get got nz new zealand study studying student students please tell know want like just also any some much many more most than then so if into out up by our us not ok okay really need go going there here yes').split(' '));
  const SYN = {};   // word → canonical concept, applied to both the page and the question
  [['residence', 'pr permanent residency resident residence settle settlement citizenship citizen migrate migration immigrate immigration'],
   ['work', 'work working job jobs employment employ career careers earn earning salary salaries wage wages hire hiring internship parttime'],
   ['cost', 'cost costs fee fees tuition price prices expensive cheap affordable afford budget money spend expense expenses'],
   ['rent', 'rent rents accommodation housing house flat flats room rooms hostel flatting'],
   ['family', 'family families partner partners spouse wife husband child children kid kids dependant dependants dependent dependents'],
   ['loan', 'loan loans finance financing funding lender lenders bank banks credit'],
   ['englishtest', 'ielts pte toefl duolingo englishtest'],
   ['university', 'university universities uni unis college colleges campus institution institutions'],
   ['course', 'course courses program programs programme programmes degree degrees major subject subjects'],
   ['computing', 'computing computer computers software data coding programming tech technology cyber'],
   ['health', 'health medicine medical mbbs nursing dentistry dental doctor doctors'],
   ['weather', 'weather climate temperature cold warm hot rain winter summer'],
   ['safe', 'safe safety secure peaceful peace crime'],
   ['scholarship', 'scholarship scholarships bursary bursaries discount'],
   ['apply', 'apply application applications admission admissions enrol enroll enrolment offer offers'],
   ['visa', 'visa visas permit permits'],
   ['population', 'population people size big crowded']
  ].forEach(([k, ws]) => ws.split(' ').forEach(w => { SYN[w] = k; }));
  const stem = w => w.length < 5 ? w : w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1').replace(/(ing|ed)$/, m => w.length > 6 ? '' : m);
  const toks = s => (fold(strip(s).replace(/\bIT\b/g, ' computing ')).match(/[a-z0-9]+/g) || []).filter(t => !STOP.has(t)).map(t => SYN[t] || SYN[stem(t)] || stem(t));
  const lev = (a, b, max) => {   // edit distance, giving up once it passes max
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) { const cur = [i]; let low = i; for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); low = Math.min(low, cur[j]); } if (low > max) return max + 1; prev = cur; }
    return prev[b.length];
  };

  let M = null;   // the built model
  function build() {
    const d = window.__TC_DATA || {}, U = (window.TCUnis && window.TCUnis.TOP) || [], docs = [];
    const add = (title, body, answer, ask, extra) => docs.push({ title, body, answer, ask, ...extra });
    (d.faq || []).forEach(f => add(f[0], f[1], f[1] + '\nMore in the [FAQ](#faq), or [ask a counsellor](#consult) about your case.', f[0]));
    (d.reasons || []).forEach(r => add(strip(r[0]), r[1] + ' ' + r[2] + ' ' + r[4], '**' + strip(r[0]) + '.** ' + r[2] + '\nSee [' + d.reasons.length + ' reasons to study in New Zealand](#why).', 'Tell me more: ' + strip(r[0]).toLowerCase()));
    (d.stages || []).forEach((s, i) => add(s.h + ' ' + s.tag, s.p + ' ' + s.list.map(strip).join(' ') + ' ' + ['part time work family partner children while studying', 'post study work visa after graduating', 'skilled job green list career employer', 'permanent residence pr residency resident visa'][i],
      '**' + s.h + '.** ' + s.p + '\n' + s.list.map(l => '- ' + strip(l)).join('\n') + '\nRules change, so a counsellor checks your exact route. See [study to residence](#settle).', s.h));
    (d.steps || []).forEach((s, i) => add('Step ' + (i + 1) + ' ' + s[2] + ' ' + s[1], s[3] + ' ' + s[4].join(' ') + ' process how it works',
      '**Step ' + (i + 1) + ': ' + s[2] + '.** ' + s[3] + '\n' + s[4].map(x => '- ' + x).join('\n') + '\nSee [how it works](#process).', 'What happens at the ' + s[2].toLowerCase() + ' step?'));
    (d.cities || []).forEach(c => add(c.name + ' ' + c.reo + ' city', c.tag + ' ' + c.known.join(' ') + ' ' + c.unis.join(' ') + ' ' + c.facts.map(f => f[1] + ' ' + f[3]).join(' ') + ' ' + c.island + ' island',
      cityAnswer(c), 'Tell me about ' + c.name, { city: c }));
    U.forEach(u => add(u.name + ' ' + u.reo, u.city + ' university ' + u.known.join(' ') + ' ' + u.blurb, uniAnswer(u), 'Tell me about ' + u.name, { uni: u }));
    // the page itself: services, loan partners, how the free call works, offices
    document.querySelectorAll('#trust h3').forEach(h => { const p = h.parentElement.querySelector('p'); if (p) add(h.textContent, p.textContent + ' service help', '**' + h.textContent.trim() + '.** ' + p.textContent.trim() + '\nAll of it with one counsellor: see [why Tutee Connect](#trust).', 'Do you help with ' + h.textContent.trim().toLowerCase() + '?'); });
    const lenders = [...new Set([...document.querySelectorAll('#trust img[alt]')].map(i => i.alt.trim()).filter(Boolean))];
    if (lenders.length) add('Education loan partners lenders', 'loan bank finance ' + lenders.join(' '), 'We compare education loans across **' + lenders.length + ' lenders**: ' + lenders.join(', ') + '. Secured and unsecured offers are both possible; a counsellor helps you pick. [Book a free call](#consult).', 'Which banks do you work with for loans?');
    const steps = [...document.querySelectorAll('.cnext li')].map(li => li.querySelector('b').textContent + ': ' + li.querySelector('p').textContent);
    if (steps.length) add('Free counselling call consultation book', 'call book booking consultation counselling counsellor callback free ' + steps.join(' '), 'The counselling call is **free, with no obligation**, and parents are welcome:\n' + steps.map(s => '- ' + s).join('\n') + '\n[Book your free call](#consult).', 'How does the free call work?');
    add('About Tutee Connect offices', 'who are you company agency consultancy office offices chennai dubai india uae about team', 'Tutee Connect is a study-abroad and immigration consultancy with offices in **Chennai and Dubai**. One counsellor handles your course choice, test prep, admissions, loan, visa and arrival. ' + CONTACT, 'Where are your offices?');
    // index: BM25 over title (counted three times) + body
    docs.forEach(x => { x.t = [...toks(x.title), ...toks(x.title), ...toks(x.title), ...toks(x.body)]; x.tf = {}; x.t.forEach(t => { x.tf[t] = (x.tf[t] || 0) + 1; }); });
    const df = {}; docs.forEach(x => Object.keys(x.tf).forEach(t => { df[t] = (df[t] || 0) + 1; }));
    const N = docs.length, avg = docs.reduce((a, x) => a + x.t.length, 0) / N;
    const idf = t => Math.log(1 + (N - (df[t] || 0) + .5) / ((df[t] || 0) + .5));
    // entities: cities (English and Māori names) and universities (with everyday short names)
    const cities = (d.cities || []).map(c => ({ c, re: new RegExp('\\b(' + [c.name, c.reo, c.code, c.id].map(fold).join('|') + ')\\b') }));
    const ALIAS = { 'Auckland University of Technology': 'aut|auckland university of technology', 'University of Auckland': 'uoa|university of auckland|auckland uni|auckland university(?! of)', 'Victoria University of Wellington': 'victoria|vuw|vic uni|te herenga waka', 'University of Otago': 'otago', 'University of Canterbury': 'canterbury|uc', 'Lincoln University': 'lincoln', 'Massey University': 'massey', 'University of Waikato': 'waikato' };
    const unis = U.map(u => ({ u, re: new RegExp('\\b(' + (ALIAS[u.name] || fold(u.name)) + ')\\b') }));
    return { docs, df, idf, N, avg, vocab: Object.keys(df), dict: [...new Set([...Object.keys(df), ...Object.keys(SYN)])], cities, unis };
  }
  // typo-tolerant: an unknown word becomes the closest known one (page vocabulary or synonym list), if close enough
  const fix = t => {
    if (M.df[t] || t.length < 4) return t;
    const max = t.length >= 7 ? 2 : 1; let best = null, bd = max + 1;
    for (const v of M.dict) { if (Math.abs(v.length - t.length) > max) continue; const d = lev(t, v, max); if (d < bd) { bd = d; best = v; if (d === 1 && max === 1) break; } }
    return best ? (SYN[best] || best) : t;
  };
  function cityAnswer(c, facet) {
    const F = c.facts.map(f => ({ k: f[1], v: f[2], n: f[3] }));
    const line = f => '- **' + f.k + ':** ' + f.v + ' (' + f.n + ')';
    // the page quotes no rent or fee figures (none it can source), so costs go to a counsellor's budget
    if (facet === 'rent' || facet === 'cost') return '**Living in ' + c.name + '.** Rent depends on the suburb, the room and the time of year, and this page doesn’t quote rent figures.' + (facet === 'cost' ? ' Tuition depends on your course and university.' : '') + ' A counsellor builds your full budget, in INR or AED, on the [free call](#consult).\nSee [' + c.name + ' in Pick a city](#cities).';
    if (facet === 'weather') { const f = F.find(x => /climate/i.test(x.k)); return '**' + c.name + ' weather:** ' + f.v + ' (' + f.n.toLowerCase() + ').'; }
    if (facet === 'population') { const f = F.find(x => /population/i.test(x.k)); return '**' + c.name + '** has about **' + f.v + '** people. ' + f.n + '.'; }
    if (facet === 'work') { const f = F.find(x => /work/i.test(x.k)); return '**Part-time work in ' + c.name + ':** ' + f.v + '. ' + f.n + '. Most student visas allow part-time work during term and full-time in scheduled breaks.'; }
    if (facet === 'university') return '**Study in ' + c.name + ':** ' + c.unis.join(', ') + '. Known for ' + c.known.join(', ').toLowerCase() + '.';
    if (facet === 'weekend') return '**A weekend in ' + c.name + ':**\n' + c.end.map(e => '- ' + e[1] + ': ' + e[2]).join('\n');
    return '**' + c.name + '** (' + c.reo + ', ' + c.island + ' Island). ' + c.tag + '\n' + F.map(line).join('\n') + '\n- **Study at:** ' + c.unis.join(', ') + '\nOpen it in [Pick a city](#cities) to step inside.';
  }
  // a university: one of the eight (with campus and facts, from unis.js) or any provider from the directory
  // (name, type, location, quality rating and subjects only). No fees, scores, ranking positions or links.
  const topOf = u => ((window.TCUnis && window.TCUnis.TOP) || []).find(t => t.name === u.name) || null;
  const isUni = u => /universit/i.test(u.type || 'University');
  function uniAnswer(u) {
    const t = topOf(u);
    if (t) return '**' + t.name + '** (' + t.reo + '), ' + t.city + ', founded ' + t.est + '. ' + t.blurb +
      '\n- **Campus:** ' + t.campus + '\n- **Known for:** ' + t.known.join(', ') + '\n' + t.facts.slice(0, 2).map(f => '- ' + f).join('\n') +
      '\nShortlist it in [Universities](#unis); the shortlist goes straight into your counselling form.';
    const subj = String(u.programs || '').split(/,\s*/).filter(Boolean);
    return '**' + u.name + '** is ' + (/^[aeiou]/i.test(u.type || 'p') ? 'an ' : 'a ') + String(u.type || 'provider').toLowerCase() + ' in ' + (u.location || 'New Zealand') + '.' +
      (subj.length ? '\n- **Subjects:** ' + subj.join(', ') : '') + (u.assurance ? '\n- **Quality rating:** ' + u.assurance : '') +
      '\n- It can enrol international students (it has signed the Code of Practice for international learners).' +
      '\nThat is all this page holds about it. A counsellor can check its programmes, fees and entry requirements for you: [book a free counselling call](#consult).';
  }
  const UNI_FACETS = [
    ['campus', /\b(campus\w*|where is|where are|wheres|located|location|which city|address)\b/],
    ['stay', /\b(accommodation|hostels?|halls?( of residence)?|dorms?|dormitor\w*|on.campus housing|live on campus|student housing)\b/],
    ['scholar', /\b(scholarships?|bursar\w*|grants?|discounts?|financial aid)\b/],
    ['intake', /\b(intakes?|semesters?|trimesters?|deadlines?|start dates?|when (can|do|does|should|will) (i|classes|it|the course) (apply|join|start|begin))\b/],
    ['english', /\b(ielts|pte|toefl|duolingo|english (test|requirement\w*|proficiency|language))\b/],
    ['rent', /\b(rent|cost of living|cost to live|live there|living (costs?|expenses)|expenses)\b/],
    ['fees', /\b(fees?|tuition|cost of (the )?(course|degree|programm?e?|study\w*)|how (much|expensive))\b/],
    ['rank', /\b(rank\w*|qs|times higher|world ranking|reputation|prestig\w*|recogni[sz]ed|accredit\w*)\b/],
    ['est', /\b(founded|established|history|how old|oldest|old is)\b/],
    ['entry', /\b(entry|requirements?|eligib\w*|admissions?|criteria|apply|application|get in|get into)\b/],
    ['work', /\b(work|jobs?|part ?time|internships?|placements?|employ\w*|careers?)\b/],
    ['known', /\b(known for|famous|good for|strong (in|for)|best (for|at|in)|courses?|programm?e?s?|subjects?|degrees?|faculty|faculties|majors?|what can i study)\b/],
    ['life', /\b(student life|city|life (like|there)|clubs|safe|safety|weather|climate)\b/]
  ];
  const uniFacetOf = q => { const hit = UNI_FACETS.find(([, re]) => re.test(q)); return hit ? hit[0] : null; };
  function uniFacet(u, f) {
    const t = topOf(u), n = '**' + u.name + '**', uni = isUni(u);
    const city = t ? t.city : String(u.location || '').split(',')[0];
    const c = M.cities.map(x => x.c).find(x => city.indexOf(x.name) > -1);
    const call = ' Your counsellor checks it for your course on a [free counselling call](#consult).';
    switch (f) {
      case 'campus': return t ? n + ': ' + t.campus + '.' : n + ' is in ' + (u.location || 'New Zealand') + '. This page doesn’t list its campuses.' + call;
      case 'known': return t ? n + ' is known for ' + t.known.join(', ') + '.\n' + t.facts.map(x => '- ' + x).join('\n') + '\nThe right programme depends on your background and goals.' + call
        : (u.programs ? n + ' teaches subjects including ' + u.programs + ' (indicative, from the register).' : 'This page doesn’t list ' + n + '’s programmes.') + call;
      case 'est': return t ? n + ' was founded in ' + t.est + '.' + (t.facts.filter(x => /founded|oldest|roots|second-oldest/i.test(x)).map(x => ' ' + x + '.').join('')) : 'This page doesn’t hold ' + n + '’s history.' + call;
      case 'rank': return 'Rankings change every year, so I don’t quote positions. ' + (t ? t.facts.filter(x => /QS|largest|accreditation/i.test(x)).map(x => x + '. ').join('') : '') +
        (uni ? 'All eight New Zealand universities are quality-audited by the Academic Quality Agency (AQA), and New Zealand degrees are recognised worldwide.' : n + '’s quality rating from NZQA is: ' + (u.assurance || 'not listed here') + '.') + call;
      case 'fees': return 'Tuition at ' + n + ' depends on the programme and level, and this page doesn’t list fees, so I won’t quote a figure.' + call;
      case 'scholar': return (uni ? n + ', like New Zealand’s other universities, offers some scholarships for international students' : n + ' may offer scholarships for international students') + '; who qualifies, the amounts and the deadlines change each year.' + ' We help you find the ones you may be eligible for and apply.' + call;
      case 'intake': return 'Most programmes at New Zealand universities start in **Semester 1 (late February or early March)**, and many also in **Semester 2 (July)**. Start dates and application deadlines at ' + n + ' differ by programme, and not every programme takes a mid-year start.' + call;
      case 'english': return n + ' sets the English requirement for each programme. New Zealand universities commonly accept IELTS (Academic), TOEFL and PTE Academic, and some accept other evidence such as English-medium study. The minimum score depends on the course, so I won’t quote one.' + call;
      case 'entry': return 'You apply to ' + n + ' directly, usually online, for the programme you choose. Entry requirements are set for each programme: your Class 12 results for a bachelor’s, your degree for a master’s, plus English evidence. Your counsellor checks them for every course on your shortlist and prepares the application with you: [book a free counselling call](#consult).';
      case 'stay': return uni ? n + ', like New Zealand’s other universities, has student accommodation (halls of residence), popular with first-year and international students. Places are limited and fill early, so apply as soon as you have your offer. Your counsellor helps with accommodation after your offer.' : 'This page doesn’t hold accommodation details for ' + n + '.' + call;
      case 'rent': case 'life': if (c) return cityAnswer(c, f === 'rent' ? 'rent' : undefined); return 'This page doesn’t hold ' + (f === 'rent' ? 'living costs' : 'city details') + ' for ' + city + '.' + call;
      case 'work': return 'On a student visa you may be able to work up to **25 hours a week** while you study, and full-time in scheduled holidays, depending on your course and visa conditions.' + (t && /placements/.test(t.facts.join(' ')) ? ' ' + n + ' is known for degrees with industry placements.' : '') + ' After you graduate, a post-study work visa can follow: see [study to residence](#settle).';
    }
    return uniAnswer(u);
  }
  const uniSugg = u => sugg(['Where are the campuses of ' + u.name + '?', 'Does ' + u.name + ' offer scholarships?', 'Is there student accommodation at ' + u.name + '?', 'What are the entry requirements for ' + u.name + '?']);
  const FACETS = [['rent', /\b(rent|room|flat|accommodation|housing|hostel|stay)\b/], ['cost', /\b(cost|costs|expensive|cheap|afford|budget|price|living)\b/], ['weather', /\b(weather|climate|cold|warm|hot|rain|temperature|winter|summer)\b/],
    ['population', /\b(population|people|big|size|crowded)\b/], ['work', /\b(work|job|jobs|part ?time|earn)\b/], ['university', /\b(uni|unis|university|universities|study|college)\b/], ['weekend', /\b(weekend|fun|things to do|do there|visit|activities|beach)\b/]];
  const FACET_TOK = { rent: 'rent', cost: 'cost', weather: 'weather', population: 'population', work: 'work', university: 'university' };
  const facetOf = (q, qt) => { const hit = FACETS.find(([, re]) => re.test(q)); return hit ? hit[0] : (qt.map(t => FACET_TOK[t]).find(Boolean) || null); };
  const SMALL = [
    [/^(hi|hello|hey|hii+|kia ora|namaste|vanakkam|good (morning|afternoon|evening)|yo)\b[\s!.]*$/, () => 'Kia ora! Ask me about universities, cities, costs, work rights, loans, visas or the route to residence.'],
    [/\b(thanks|thank you|thx|cheers|great|awesome|perfect|helpful)\b/, () => 'You’re welcome! Anything else about New Zealand? When you’re ready, [book a free counselling call](#consult).'],
    [/^(bye|goodbye|see you|that'?s all)\b/, () => 'Ka kite anō, see you soon! ' + CONTACT],
    [/\b(who|what) are you\b|\bare you (a )?(bot|human|ai|real)\b|\bwhat can you do\b/, () => 'I’m **Tutee AI**, built from this page. I know its universities, cities, costs, steps, FAQ and the route to residence, and I answer instantly without sending your questions anywhere. For advice on your own profile, say **talk to a counsellor** and I’ll take your details for a callback.'],
    [/\b(phone|number|contact|email|e-mail|whatsapp|reach you|call you|address)\b/, () => 'You can reach Tutee Connect any of these ways:\n- **WhatsApp / call (Chennai):** +91 73583 64959\n- **Call (Dubai):** +971 55 379 9068\n- **Email:** info@tuteeconnect.com\n- **Offices:** 1st Floor, ALA Corner Complex, Virugambakkam, Chennai; Tutee Connect LLC FZ, Meydan Grandstand, Dubai\n[Book a free counselling call](#consult) and we’ll call you at the time you pick.'],
  ];
  // intakes: the page gives no dates, so say what's usual and hand over ("programs in January intake" is not about work hours)
  const MONTH = /\b(jan\w*|feb\w*|mar(?:ch)?|apr(?:il)?|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b(?:in|from|for|the) (may)\b/;
  const MONTHS = { jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', jun: 'June', jul: 'July', aug: 'August', sep: 'September', oct: 'October', nov: 'November', dec: 'December' };
  function intakeAnswer(q) {
    if (/\b(work\w*|jobs?|hours)\b/.test(q)) return null;
    const m = MONTH.exec(q), mon = m && MONTHS[(m[1] || m[2]).slice(0, 3)];
    const general = /\b(intakes?|intak\w*|in takes?|start dates?|semesters?)\b/.test(q);
    if (!(m ? general || /\b(start\w*|begin\w*|commenc\w*|batch|session|programmes?|programs?|courses?|admissions?|classes)\b/.test(q) : general)) return null;
    const usual = 'New Zealand universities have two main intakes: **Semester 1**, starting in **late February or early March** (the main one), and **Semester 2** in **July**.';
    let text;
    if (!mon) text = usual + ' Many programmes take students in both; some only in February. A few polytechnic and private-institution courses start at other times of year.';
    else if (/^(January|February|March)$/.test(mon)) text = (mon === 'January' ? 'There’s no January start at New Zealand universities: the first intake of the year is **Semester 1**, starting in **late February or early March**. ' : usual + ' ') +
      'A few polytechnic and private-institution courses start at other times, and which programmes open each intake changes every year, so I can’t give you a reliable list here.';
    else if (/^(June|July|August)$/.test(mon)) text = 'The mid-year intake is **Semester 2**, starting in **July**. Many programmes take students then, but not all: some only start in February. Which programmes open in July changes every year, so I can’t give you a reliable list here.';
    else text = usual + ' A **' + mon + '** start isn’t usual: a few polytechnic and private-institution courses run then, so check with a counsellor before you plan around it.';
    ctx = { city: null, uni: null, facet: null };
    return text + '\nA counsellor can check the current intakes and deadlines for your subject: [book a free counselling call](#consult).' + sugg(['What do I need to apply?', 'Request a callback']);
  }
  // "universities near the Sky Tower": the city the place is in, never a generic answer
  const NEAR = /\b(near|nearby|nearest|close to|closest to|close by|next to|walking distance|distance from)\b/;
  const LANDMARKS = [
    ['Auckland', /\b(sky ?tower|viaduct( harbou?r)?|queen street|ponsonby|mt eden|mount eden|maungawhau|harbou?r bridge|waiheke|devonport|parnell|newmarket|albany|auckland (airport|cbd|domain|museum|central))\b/],
    ['Wellington', /\b(te papa|beehive|parliament|cuba street|oriental bay|lambton quay|cable car|mt victoria|mount victoria|kelburn|zealandia|weta( workshop)?)\b/],
    ['Christchurch', /\b(hagley park|cathedral square|riccarton|port hills|new brighton|ilam|christchurch (airport|gondola|botanic gardens))\b/],
    ['Dunedin', /\b(octagon|baldwin street|larnach castle|otago peninsula|st clair|forsyth barr)\b/],
    ['Queenstown', /\b(lake wakatipu|remarkables|coronet peak|skyline( gondola)?|arrowtown|milford sound|fiordland|wanaka)\b/],
    ['Hamilton', /\b(hamilton gardens|hobbiton|matamata|waikato river|tauranga|mount maunganui|rotorua)\b/],
    ['Palmerston North', /\b(palmerston north|manawatu)\b/]
  ];
  function nearAnswer(q, unisHit, citiesHit) {
    if (!NEAR.test(q)) return null;
    const spot = LANDMARKS.find(l => l[1].test(q));
    if (!spot) {
      if (unisHit.length || citiesHit.length || /\b(rent|cost|costs|price|fees?|accommodation|housing|living)\b/.test(q) || !/\b(uni|unis|universit\w*|college\w*|institution\w*|campus\w*|study)\b/.test(q)) return null;
      ctx = { city: null, uni: null, facet: null };
      return 'I can match universities to a New Zealand city, or to a well-known place in one (the Sky Tower, Te Papa or Hagley Park, say), but I didn’t recognise the place in your question, and I can’t work out distances. Tell me the city, or ask a counsellor: [book a free counselling call](#consult).' + sugg(['Universities in Auckland', 'Universities in Wellington']);
    }
    const lead = 'That’s in **' + spot[0] + '**. This goes by city, not travel time; a counsellor can help with commutes from where you’d live.\n';
    const c = M.cities.map(x => x.c).find(x => x.name === spot[0]);
    if (c) { ctx = { city: c, uni: null, facet: 'university' }; return lead + cityAnswer(c, 'university') + sugg(['How much is rent in ' + c.name + '?', 'Tell me about ' + c.name]); }
    const U = M.unis.map(x => x.u).filter(u => u.city.indexOf(spot[0]) > -1);
    ctx = { city: null, uni: U.length === 1 ? U[0] : null, facet: null };
    return lead + '**Study in or near ' + spot[0] + ':** ' + (U.length ? U.map(u => u.name).join(', ') : 'see the [Universities](#unis) section') + '.' + sugg(U.slice(0, 2).map(u => 'Tell me about ' + u.name));
  }
  // Questions this site can't answer reliably (distances and travel times, whether your marks are enough, what can
  // still start next month, the best area to live, a university's exact English score): say so, then hand over.
  var NEEDS_COUNSELLOR = [
    [/\b(how far|distance (from|to|between)|how long (does it|will it|would it|to) (take|get|reach|travel|commute)|commut\w*|by (train|bus|metro|tram|mrt|subway|tube|car)|travel time|minutes? (from|to|away)|km (from|to|away)|close to the city|far from)\b/, null,
      'I can\'t give reliable distances or travel times: they depend on the exact campus and where you\'d live.'],
    [/\b(next|this|coming) (month|week|few weeks)\b|\bstart\w* (soon|immediately|asap|right away)\b|\b(still|currently) (open|accepting)\b/, null,
      'Which courses can still take you that soon depends on each university\'s current deadlines and places, which change all the time.'],
    [/\b\d{2}(\.\d+)? ?(%|percent)|\b(percentage|marks|cgpa|gpa|backlogs?|gap year|study gap|year gap|education gap)\b/, /\b(admission|admit|get in|get into|eligib\w*|accept\w*|apply|qualify|enough|chances?|possible)\b/,
      'Whether your marks are enough depends on the university, the course and the rest of your profile, so I won\'t guess.'],
    [/\b(best|good|safe|safest|cheap\w*|nice) (area|areas|suburbs?|neighbou?rhoods?|localit(y|ies)|places?|part of (the )?(city|town)) (to (live|stay)|for students?)\b|\bwhere (should|can|do) (i|students) (live|stay)\b/, null,
      'The best area to live depends on your campus, budget and lifestyle, and this site doesn\'t compare neighbourhoods.'],
    [/\b(ielts|pte|toefl|duolingo)\b.*\b(scores?|bands?|minimum)\b|\b(scores?|bands?|minimum)\b.*\b(ielts|pte|toefl|duolingo)\b/, null,
      'Each university sets its own minimum English test score, and it varies by course, so I won\'t quote one.'],
    [/\b(distance learning|distance education|online (course|courses|degree|degrees|study|studies|classes|programmes?|programs?)|study online|studying online|remote study)\b/, null,
      'A student visa is for full-time study on campus, and this site does not cover online or distance courses.']
  ];
  // "How do I apply?" (to a university, not for a visa, loan or scholarship): how applying works here, then hand over
  var APPLY_Q = /\b(how (do|can|should|would|will) (i|we|one|students?) apply|how to apply|application process|admission process|applying (to|for) (a |an |the )?(universit\w*|unis?|college\w*|courses?|programm?e?s?|admissions?)|apply (to|for) (a |an |the )?(universit\w*|unis?|college\w*|courses?|programm?e?s?|admissions?))\b/;
  function asksHowToApply(q) { return APPLY_Q.test(q) && !/\b(visa|pass|permit|stamp|loans?|scholarships?|bursar\w*|grants?|jobs?|work)\b/.test(q); }
  // "Can you guarantee…?" / "Will I definitely…?": no one can promise these outcomes, so the answer says so plainly
  // before any topic answer (a topic answer that opens "Yes." would read as a promise).
  function guaranteeReply(text) {
    var s = String(text || '').toLowerCase();
    if (!/\b(guarantee[ds]?|guaranteeing|assured?|promise[ds]?)\b|100 ?%|\b(definitely|surely|certainly)\s+(get|be|receive|land|obtain|secure|win)\b|\bfor sure\b/.test(s)) return null;
    var topics = [
      [/\b(settle\w*|pr|permanent(ly)?|citizenship|resident|residence|long.term resid\w*)\b/, 'residence', 'Residence depends on your job, your skills and the rules at the time you apply, and Immigration New Zealand decides each application.'],
      [/\b(scholarships?|bursar(y|ies)|grants?|stipends?)\b/, 'a scholarship', 'Scholarships are awarded by universities and funding bodies, usually in competition with other applicants.'],
      [/\b(jobs?|employment|employed|placements?|hired|career)\b/, 'a job', 'Jobs depend on employers, your skills and the job market; we help with your CV and job search.'],
      [/\b(admissions?|admit\w*|offers?|get into|accepted|acceptance|seats?|a place)\b/, 'admission', 'Each university decides who it admits.'],
      [/\b(loans?)\b/, 'a loan', 'Each lender makes its own decision on a loan.'],
      [/\b(visas?|permits?|approv\w*|refus\w*)\b/, 'a visa', 'Immigration New Zealand decides every visa application, not Tutee Connect or any other agent.']
    ];
    for (var i = 0; i < topics.length; i++) if (topics[i][0].test(s))
      return 'No, and no one can honestly guarantee ' + topics[i][1] + '. ' + topics[i][2] + ' What we do is help you prepare a strong, honest application, and your counsellor tells you plainly where your profile stands on your free call.';
    return null;
  }
  // "Which universities do you partner with?" ("partner" is not a spouse here) and review questions
  // (the student postcards on the page are illustrative placeholders, so they are never quoted).
  function extraReply(text) {
    var s = String(text || '').toLowerCase();
    // Phase 14: questions this page cannot answer (our own numbers, how details are shared, what our services cost,
    // off-topic): say so and route to a counsellor, never a guessed passage. No figures, no new claims.
    if ((/\bhow many\b/.test(s) && /\b(you|you've|tutee)\b/.test(s) && /\b(students?|people|clients|applicants|families|placed|helped|sent|guided|counsell?ed|admissions?|visas?)\b/.test(s) && !/\b(family|spouse|partner|wife|husband|children|kids|dependants?|bring|come with|join)\b/.test(s)) || (/\b(success|approval|acceptance|placement|visa|admission) (rates?|ratios?|percentages?|records?)\b|\btrack record\b/.test(s) && /\b(your|you|tutee)\b/.test(s) && !/\b(universit\w*|colleges?|institut\w*|schools?)\b/.test(s)))
      return 'We don\'t publish student numbers or success rates on this page, so I won\'t guess at them. A counsellor can tell you honestly how we work and what to expect for your profile on a [free counselling call](#consult).';
    if ((/\b(share|sell|pass|give|send|disclose|hand|forward)\w*\b[^?.]*\b(my|our)\s+(personal\s+)?(details|data|information|info|number|phone|email|contacts?)\b/.test(s) && /\b(you|tutee|your (company|team))\b/.test(s) && !/\b(counsell?or|advisor|adviser|callback|call back|call me|contact me)\b/.test(s)) || /\b(privacy (policy|notice)|personal data|data protection|gdpr|dpdp)\b/.test(s) || (/\bprivacy\b/.test(s) && /\b(my|data|details|information)\b/.test(s)) || /\bmy (personal )?(data|details|information|info)\b[^?.]*\b(safe|secure|protected|stored|kept|used|deleted|delete|removed?)\b/.test(s) || /\bwho (sees|can see|gets|will see|has access to) my\b/.test(s))
      return 'I can\'t answer questions about how your details are used or shared reliably from this page, so I won\'t guess. Please ask a counsellor directly: [book a free counselling call](#consult) or WhatsApp **+91 73583 64959**.';
    if (/\bhow much (do|does|will|would) (you|you guys|tutee( connect)?|your (company|team|service|agency|consultancy)) (charge|cost|take)\b|\bdo you (charge|take (a )?(fee|commission))\b|\b(service|consultancy|consultant|agency|agent|counsell?ing|counsell?or) (fees?|charges?)\b/.test(s) || (/\b(your|tutee( connect)?'?s?) (fees?|charges?|price|pricing)\b/.test(s) && !/\b(tuition|visa|universit\w*|colleges?|living|rent|accommodation|insurance|application)\b/.test(s)))
      return 'This page doesn\'t list what our services cost, so I won\'t guess. Your first [counselling call](#consult) is free, and a counsellor can explain any costs then. If you meant the cost of studying in New Zealand, ask me about tuition or living costs.';
    if (/\b(mars|jupiter|saturn|venus|pluto|outer space|world cup|ipl|premier league|bitcoin|crypto|cryptocurrenc\w*|stock market|share price|lottery|horoscope|recipes?|tell me a joke)\b/.test(s))
      return 'That\'s outside what I can help with. I answer questions about studying in New Zealand, such as universities, courses, visas and working while you study, using what\'s on this page.';
    if (/\b(talk|speak|chat) (to|with) (a |an |some )?(human|person|real person|someone|somebody)\b|\b(real|actual) (human|person)\b/.test(s))
      return 'Happy to put you in touch. [Book a free counselling call](#consult) and a counsellor calls you in the slot you choose, or WhatsApp **+91 73583 64959**.';
    if (/\b(partner\w*|tie.?ups?|affiliat\w*|official representatives?|collaborat\w*)\b/.test(s) && /\b(universit\w*|colleges?|institutions?|institutes?|schools?|polytechnics?|unis?|providers?)\b/.test(s) && !/\b(spouse|wife|husband|children|kids|family|visa)\b/.test(s))
      return 'Our directory lists New Zealand education providers that have signed the Pastoral Care Code for international learners. Being on it doesn\'t mean a provider is a Tutee Connect partner. Your counsellor can answer questions about any university on your shortlist.';
    if (/\b(reviews?|testimonials?|ratings?|feedback|scam|legit\w*)\b|students say|\b(do|did) (your )?(past |former )?students (say|think)\b/.test(s))
      return 'We\'re still collecting verified reviews from our students, and we\'ll only publish ones they\'ve agreed to share. Until then, the fastest way to judge us is a [free counselling call](#consult): a counsellor will tell you honestly what New Zealand would take for your profile.';
    return null;
  }
  function needsCounsellor(q) {
    for (var i = 0; i < NEEDS_COUNSELLOR.length; i++) { var n = NEEDS_COUNSELLOR[i]; if (n[0].test(q) && (!n[1] || n[1].test(q))) return n[2]; }
    return '';
  }
  // "universities near <a place we know>" is answered by its city instead
  function namesLandmark(q) { return /\b(near|nearby|nearest|close to|closest to|next to|around|walking distance)\b/.test(q) && LANDMARKS.some(function (l) { return l.some(function (x) { return x instanceof RegExp && x.test(q); }); }); }

  const sugg = list => list.length ? '\nYou could also ask:\n' + list.map(s => '[[' + s + ']]').join('\n') : '';
  let ctx = { city: null, uni: null, facet: null };   // what the conversation is about, for follow-ups

  function answer(raw) {
    M = M || build();
    const q = fold(raw).replace(/[?!.]+$/g, '').trim();
    for (const [re, fn] of SMALL) if (re.test(q)) return fn();
    const guar = guaranteeReply(raw);
    if (guar) { ctx = { city: null, uni: null, facet: null }; return guar + ' [Book a free counselling call](#consult).' + sugg(['Request a callback']); }
    const extra = extraReply(raw);
    if (extra) { ctx = { city: null, uni: null, facet: null }; return extra + sugg(['Request a callback']); }
    // "Can my family join me?": the FAQ answer on family, with its official link
    if (/\b(family|spouse|partner|wife|husband|children|kids|dependants?)\b/.test(q) && /\b(join|come|bring|accompany|with me)\b/.test(q)) {
      const F = M.docs.find(x => /family come with me/i.test(x.title));
      if (F) { ctx = { city: null, uni: null, facet: null }; return F.answer + sugg(['Can my partner work in New Zealand?', 'Request a callback']); }
    }
    // entities and facet
    const unisHit = M.unis.filter(x => x.re.test(q)).map(x => x.u);
    const qNoUni = unisHit.reduce((s, u) => s.replace(new RegExp(fold(u.name), 'g'), ' '), q);
    const citiesHit = M.cities.filter(x => x.re.test(unisHit.length ? qNoUni : q)).map(x => x.c);
    const qt = toks(raw).map(fix);
    // the university this question is about: named in it, or (for a follow-up such as "does it have halls?") the one
    // the chat is about, e.g. after "Ask Tutee AI about it" in a university's details
    const uFacet = uniFacetOf(ctx.uni ? qNoUni.split(fold(ctx.uni.name)).join(' ') : qNoUni);   // the name itself never counts as the question
    const named = ctx.uni && q.indexOf(fold(ctx.uni.name)) > -1;
    const pronoun = /\b(it|its|there|they|their|this (uni|university|one|college|institute)|that (uni|university|one)|the (uni|university|campus|college))\b/.test(q);
    // the chat's own provider, named in full, wins over a short name inside it ("Waikato Institute of Technology" is not
    // the University of Waikato)
    let uniQ = named ? ctx.uni : unisHit.length === 1 ? unisHit[0] : null;
    if (!unisHit.length && !citiesHit.length && ctx.uni && (named || (uFacet && (pronoun || !['work', 'rent', 'life'].includes(uFacet))))) uniQ = ctx.uni;
    // course fees aren't on this page: never let a fee question land on a university's profile
    const unsure = !namesLandmark(q) && (needsCounsellor(q) || (/\b(fees?|tuition)\b/.test(q) && !citiesHit.length && !uniQ ? 'Tuition depends on the university and the programme, and this page doesn’t list course fees, so I won’t quote a figure.' : ''));
    if (unsure) { ctx = { city: null, uni: null, facet: null }; return unsure + ' A counsellor can check it for you: [book a free counselling call](#consult), or WhatsApp **+91 73583 64959**.' + sugg(['What does it cost to live in Auckland?', 'Request a callback']); }
    if (uniQ) {
      // "Tell me about Otago" or just the name: the profile. A specific question: its answer. Anything else (a visa
      // question that mentions a university, say) goes on to the topic answers below.
      const rest = toks(raw).filter(x => !toks(uniQ.name + ' ' + (uniQ.reo || '') + ' tell about info information detail details more overview know').includes(x) && !/^(uoa|aut|vuw|uc|vic|otago|massey|lincoln|waikato|canterbury|victoria)$/.test(x));
      if (uFacet || !rest.length) {
        ctx = { city: null, uni: uniQ, facet: null };
        return (uFacet ? uniFacet(uniQ, uFacet) : uniAnswer(uniQ)) + uniSugg(uniQ);
      }
    }
    if (asksHowToApply(q)) {
      ctx = { city: null, uni: null, facet: null };
      const S = (window.__TC_DATA || {}).steps || [];
      return 'You apply to each New Zealand university directly, usually online, for the programme you choose.' + (S.length ? ' With us it runs in these steps:\n' + S.map(s => '- **' + s[2] + '**').join('\n') : '') +
        '\nEntry requirements and deadlines differ by university and programme, so your counsellor checks them for your shortlist: [book a free counselling call](#consult).' + sugg(['Do I need IELTS, PTE or TOEFL?', 'Request a callback']);
    }
    // "how do I get / apply for a student visa?" is the visa process, not a partner's or a work visa
    if (/\b(visa|visas)\b/.test(q) && /\b(apply|applying|get|process|how)\b/.test(q) && !/\b(partner|family|spouse|wife|husband|child|children|kids|work|post.?study|residence|pr)\b/.test(q)) {
      const V = M.docs.find(x => /need for a new zealand student visa/i.test(x.title)) || M.docs.find(x => /visa process/i.test(x.title));   // the FAQ answer (official link) first
      if (V) { ctx = { city: null, uni: null, facet: null }; return V.answer + sugg(['Can I work while I study?', 'Request a callback']); }
    }
    const byMonth = intakeAnswer(q);
    if (byMonth) return byMonth;
    const byPlace = nearAnswer(q, unisHit, citiesHit);
    if (byPlace) return byPlace;
    let facet = facetOf(q, qt);
    // rent with no city named or being discussed: no figures (the page quotes none), a counsellor's budget instead.
    // "How much does it cost to study…" goes on to the FAQ answer on costs.
    if (facet === 'rent' && !citiesHit.length && !unisHit.length && !ctx.city) {
      ctx = { city: null, uni: null, facet };
      return 'Rent depends on the city, the suburb, the room and the time of year, and this page doesn’t quote rent figures. Tuition depends on your course and university. A counsellor builds your full budget, in INR or AED, on the [free call](#consult).' + sugg(['How much does it cost to study in New Zealand?', 'Request a callback']);
    }
    // a follow-up is "and the weather?", "what about Dunedin?": nothing in it but a place and/or a topic word
    const cityWords = new Set(M.cities.flatMap(x => toks(x.c.name + ' ' + x.c.reo + ' ' + x.c.id)));
    const followUp = /^(and|what about|how about|same for|there)\b/.test(q) || qt.every(t => FACET_TOK[t] || cityWords.has(t) || ['live', 'living', 'like', 'there', 'city'].includes(t));
    // "which university is best for IT / medicine / business…"
    const course = toks(raw).filter(t => !['university', 'best', 'good', 'top', 'which', 'course', 'study', 'recommend', 'suggest', 'choose'].includes(t));
    if (!unisHit.length && /\b(best|good|top|which|recommend|suggest|strong)\b/.test(q) && /\b(uni|unis|university|universities|for|course|study)\b/.test(q) && course.length) {
      const U = M.unis.map(x => x.u).filter(u => toks(u.known.join(' ') + ' ' + u.blurb).some(t => course.includes(t)));
      if (U.length) { ctx = { city: null, uni: null, facet: null }; return 'From this page, these universities are known for that area:\n' + U.map(u => '- **' + u.name + '** (' + u.city + '): ' + u.known.join(', ')).join('\n') + '\nThe best fit depends on your marks, budget and goals, which a counsellor maps on the [free call](#consult).' + sugg(U.slice(0, 2).map(u => 'Tell me about ' + u.name)); }
    }
    if (citiesHit.length >= 2) {   // comparison
      const f = facet || 'rent';
      ctx = { city: citiesHit[citiesHit.length - 1], uni: null, facet: f };
      return '**' + citiesHit.map(c => c.name).join(' vs ') + ':**\n' + citiesHit.map(c => { const F = c.facts; const w = F.find(x => /climate/i.test(x[1])); return '- **' + c.name + ':** ' + w[2] + ' (' + w[3].toLowerCase() + '), study at ' + c.unis[0]; }).join('\n') + '\nCompare them side by side in [Pick a city](#cities).';
    }
    if (unisHit.length === 1 && !(facet && facet !== 'university' && citiesHit.length) && !/\bvisas?\b/.test(q)) { ctx = { city: null, uni: unisHit[0], facet: null }; return uniAnswer(unisHit[0]) + uniSugg(unisHit[0]); }
    if (unisHit.length > 1) { ctx = { city: null, uni: null, facet: null }; return unisHit.map(u => '- **' + u.name + '** (' + u.city + '): known for ' + u.known.join(', ')).join('\n') + '\nTap any of them in [Universities](#unis) for details.'; }
    // follow-ups: "what about Dunedin?" (keep the topic) / "and the rent?" (keep the city)
    let city = citiesHit[0] || null;
    if (!city && followUp && facet && ctx.city) city = ctx.city;
    if (city && !facet && followUp && ctx.facet) facet = ctx.facet;
    if (city) { ctx = { city, uni: null, facet }; const others = M.cities.map(x => x.c).filter(c => c !== city).slice(0, 4); return cityAnswer(city, facet) + sugg([facet === 'rent' ? 'What is the weather like there?' : 'How much is rent in ' + city.name + '?', 'Compare ' + city.name + ' and ' + others.find(c => c.island === city.island && c !== city || c).name]); }
    // everything else: rank the page's passages
    if (/\b(which|what|list|name)\b.*\b(banks?|lenders?|loan partners?|nbfcs?)\b/.test(q)) { const L = M.docs.find(x => /lenders/.test(x.title)); if (L) return L.answer; }
    if (!qt.length) return 'Could you tell me a little more? For example: “How much is rent in Dunedin?” or “Can my family come with me?”';
    const k1 = 1.2, b = .75;
    // FAQ answers are written as answers, so they win ties against descriptive passages
    const visaQ = /\bvisas?\b/.test(q);   // a visa question is never answered with a university's profile
    const scored = M.docs.filter(x => !(visaQ && (x.uni || !x.tf.visa))).map(x => { let s = 0, hit = 0; qt.forEach(t => { const f = x.tf[t]; if (f) { hit++; s += M.idf(t) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * x.t.length / M.avg)); } }); if (x.ask === x.title && /\?$/.test(x.title)) s *= 1.3; return { x, s, cover: hit / qt.length }; })
      .filter(r => r.s > 0).sort((a, z) => z.s - a.s);
    const top = scored[0];
    // a question about something this page never mentions ("capital of France") is not forced onto a weak match
    const unknown = qt.filter(t => t.length >= 4 && !M.df[t]).length;
    if (top && top.s > 1.2 && top.cover >= (unknown ? .67 : .34)) {
      ctx = { city: top.x.city || null, uni: top.x.uni || null, facet: null };
      const more = scored.slice(1).filter(r => r.s > top.s * .45 && r.x.ask && r.x.ask !== top.x.ask).slice(0, 2).map(r => r.x.ask);
      return top.x.answer + sugg(more);
    }
    const near = scored.slice(0, 3).map(r => r.x.ask).filter(Boolean);
    return 'I couldn’t find that on this page, so a counsellor is the best person to answer it: [book a free counselling call](#consult), or WhatsApp **+91 73583 64959**.' + (near.length ? sugg(near) : sugg(['Can I work while I study?', 'What is the route to residence?']));
  }

  /* ---------- ask ---------- */
  /* ---------- lead capture in the chat (as on the Finland page) ----------
     "Talk to a counsellor", "call me", "book a call"… asks for name, phone and email, then sends them to this
     site's /api/enquiry, which adds them to the New Zealand Leads sheet and emails the team. Nothing is sent
     unless the student types their details; "cancel" stops it at any point. */
  const LEAD_RE = /^(request a (call ?back|callback)|evaluate my profile|talk to a counsell?or|book a (free )?(consultation|call|counselling call)|call me( back)?|i want to (talk|speak) to (a|someone|someone from your team|a counsell?or))\b|\b(talk|speak) to (a |an )?(human|person|counsell?or|someone|agent)\b|\bcall ?back\b/i;
  const LEAD_EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
  let stage = 'idle', lead = { name: '', phone: '', email: '' };
  // analytics (through analytics.js): only that a chat callback went through and its lead id, never the details typed
  const track = (event, params) => { if (window.tcTrack) window.tcTrack(event, Object.assign({ form_location: 'Tutee AI chat' }, params)); };
  function submitLead() {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
    return fetch('/api/enquiry', {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        subject: 'New Lead from Chatbot!', from_name: 'Tutee AI Counsellor',
        name: lead.name, phone: lead.phone, email: lead.email,
        destination: 'Chatbot General Inquiry', form_location: 'Tutee AI chat', page: location.host + location.pathname
      })
    }).then(r => r.json().catch(() => ({ success: false }))).finally(() => clearTimeout(t));
  }
  // returns the reply (or a promise of it) while the details flow is running, otherwise null
  function leadStep(q) {
    if (stage !== 'idle' && /^(cancel|stop|no thanks|never ?mind|skip)\b/i.test(q)) { stage = 'idle'; return 'No problem, I’ve stopped. What else would you like to know?'; }
    if (stage !== 'idle' && /\?$/.test(q)) stage = 'idle';             // a question mid-flow: answer it instead
    if (stage === 'name') {
      // the same name rules as the counselling form (checks.js), so the server accepts what the chat collects
      const bad = window.TCChecks ? window.TCChecks.nameIssue(q) : (q.replace(/[^A-Za-z\u00C0-\u024F]/g, '').length < 2 ? 'x' : '');
      if (bad) return 'That doesn\u2019t look like a full name. Could you type your **full name**, using letters only? (Or type *cancel*.)';
      lead.name = q.trim().replace(/\s+/g, ' ').slice(0, 80); stage = 'phone';
      return 'Thanks ' + q.split(/\s+/)[0] + '! What’s the best **phone number** to reach you on? Please include the country code, e.g. +91 98765 43210.';
    }
    if (stage === 'phone') {
      const d = q.replace(/\D/g, '');
      const n = d.slice(-10).replace(/^0+/, '');
      const fake = n.length >= 6 && (/^(\d)\1+$/.test(n) || '01234567890123456789'.includes(n) || '98765432109876543210'.includes(n) || /^(\d{2,3})\1{2,}$/.test(n));   // 9999999999, 1234567890…
      if (d.length < 7 || d.length > 15 || fake) return 'That doesn’t look like a real phone number. Please enter it with the country code, e.g. +91 98401 23456, or type *cancel*.';
      lead.phone = q.slice(0, 40); stage = 'email';
      return 'Got it. Lastly, what’s your **email address**?';
    }
    if (stage === 'email') {
      if (!LEAD_EMAIL_RE.test(q)) return 'That doesn’t look like a valid email address. Could you check it, or type *cancel*?';
      lead.email = q.slice(0, 200); stage = 'idle';
      return submitLead().then(res => res && res.success
        ? (track('chat_lead', { lead_id: res.lead_id || '' }), '✅ **Done!** A counsellor will contact you within one working day.\n\nAnything else I can help with in the meantime?')
        : 'Sorry, that didn’t go through. Please use the [counselling form](#consult) or WhatsApp us on **+91 73583 64959**.')
        .catch(() => 'Network error while sending. Please use the [counselling form](#consult) or WhatsApp us on **+91 73583 64959**.');
    }
    if (LEAD_RE.test(q.trim())) {
      stage = 'name'; lead = { name: '', phone: '', email: '' };
      return 'Happy to set that up. A counsellor reviews your profile personally and replies within **one working day**.\n\nWhat’s your **full name**? (Type *cancel* any time to stop.)';
    }
    return null;
  }

  let busy = false;
  async function ask(q) {
    q = q.trim(); if (!q || busy) return;
    busy = true; chips.hidden = true; input.value = ''; autosize();
    history.push({ role: 'user', content: q }); persist(); bubble('user', q);
    const typing = bubble('bot', ''); typing.classList.add('is-typing'); typing.innerHTML = '<span></span><span></span><span></span>';
    await new Promise(r => setTimeout(r, 450 + Math.random() * 350));   // a short "typing" beat so replies don't feel abrupt
    let reply; try { reply = leadStep(q); if (reply === null) reply = answer(q); else reply = await reply; } catch (e) { reply = 'Sorry, I tripped over that one. ' + CONTACT; }
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
  $('.tai__reset', root).addEventListener('click', () => { history = []; stage = 'idle'; persist(); paint(); input.focus(); });
  chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; };
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  msgs.addEventListener('click', e => {
    const sg = e.target.closest('[data-ask]'); if (sg) { ask(sg.dataset.ask); return; }
    const a = e.target.closest('[data-ai-jump]'); if (!a) return;
    e.preventDefault(); if (matchMedia('(max-width: 700px)').matches) setOpen(false);
    const h = a.getAttribute('href');
    if (!document.querySelector(h)) { location.href = './index.html' + h; return; }   // a section of the main page, from the directory
    if (window.__goTo) window.__goTo(h); else location.hash = h;
  });
  // opens the chat on one university (from its details pop-up): later questions such as "does it have halls?" are about it
  function askAbout(u) {
    if (!u || !u.name) return;
    setOpen(true); stage = 'idle';
    ctx = { city: null, uni: u, facet: null };
    ask('Tell me about ' + u.name);
  }
  window.TCAI = { ask, answer, askAbout, open: () => setOpen(true) };   // answer(q): the reply text without the chat window, for checks
})();
