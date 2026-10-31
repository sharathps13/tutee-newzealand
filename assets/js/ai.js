/* Tutee AI: the page's assistant (bottom-left). Runs entirely in the browser: it answers from the page's own
   FAQ, reasons, cities, universities, steps and residence stages. No API, no key, nothing sent anywhere. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'tc_ai_chat';
  const WELCOME = 'Kia ora! I’m **Tutee AI**. Ask me anything about studying in New Zealand: universities, cities, costs, work rights, visas or the route to residence.';
  const CHIPS = ['Request a callback', 'Which university is best for IT?', 'Can I work while I study?', 'How can I get PR in New Zealand?', 'What does it cost to live in Auckland?', 'Can my family come with me?'];

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

  // minimal, safe markdown: **bold**, [text](#anchor | page.html | https://), "- " lists, paragraphs
  function md(text) {
    const inline = s => esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((#[\w-]+|[\w-]+\.html(?:#[\w-]+)?|https:\/\/[^\s)]+)\)/g, (m, t, h) => '<a href="' + h + '"' + (/^https:/.test(h) || /\.html/.test(h) ? ' target="_blank" rel="noopener"' : ' data-ai-jump') + '>' + t + '</a>');
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
     On first use it reads the page (FAQ, 10 reasons, cities, universities, steps, residence stages, services, loan
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
    (d.reasons || []).forEach(r => add(strip(r[0]), r[1] + ' ' + r[2] + ' ' + r[4], '**' + strip(r[0]) + '.** ' + r[2] + '\nSee [10 reasons to study in New Zealand](#why).', 'Tell me more: ' + strip(r[0]).toLowerCase()));
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
    if (facet === 'rent' || facet === 'cost') { const f = F.find(x => /rent/i.test(x.k)); return '**Living in ' + c.name + '.** Room rent is about **' + f.v + '** (' + f.n.toLowerCase() + ').' + (facet === 'cost' ? ' Tuition depends on your course and university; a counsellor builds your full budget on the free call.' : '') + '\nSee [' + c.name + ' in Pick a city](#cities).'; }
    if (facet === 'weather') { const f = F.find(x => /climate/i.test(x.k)); return '**' + c.name + ' weather:** ' + f.v + ' (' + f.n.toLowerCase() + ').'; }
    if (facet === 'population') { const f = F.find(x => /population/i.test(x.k)); return '**' + c.name + '** has about **' + f.v + '** people. ' + f.n + '.'; }
    if (facet === 'work') { const f = F.find(x => /work/i.test(x.k)); return '**Part-time work in ' + c.name + ':** ' + f.v + '. ' + f.n + '. Most student visas allow part-time work during term and full-time in scheduled breaks.'; }
    if (facet === 'university') return '**Study in ' + c.name + ':** ' + c.unis.join(', ') + '. Known for ' + c.known.join(', ').toLowerCase() + '.';
    if (facet === 'weekend') return '**A weekend in ' + c.name + ':**\n' + c.end.map(e => '- ' + e[1] + ': ' + e[2]).join('\n');
    return '**' + c.name + '** (' + c.reo + ', ' + c.island + ' Island). ' + c.tag + '\n' + F.map(line).join('\n') + '\n- **Study at:** ' + c.unis.join(', ') + '\nOpen it in [Pick a city](#cities) to step inside.';
  }
  function uniAnswer(u) {
    return '**' + u.name + '** (' + u.reo + '), ' + u.city + ', founded ' + u.est + '. ' + u.blurb + '\n- **Known for:** ' + u.known.join(', ') + '\n- [Official website](' + u.web + ')\nYou can shortlist it in [Universities](#unis), and the shortlist goes straight into your counselling form.';
  }
  const FACETS = [['rent', /\b(rent|room|flat|accommodation|housing|hostel|stay)\b/], ['cost', /\b(cost|costs|expensive|cheap|afford|budget|price|living)\b/], ['weather', /\b(weather|climate|cold|warm|hot|rain|temperature|winter|summer)\b/],
    ['population', /\b(population|people|big|size|crowded)\b/], ['work', /\b(work|job|jobs|part ?time|earn)\b/], ['university', /\b(uni|unis|university|universities|study|college)\b/], ['weekend', /\b(weekend|fun|things to do|do there|visit|activities|beach)\b/]];
  const FACET_TOK = { rent: 'rent', cost: 'cost', weather: 'weather', population: 'population', work: 'work', university: 'university' };
  const facetOf = (q, qt) => { const hit = FACETS.find(([, re]) => re.test(q)); return hit ? hit[0] : (qt.map(t => FACET_TOK[t]).find(Boolean) || null); };
  const SMALL = [
    [/^(hi|hello|hey|hii+|kia ora|namaste|vanakkam|good (morning|afternoon|evening)|yo)\b[\s!.]*$/, () => 'Kia ora! Ask me about universities, cities, costs, work rights, loans, visas or the route to residence.'],
    [/\b(thanks|thank you|thx|cheers|great|awesome|perfect|helpful)\b/, () => 'You’re welcome! Anything else about New Zealand? When you’re ready, [book a free counselling call](#consult).'],
    [/^(bye|goodbye|see you|that'?s all)\b/, () => 'Ka kite anō, see you soon! ' + CONTACT],
    [/\b(who|what) are you\b|\bare you (a )?(bot|human|ai|real)\b|\bwhat can you do\b/, () => 'I’m **Tutee AI**, built from this page. I know its universities, cities, costs, steps, FAQ and the route to residence, and I answer instantly without sending your questions anywhere. For advice on your own profile, say **talk to a counsellor** and I’ll take your details for a callback.'],
    [/\b(phone|number|contact|email|e-mail|whatsapp|reach you|call you|address)\b/, () => 'You can reach Tutee Connect any of these ways:\n- **WhatsApp / call:** +91 73583 64959\n- **Email:** info@tuteeconnect.com\n- **Offices:** Chennai and Dubai\n[Book a free counselling call](#consult) and we’ll call you at the time you pick.'],
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
    // entities and facet
    const unisHit = M.unis.filter(x => x.re.test(q)).map(x => x.u);
    const qNoUni = unisHit.reduce((s, u) => s.replace(new RegExp(fold(u.name), 'g'), ' '), q);
    const citiesHit = M.cities.filter(x => x.re.test(unisHit.length ? qNoUni : q)).map(x => x.c);
    const qt = toks(raw).map(fix);
    // course fees aren't on this page: never let a fee question land on a university's profile
    const unsure = !namesLandmark(q) && (needsCounsellor(q) || (/\b(fees?|tuition)\b/.test(q) && !citiesHit.length ? 'Tuition depends on the university and the programme, and this page doesn’t list course fees, so I won’t quote a figure.' : ''));
    if (unsure) { ctx = { city: null, uni: null, facet: null }; return unsure + ' A counsellor can check it for you: [book a free counselling call](#consult), or WhatsApp **+91 73583 64959**.' + sugg(['What does it cost to live in Auckland?', 'Request a callback']); }
    if (asksHowToApply(q)) {
      ctx = { city: null, uni: null, facet: null };
      const S = (window.__TC_DATA || {}).steps || [];
      return 'You apply to each New Zealand university directly, usually online, for the programme you choose.' + (S.length ? ' With us it runs in these steps:\n' + S.map(s => '- **' + s[2] + '**').join('\n') : '') +
        '\nEntry requirements and deadlines differ by university and programme, so your counsellor checks them for your shortlist: [book a free counselling call](#consult).' + sugg(['Do I need IELTS, PTE or TOEFL?', 'Request a callback']);
    }
    // "how do I get / apply for a student visa?" is the visa process, not a partner's or a work visa
    if (/\b(visa|visas)\b/.test(q) && /\b(apply|applying|get|process|how)\b/.test(q) && !/\b(partner|family|spouse|wife|husband|child|children|kids|work|post.?study|residence|pr)\b/.test(q)) {
      const V = M.docs.find(x => /visa process/i.test(x.title));
      if (V) { ctx = { city: null, uni: null, facet: null }; return V.answer + sugg(['Can I work while I study?', 'Request a callback']); }
    }
    const byMonth = intakeAnswer(q);
    if (byMonth) return byMonth;
    const byPlace = nearAnswer(q, unisHit, citiesHit);
    if (byPlace) return byPlace;
    let facet = facetOf(q, qt);
    // rent or living costs with no city named or being discussed: each city's rent from the page, not a guess
    if ((facet === 'rent' || facet === 'cost') && !citiesHit.length && !unisHit.length && !ctx.city) {
      ctx = { city: null, uni: null, facet };
      return 'Rent depends on the city. Room rent from this page:\n' + M.cities.map(x => { const r = x.c.facts.find(f => /rent/i.test(f[1])); return r ? '- **' + x.c.name + ':** ' + r[2] + ' (' + r[3].toLowerCase() + ')' : ''; }).filter(Boolean).join('\n') +
        '\nTuition depends on your course and university; a counsellor builds your full budget on the [free call](#consult).' + sugg(['How much is rent in Auckland?', 'Request a callback']);
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
      return '**' + citiesHit.map(c => c.name).join(' vs ') + ':**\n' + citiesHit.map(c => { const F = c.facts; const r = F.find(x => /rent/i.test(x[1])), w = F.find(x => /climate/i.test(x[1])); return '- **' + c.name + ':** rent ' + r[2] + ' a week, ' + w[2] + ' (' + w[3].toLowerCase() + '), study at ' + c.unis[0]; }).join('\n') + '\nCompare them side by side in [Pick a city](#cities).';
    }
    if (unisHit.length === 1 && !(facet && facet !== 'university' && citiesHit.length)) { ctx = { city: null, uni: unisHit[0], facet: null }; return uniAnswer(unisHit[0]) + sugg(['What does it cost to live in ' + unisHit[0].city.replace(/ \(.*/, '') + '?']); }
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
    const scored = M.docs.map(x => { let s = 0, hit = 0; qt.forEach(t => { const f = x.tf[t]; if (f) { hit++; s += M.idf(t) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * x.t.length / M.avg)); } }); if (x.ask === x.title && /\?$/.test(x.title)) s *= 1.3; return { x, s, cover: hit / qt.length }; })
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
    return 'I couldn’t find that on this page, so a counsellor is the best person to answer it: [book a free counselling call](#consult), or WhatsApp **+91 73583 64959**.' + (near.length ? sugg(near) : sugg(['Can I work while I study?', 'How can I get PR in New Zealand?']));
  }

  /* ---------- ask ---------- */
  /* ---------- lead capture in the chat (as on the Finland page) ----------
     "Talk to a counsellor", "call me", "book a call"… asks for name, phone and email, then sends them to this
     site's /api/enquiry, which adds them to the New Zealand Leads sheet and emails the team. Nothing is sent
     unless the student types their details; "cancel" stops it at any point. */
  const LEAD_RE = /^(request a (call ?back|callback)|evaluate my profile|talk to a counsell?or|book a (free )?(consultation|call|counselling call)|call me( back)?|i want to (talk|speak) to (a|someone|someone from your team|a counsell?or))\b|\b(talk|speak) to (a |an )?(human|person|counsell?or|someone|agent)\b|\bcall ?back\b/i;
  const LEAD_EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
  let stage = 'idle', lead = { name: '', phone: '', email: '' };
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
      if (q.replace(/[^A-Za-z\u00C0-\u024F]/g, '').length < 2) return 'Could you type your **full name**? (Or type *cancel*.)';
      lead.name = q.slice(0, 120); stage = 'phone';
      return 'Thanks ' + q.split(/\s+/)[0] + '! What’s the best **phone number** to reach you on? Please include the country code, e.g. +91 98765 43210.';
    }
    if (stage === 'phone') {
      const d = q.replace(/\D/g, '');
      if (d.length < 7 || d.length > 15) return 'That doesn’t look like a valid phone number. Please enter it with the country code, e.g. +91 98765 43210, or type *cancel*.';
      lead.phone = q.slice(0, 40); stage = 'email';
      return 'Got it. Lastly, what’s your **email address**?';
    }
    if (stage === 'email') {
      if (!LEAD_EMAIL_RE.test(q)) return 'That doesn’t look like a valid email address. Could you check it, or type *cancel*?';
      lead.email = q.slice(0, 200); stage = 'idle';
      return submitLead().then(res => res && res.success
        ? '✅ **Done!** A counsellor will contact you within one working day.\n\nAnything else I can help with in the meantime?'
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
    const h = a.getAttribute('href'); if (window.__goTo) window.__goTo(h); else location.hash = h;
  });
  window.TCAI = { ask, answer, open: () => setOpen(true) };   // answer(q): the reply text without the chat window, for checks
})();
