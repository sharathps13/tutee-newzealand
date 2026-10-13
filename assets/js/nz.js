/* Tutee Connect · Study in New Zealand landing page. Leads POST to /api/enquiry. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;

  /* ---------- storage, UTM capture (first touch, 30 days), legacy anchors ---------- */
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } } };
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const readUtm = () => { try { const s = JSON.parse(store.get('tc_utm') || 'null'); if (s && Date.now() - s.at < 2592e6) return s.v; } catch (e) { /* corrupt */ } return null; };
  if (!readUtm()) { const p = new URLSearchParams(location.search), f = {}; UTM_KEYS.forEach(k => { const v = p.get(k); if (v) f[k] = v.slice(0, 150); }); if (Object.keys(f).length) store.set('tc_utm', JSON.stringify({ at: Date.now(), v: f })); }
  // universities.html and older campaigns link to the previous page's section ids
  const LEGACY = { top: 'hero', home: 'hero', contact: 'consult', services: 'process', testimonials: 'stories', scholarships: 'why', 'financial-aid': 'trust', 'earn-while-you-learn': 'why', relocate: 'process', reasons: 'why', intakes: 'consult', visas: 'process', documents: 'process', universities: 'cities', loans: 'trust' };
  const legacyId = LEGACY[location.hash.slice(1)];
  if (legacyId) history.replaceState(null, '', '#' + legacyId);


  /* ---------- split headings into masked words ---------- */
  function splitWords(el) {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) { f.appendChild(document.createTextNode(t)); return; } const w = document.createElement('span'), i = document.createElement('span'); w.className = 'w'; i.textContent = t; w.appendChild(i); f.appendChild(w); });
        n.replaceWith(f);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------- content built from data ---------- */
  const banks = [['icici.png', 'ICICI Bank'], ['hdfc-credila.jpg', 'HDFC Credila'], ['axis.jpg', 'Axis Bank'], ['avanse.jpg', 'Avanse'], ['auxilo.jpg', 'Auxilo'], ['idfc.jpg', 'IDFC FIRST Bank'], ['incred.jpg', 'InCred'], ['mpower.jpg', 'MPOWER'], ['prodigy.jpg', 'Prodigy Finance'], ['union.jpg', 'Union Bank of India']];
  const bl = banks.map(b => '<li><img src="./assets/img/loan-partner/' + b[0] + '" alt="' + b[1] + '" loading="lazy"></li>').join('');
  $('#banks').innerHTML = '<ul>' + bl + '</ul><ul aria-hidden="true">' + bl + '</ul>';

  const POST = [
    { msg: 'Amma, the lake here changes colour every hour. Classes are small and my lecturer already knows my name!', name: 'Karthik', to: ['Amma & Appa', 'Anna Nagar, Chennai', 'Tamil Nadu, India'], place: 'Wānaka', reo: 'Glendhu Bay', img: 'postcard-wanaka', c: '#0F5556', date: '12 MAR 26' },
    { msg: 'Got a part-time job at a café in week three. The loan plan is working out exactly as they said.', name: 'Ananya', to: ['Mr & Mrs Rao', 'Indiranagar, Bengaluru', 'Karnataka, India'], place: 'Auckland', reo: 'Tāmaki Makaurau', img: 'postcard-auckland', c: '#8C0B0B', date: '04 APR 26' },
    { msg: 'Dunedin feels like a whole town of students. Found three Tamil friends in the first week.', name: 'Harini', to: ['Amma', 'RS Puram, Coimbatore', 'Tamil Nadu, India'], place: 'Dunedin', reo: 'Ōtepoti', img: 'postcard-dunedin', c: '#B07510', date: '21 FEB 26' }
  ];
  $('#cards').innerHTML = POST.map((p, i) => '<article class="pcard" tabindex="0" aria-label="Postcard from ' + p.name + ' in ' + p.place + '"><div class="pcard__in">' +
    '<div class="pcard__face pc-back"><div class="pc-msg"><p>' + p.msg + '</p><b>– ' + p.name + '</b></div>' +
    '<div class="pc-side"><span class="pc-stamp"><svg viewBox="0 0 50 62" aria-hidden="true"><rect width="50" height="62" fill="' + p.c + '"/><path d="M25 54C25 40 24 32 30 25C36 18 34 9 27 9C20 9 17 16 21 21C24 25 29 22 28 18" fill="none" stroke="#F4B73D" stroke-width="2.6" stroke-linecap="round"/><path d="M25 46q-6-2-9-7M25 40q-5-2-7-6M26 46q6-2 9-7M26 40q5-2 7-6" fill="none" stroke="#FBF6EE" stroke-width="1.4" stroke-linecap="round" opacity=".7"/><text x="25" y="59" text-anchor="middle" font-family="DM Mono, monospace" font-size="5.5" fill="#FBF6EE" letter-spacing=".6">AOTEAROA</text></svg></span>' +
    '<svg class="pc-post" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="30"/><circle cx="40" cy="40" r="22"/><defs><path id="pp' + i + '" d="M40 40m-26 0a26 26 0 1 1 52 0a26 26 0 1 1-52 0"/></defs><text><textPath href="#pp' + i + '">' + p.place.toUpperCase() + ' · NEW ZEALAND ·</textPath></text><text x="40" y="43" text-anchor="middle" style="font-size:7px">' + p.date + '</text><path d="M72 30q6 -4 12 0t12 0M72 40q6 -4 12 0t12 0M72 50q6 -4 12 0t12 0"/></svg>' +
    '<div class="pc-addr">' + p.to.map(t => '<span>' + t + '</span>').join('') + '</div><span class="pc-from">Postcard · Aotearoa NZ</span></div></div>' +
    '<div class="pcard__face pc-front"><img src="./assets/img/hd/' + p.img + '-m.jpg" srcset="./assets/img/hd/' + p.img + '-m.jpg 1200w, ./assets/img/hd/' + p.img + '.jpg 1600w" sizes="(max-width: 1000px) 92vw, 30vw" alt="' + p.place + '" loading="lazy" decoding="async"><small>Greetings from</small><strong>' + p.place + '</strong><span class="reo" style="color:var(--kowhai)">' + p.reo + '</span></div>' +
    '</div></article>').join('');
  $$('.pcard').forEach(c => { c.addEventListener('click', () => c.classList.toggle('is-flip')); c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('is-flip'); } }); });

  const FAQ = [
    ['Is the first consultation really free?', 'Yes. Speaking to a counsellor costs nothing and there is no obligation. We call you in the slot you choose.'],
    ['Do I need IELTS, PTE or TOEFL?', 'Most universities ask for an English test score. We coach you and book the test, and tell you the exact score each course needs.'],
    ['Can I work while I study?', 'Most student visas allow part-time work during term and full-time work in scheduled breaks. We confirm the current limits for your visa.'],
    ['Can I get an education loan?', 'Yes. Our ten lending partners offer secured and unsecured loans covering tuition, flights and living costs. We compare offers for you.'],
    ['Is there a pathway to work or residence?', 'Eligible graduates can apply for a post-study work visa of up to three years, and some go on to residence pathways. We assess your profile on the call.'],
    ['Can my family come with me?', 'Partners and children apply for their own visas based on their relationship to you. We plan the right timing in the consultation.'],
    ['Do you help after I land?', 'Yes. Airport pickup, SIM card, accommodation, bank account and part-time work support, and later your post-study work visa.']
  ];
  $('#acc').innerHTML = FAQ.map((f, i) => '<div class="qa"><button type="button" aria-expanded="false" aria-controls="qa' + i + '"><span class="qa__n">' + String(i + 1).padStart(2, '0') + '</span><span class="qa__q">' + f[0] + '</span><span class="qa__x"><svg class="ic"><use href="#i-plus"/></svg></span></button><div class="qa__a" id="qa' + i + '" role="region"><div><p>' + f[1] + '</p></div></div></div>').join('');
  $$('.qa button').forEach(b => b.addEventListener('click', () => { const q = b.parentElement, open = !q.classList.contains('open'); $$('.qa.open').forEach(x => { x.classList.remove('open'); $('button', x).setAttribute('aria-expanded', 'false'); }); if (open) { q.classList.add('open'); b.setAttribute('aria-expanded', 'true'); } setTimeout(() => ST && ST.refresh(), 600); }));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (G && ST) G.registerPlugin(ST);
  if (!reduce && window.Lenis && G) { lenis = new Lenis({ lerp: .09 }); lenis.on('scroll', ST.update); G.ticker.add(t => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }
  const goTo = sel => { const t = typeof sel === 'string' ? $(sel) : sel; if (!t) return; lenis ? lenis.scrollTo(t, { offset: 0, duration: 1.6 }) : t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); };
  $$('[data-scroll]').forEach(a => a.addEventListener('click', e => { const h = a.getAttribute('href'); if (h && h[0] === '#') { e.preventDefault(); goTo(h === '#top' ? '#hero' : h); } }));
  let tt; function toast(m) { const t = $('#toast'); $('span', t).textContent = m; t.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('is-on'), 2400); }

  /* ---------- consult form: 2 steps + country code picker ---------- */
  const CC = 'AF|Afghanistan|93;AL|Albania|355;DZ|Algeria|213;AS|American Samoa|1684;AD|Andorra|376;AO|Angola|244;AI|Anguilla|1264;AG|Antigua and Barbuda|1268;AR|Argentina|54;AM|Armenia|374;AW|Aruba|297;AU|Australia|61;AT|Austria|43;AZ|Azerbaijan|994;BS|Bahamas|1242;BH|Bahrain|973;BD|Bangladesh|880;BB|Barbados|1246;BY|Belarus|375;BE|Belgium|32;BZ|Belize|501;BJ|Benin|229;BM|Bermuda|1441;BT|Bhutan|975;BO|Bolivia|591;BA|Bosnia and Herzegovina|387;BW|Botswana|267;BR|Brazil|55;IO|British Indian Ocean Territory|246;VG|British Virgin Islands|1284;BN|Brunei|673;BG|Bulgaria|359;BF|Burkina Faso|226;BI|Burundi|257;KH|Cambodia|855;CM|Cameroon|237;CA|Canada|1;CV|Cape Verde|238;KY|Cayman Islands|1345;CF|Central African Republic|236;TD|Chad|235;CL|Chile|56;CN|China|86;CO|Colombia|57;KM|Comoros|269;CG|Congo|242;CD|Congo (DRC)|243;CK|Cook Islands|682;CR|Costa Rica|506;CI|Côte d’Ivoire|225;HR|Croatia|385;CU|Cuba|53;CW|Curaçao|599;CY|Cyprus|357;CZ|Czechia|420;DK|Denmark|45;DJ|Djibouti|253;DM|Dominica|1767;DO|Dominican Republic|1809;EC|Ecuador|593;EG|Egypt|20;SV|El Salvador|503;GQ|Equatorial Guinea|240;ER|Eritrea|291;EE|Estonia|372;SZ|Eswatini|268;ET|Ethiopia|251;FK|Falkland Islands|500;FO|Faroe Islands|298;FJ|Fiji|679;FI|Finland|358;FR|France|33;GF|French Guiana|594;PF|French Polynesia|689;GA|Gabon|241;GM|Gambia|220;GE|Georgia|995;DE|Germany|49;GH|Ghana|233;GI|Gibraltar|350;GR|Greece|30;GL|Greenland|299;GD|Grenada|1473;GP|Guadeloupe|590;GU|Guam|1671;GT|Guatemala|502;GG|Guernsey|44;GN|Guinea|224;GW|Guinea-Bissau|245;GY|Guyana|592;HT|Haiti|509;HN|Honduras|504;HK|Hong Kong|852;HU|Hungary|36;IS|Iceland|354;IN|India|91;ID|Indonesia|62;IR|Iran|98;IQ|Iraq|964;IE|Ireland|353;IM|Isle of Man|44;IL|Israel|972;IT|Italy|39;JM|Jamaica|1876;JP|Japan|81;JE|Jersey|44;JO|Jordan|962;KZ|Kazakhstan|7;KE|Kenya|254;KI|Kiribati|686;XK|Kosovo|383;KW|Kuwait|965;KG|Kyrgyzstan|996;LA|Laos|856;LV|Latvia|371;LB|Lebanon|961;LS|Lesotho|266;LR|Liberia|231;LY|Libya|218;LI|Liechtenstein|423;LT|Lithuania|370;LU|Luxembourg|352;MO|Macau|853;MG|Madagascar|261;MW|Malawi|265;MY|Malaysia|60;MV|Maldives|960;ML|Mali|223;MT|Malta|356;MH|Marshall Islands|692;MQ|Martinique|596;MR|Mauritania|222;MU|Mauritius|230;YT|Mayotte|262;MX|Mexico|52;FM|Micronesia|691;MD|Moldova|373;MC|Monaco|377;MN|Mongolia|976;ME|Montenegro|382;MS|Montserrat|1664;MA|Morocco|212;MZ|Mozambique|258;MM|Myanmar|95;NA|Namibia|264;NR|Nauru|674;NP|Nepal|977;NL|Netherlands|31;NC|New Caledonia|687;NZ|New Zealand|64;NI|Nicaragua|505;NE|Niger|227;NG|Nigeria|234;NU|Niue|683;KP|North Korea|850;MK|North Macedonia|389;MP|Northern Mariana Islands|1670;NO|Norway|47;OM|Oman|968;PK|Pakistan|92;PW|Palau|680;PS|Palestine|970;PA|Panama|507;PG|Papua New Guinea|675;PY|Paraguay|595;PE|Peru|51;PH|Philippines|63;PL|Poland|48;PT|Portugal|351;PR|Puerto Rico|1787;QA|Qatar|974;RE|Réunion|262;RO|Romania|40;RU|Russia|7;RW|Rwanda|250;WS|Samoa|685;SM|San Marino|378;ST|São Tomé and Príncipe|239;SA|Saudi Arabia|966;SN|Senegal|221;RS|Serbia|381;SC|Seychelles|248;SL|Sierra Leone|232;SG|Singapore|65;SX|Sint Maarten|1721;SK|Slovakia|421;SI|Slovenia|386;SB|Solomon Islands|677;SO|Somalia|252;ZA|South Africa|27;KR|South Korea|82;SS|South Sudan|211;ES|Spain|34;LK|Sri Lanka|94;KN|St Kitts and Nevis|1869;LC|St Lucia|1758;VC|St Vincent and the Grenadines|1784;SD|Sudan|249;SR|Suriname|597;SE|Sweden|46;CH|Switzerland|41;SY|Syria|963;TW|Taiwan|886;TJ|Tajikistan|992;TZ|Tanzania|255;TH|Thailand|66;TL|Timor-Leste|670;TG|Togo|228;TO|Tonga|676;TT|Trinidad and Tobago|1868;TN|Tunisia|216;TR|Türkiye|90;TM|Turkmenistan|993;TC|Turks and Caicos Islands|1649;TV|Tuvalu|688;UG|Uganda|256;UA|Ukraine|380;AE|United Arab Emirates|971;GB|United Kingdom|44;US|United States|1;UY|Uruguay|598;VI|US Virgin Islands|1340;UZ|Uzbekistan|998;VU|Vanuatu|678;VA|Vatican City|39;VE|Venezuela|58;VN|Vietnam|84;WF|Wallis and Futuna|681;YE|Yemen|967;ZM|Zambia|260;ZW|Zimbabwe|263'
    .split(';').map(r => { const [iso, name, dial] = r.split('|'); return { iso: iso.toLowerCase(), name, dial: '+' + dial }; });
  const POPULAR = ['in', 'ae', 'sa', 'qa', 'om', 'kw', 'bh', 'lk', 'np', 'bd', 'sg', 'my'];
  const flag = iso => './assets/img/flags/' + iso + '.png';
  const ccEl = $('#cc'), ccBtn = $('#cc-btn'), ccPop = $('#cc-pop'), ccList = $('#cc-list'), ccQ = $('#cc-q');
  let ccSel = CC.find(c => c.iso === 'in'), ccHl = -1, ccItems = [];
  const opt = c => '<li class="cc__opt" role="option" data-iso="' + c.iso + '" aria-selected="' + (c === ccSel) + '"><img src="' + flag(c.iso) + '" alt="" loading="lazy" width="26" height="18"><span>' + c.name + '</span><small>' + c.dial + '</small></li>';
  function renderCC(q) {
    q = (q || '').trim().toLowerCase().replace(/^\+/, '');
    const hit = c => !q || c.name.toLowerCase().includes(q) || c.dial.slice(1).startsWith(q) || c.iso === q;
    let html = '';
    if (!q) html += '<li class="cc__group" role="presentation">Popular</li>' + POPULAR.map(i => opt(CC.find(c => c.iso === i))).join('') + '<li class="cc__group" role="presentation">All countries</li>';
    const rest = CC.filter(hit);
    html += rest.map(opt).join('') || '<li class="cc__empty">No country matches "' + q + '"</li>';
    ccList.innerHTML = html; ccItems = $$('.cc__opt', ccList); ccHl = -1;
  }
  function openCC(on) {
    ccPop.hidden = !on; ccEl.classList.toggle('open', on); ccBtn.setAttribute('aria-expanded', on);
    if (on) { ccQ.value = ''; renderCC(''); setTimeout(() => ccQ.focus(), 30); const s = ccList.querySelector('[aria-selected="true"]'); if (s) s.scrollIntoView({ block: 'nearest' }); }
  }
  function pickCC(iso) {
    ccSel = CC.find(c => c.iso === iso); $('#cc-flag').src = flag(iso); $('#cc-code').textContent = ccSel.dial;
    ccBtn.setAttribute('aria-label', 'Country code: ' + ccSel.name + ' ' + ccSel.dial); openCC(false); ccBtn.focus();
  }
  ccBtn.addEventListener('click', () => openCC(ccPop.hidden));
  ccQ.addEventListener('input', () => renderCC(ccQ.value));
  ccList.addEventListener('click', e => { const o = e.target.closest('.cc__opt'); if (o) pickCC(o.dataset.iso); });
  ccQ.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ccHl = Math.max(0, Math.min(ccItems.length - 1, ccHl + (e.key === 'ArrowDown' ? 1 : -1))); ccItems.forEach((o, i) => o.classList.toggle('hl', i === ccHl)); ccItems[ccHl] && ccItems[ccHl].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = ccItems[Math.max(0, ccHl)]; if (o) pickCC(o.dataset.iso); }
    else if (e.key === 'Escape') { openCC(false); ccBtn.focus(); }
  });
  document.addEventListener('click', e => { if (!ccEl.contains(e.target)) openCC(false); });

  const panes = $$('#cform .cpane'), stepsUI = $$('#csteps li'); let step = 0;
  $$('#slots .slot').forEach(s => s.addEventListener('click', () => $$('#slots .slot').forEach(x => x.setAttribute('aria-pressed', x === s))));
  function go(n) {
    const back = n < step; step = n;
    panes.forEach((p, i) => { p.classList.toggle('on', i === n); p.classList.toggle('back-in', i === n && back); });
    stepsUI.forEach((s, i) => { s.classList.toggle('done', i < n); s.classList.toggle('now', i === n); });
    $('#c-back').hidden = n === 0; $('#c-n').textContent = 'Step ' + (n + 1) + ' of 2';
    $('#c-next').innerHTML = n === 1 ? 'Request my call <svg class="ic"><use href="#i-arrow"/></svg>' : 'Continue <svg class="ic"><use href="#i-arrow"/></svg>';
    $('#c-err').textContent = '';
  }
  function check() {
    $$('#cform .ff').forEach(f => f.classList.remove('bad'));
    if (step !== 0) return '';
    const n = $('#c-name'), em = $('#c-email'), p = $('#c-phone');
    const bad = (el, msg) => { el.parentElement.classList.add('bad'); el.focus(); return msg; };
    if (n.value.trim().length < 2) return bad(n, 'Add your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) return bad(em, 'Add a valid email address so we can send your plan.');
    if (p.value.replace(/\D/g, '').length < 6) return bad(p, 'Add a WhatsApp number we can reach you on.');
    return '';
  }
  $('#c-back').addEventListener('click', () => go(step - 1));
  $('#cform').addEventListener('submit', e => {
    e.preventDefault();
    const err = check(); if (err) { $('#c-err').textContent = err; return; }
    if (step < 1) { go(step + 1); return; }
    const slot = $('#slots [aria-pressed="true"]');
    const slotText = slot.querySelector('b').textContent + ', ' + slot.querySelector('small').textContent;
    const interest = [$('#h-course').value, $('#h-level').value, $('#h-city').value].filter(Boolean).join(' · ');
    const data = {
      name: $('#c-name').value.trim(), email: $('#c-email').value.trim(),
      phone: ccSel.dial + ' ' + $('#c-phone').value.trim(), destination: 'New Zealand',
      page: location.host + location.pathname, from_name: 'NZ landing page · Counselling form',
      botcheck: $('#c-bot').value, preferredCallTime: slotText + ' (' + ccSel.name + ' time)', consent: 'yes',
      state: $('#c-state').value.trim(), interest
    };
    const utm = readUtm() || {}; UTM_KEYS.forEach(k => { if (utm[k]) data[k] = utm[k]; });
    Object.keys(data).forEach(k => { if (data[k] === '' && k !== 'botcheck') delete data[k]; });
    const btn = $('#c-next'), btnHtml = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Sending…'; $('#c-err').textContent = '';
    fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
      .then(r => r.json().catch(() => ({ success: false })))
      .then(res => {
        if (!res || !res.success) { $('#c-err').textContent = (res && res.message) || 'Something went wrong. Please try again, or WhatsApp us on +91 70109 02329.'; return; }
        store.set('tc_lead', '1');
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'generate_lead', lead_source: 'Counselling form', country: 'new-zealand' });
        $('#sent-h').textContent = "You're booked, " + data.name.split(' ')[0] + '.';
        const rows = [['Call', slotText], ['WhatsApp', data.phone], ['Email', data.email]];
        if (interest) rows.push(['Interested in', interest]);
        $('#sent-card').innerHTML = rows.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1].replace(/[<>&]/g, '') + '</dd>').join('');
        stepsUI.forEach(s => { s.classList.add('done'); s.classList.remove('now'); });
        $('#sent').classList.add('on');
      })
      .catch(() => { $('#c-err').textContent = 'Network error. Check your connection and try again, or WhatsApp us on +91 70109 02329.'; })
      .then(() => { btn.disabled = false; btn.innerHTML = btnHtml; });
  });
  // the hero quick-start bar carries its choices into the lead as hidden fields
  $('#qform').addEventListener('submit', e => { e.preventDefault(); $('#h-course').value = $('#q-course').value; $('#h-level').value = $('#q-level').value; $('#h-city').value = $('#q-city').value; goTo('#consult'); setTimeout(() => $('#c-name').focus({ preventScroll: true }), 1700); });

  /* ---------- why NZ: expanding photo accordion ---------- */
    const REASONS = [
    ['All eight universities are globally ranked', 'QS World Rankings', 'Every New Zealand university features in the QS World University Rankings, so whichever you choose, your degree travels.', 'reason-01-otago', 'University of Otago, Dunedin', '40% 45%'],
    ['Work while you study', 'Part-time work rights', 'Most student visas allow part-time work during term and full-time work in scheduled breaks, which helps with living costs.', 'reason-02-auckland', 'Auckland skyline', '50% 50%'],
    ['Stay and work after you graduate', 'Post-study work visa', 'Eligible graduates can apply for a post-study work visa of up to three years to build real New Zealand experience.', 'reason-03-wellington', 'Wellington Harbour', '50% 60%'],
    ['One of the world’s safest countries', 'Global Peace Index', 'New Zealand is consistently ranked among the most peaceful nations, with friendly cities that are easy to get around.', 'reason-04-tekapo', 'Lake Tekapo', '50% 55%'],
    ['<span class="reo">Manaakitanga</span>, a culture of care', 'Pastoral Care Code', 'The Māori value of looking after guests shapes how universities and communities welcome international students.', 'reason-05-marae', 'Pukemokimoki Marae, Napier', '50% 50%'],
    ['Competitive fees and scholarships', 'Scholarship support', 'Tuition compares well with the UK, US and Australia, and we help you find and apply for scholarships.', 'reason-06-hagley-park', 'Hagley Park, Christchurch', '50% 50%'],
    ['Practical, industry-linked degrees', 'Hands-on learning', 'Small classes, real projects and placements in IT, engineering, health and business.', 'reason-07-unleash-space', 'University of Auckland', '50% 50%'],
    ['Research that matters', 'Research culture', 'Modern labs and a hands-on research culture, from agritech and climate to earth sciences.', 'reason-08-biology', 'University of Auckland', '50% 50%'],
    ['A clear, online visa process', 'Online application', 'Immigration New Zealand runs a straightforward online application, and we prepare the full file with you.', 'reason-09-beehive', 'Parliament, Wellington', '50% 50%'],
    ['Fjords, lakes and mountains on your doorstep', 'Life beyond campus', 'Some of the world’s most dramatic landscapes are a weekend trip away from every campus.', 'reason-10-milford', 'Milford Sound · Piopiotahi', '45% 50%']
  ];
  (() => {
    const box = $('#acc10');
    box.innerHTML = REASONS.map((r, i) => '<button class="ap' + (i ? '' : ' on') + '" type="button" role="tab" aria-selected="' + !i + '" data-i="' + i + '"><img src="./assets/img/hd/' + r[3] + '-m.jpg" srcset="./assets/img/hd/' + r[3] + '-m.jpg ' + 1200 + 'w, ./assets/img/hd/' + r[3] + '.jpg ' + 2400 + 'w" sizes="(max-width: 899px) 100vw, 70vw" alt="" loading="lazy" decoding="async" style="object-position:' + r[5] + '"><span class="ap__n">' + String(i + 1).padStart(2, '0') + '</span><span class="ap__v">' + r[0].replace(/<[^>]+>/g, '').replace(/’/g, "'") + '</span><span class="ap__body"><span class="ap__tag">' + r[1] + '</span><h3>' + r[0] + '</h3><p>' + r[2] + '</p><span class="ap__place">' + r[4] + '</span></span></button>').join('');
    const panels = $$('.ap', box);
    const open = i => { panels.forEach((p, j) => { p.classList.toggle('on', j === i); p.setAttribute('aria-selected', j === i); }); $('#acc10-n').textContent = String(i + 1).padStart(2, '0'); $('#acc10-bar').style.transform = 'scaleX(' + (i + 1) / panels.length + ')'; };
    const hover = matchMedia('(hover: hover) and (min-width: 900px)').matches;
    let t; panels.forEach((p, i) => {
      p.addEventListener('click', () => open(i));
      p.addEventListener('focus', () => open(i));
      if (hover) { p.addEventListener('pointerenter', () => { clearTimeout(t); t = setTimeout(() => open(i), 90); }); p.addEventListener('pointerleave', () => clearTimeout(t)); }
    });
    box.addEventListener('keydown', e => { const i = panels.findIndex(p => p.classList.contains('on')); if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); panels[Math.min(9, i + 1)].focus(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); panels[Math.max(0, i - 1)].focus(); } });
  })();

  /* ---------- how it works: compass dial ---------- */
  const STEPS = [
    ['i-chat', 'Consult', 'Free consultation', 'One call to map your course, university options, budget and career goals, with your parents if you like.', ['Profile assessment', 'Course and country fit', 'Budget plan']],
    ['i-lang', 'English test', 'English test preparation', 'IELTS, PTE or TOEFL coaching and test booking, so your score is ready before applications open.', ['Coaching classes', 'Mock tests', 'Test booking']],
    ['i-compass', 'Apply', 'Shortlist and apply', 'A university shortlist that fits your marks and budget. We prepare and submit every application.', ['University shortlist', 'Application packs', 'Offer tracking']],
    ['i-file', 'Documents', 'Documents and offer letter', 'Transcripts, financials and references assembled and checked before they go out.', ['Document checklist', 'Verification', 'Offer of place']],
    ['i-cash', 'Loan', 'Education loan', 'Secured and unsecured offers compared across our ten lending partners, so you choose with confidence.', ['Lender comparison', 'Paperwork support', 'Sanction letter']],
    ['i-passport', 'Visa', 'Visa and statement of purpose', 'The right student visa for your plan, and an SOP that sounds like you.', ['Visa file', 'SOP review', 'Interview prep']],
    ['i-plane', 'Arrive', 'Land and settle in', 'Airport pickup, SIM, accommodation, bank account and part-time work support. Later, your post-study work visa.', ['Pre-departure briefing', 'Arrival support', 'Post-study visa help']]
  ];
  (() => {
    const stage = $('#dial-stage'), dial = $('#dial'), CX = 500, CY = 510, R = 420, N = STEPS.length;
    // instrument ticks every 5°, longer every 30°
    let ticks = ''; for (let a = 0; a <= 180; a += 5) { const r1 = R + 14, r2 = R + (a % 30 === 0 ? 30 : 22), c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); ticks += '<line class="dial__tick' + (a % 30 === 0 ? ' major' : '') + '" x1="' + (CX - r1 * c).toFixed(1) + '" y1="' + (CY - r1 * s).toFixed(1) + '" x2="' + (CX - r2 * c).toFixed(1) + '" y2="' + (CY - r2 * s).toFixed(1) + '"/>'; }
    $('#dial-ticks').innerHTML = ticks;
    stage.insertAdjacentHTML('beforeend', STEPS.map((s, i) => { const a = Math.PI - i * Math.PI / (N - 1), x = CX + R * Math.cos(a), y = CY - R * Math.sin(a); return '<button class="dnode" type="button" role="tab" data-i="' + i + '" style="left:' + (x / 10).toFixed(2) + '%;top:' + (y / 5.6).toFixed(2) + '%" aria-label="Step ' + (i + 1) + ': ' + s[2] + '"><span class="dnode__c"><svg class="ic"><use href="#' + s[0] + '"/></svg></span><b>' + s[1] + '</b></button>'; }).join(''));
    const nodes = $$('.dnode', stage); let at = 0, timer = null, inView = false, user = false;
    const paint = i => { const s = STEPS[i]; $('#dl-n').textContent = 'Step ' + String(i + 1).padStart(2, '0') + ' of 07'; $('#dl-h').textContent = s[2]; $('#dl-p').textContent = s[3]; $('#dl-ul').innerHTML = s[4].map(d => '<li><svg class="ic"><use href="#i-check"/></svg>' + d + '</li>').join(''); };
    function show(i, fromUser) {
      at = (i + N) % N; if (fromUser) user = true;
      nodes.forEach((n, j) => { n.classList.toggle('on', j === at); n.classList.toggle('done', j < at); n.setAttribute('aria-selected', j === at); });
      $('#dial-prog').style.strokeDashoffset = 1 - at / (N - 1);
      dial.classList.add('is-swapping'); setTimeout(() => { paint(at); dial.classList.remove('is-swapping'); }, 220);
      clearTimeout(timer); if (inView && !user && !reduce) timer = setTimeout(() => show(at + 1), 5000);
    }
    nodes.forEach(n => n.addEventListener('click', () => show(+n.dataset.i, true)));
    $('#dl-next').addEventListener('click', () => show(at + 1, true));
    $('#dl-prev').addEventListener('click', () => show(at - 1, true));
    dial.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(at + 1, true); if (e.key === 'ArrowLeft') show(at - 1, true); });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; clearTimeout(timer); if (inView && !user && !reduce) timer = setTimeout(() => show(at + 1), 5000); }, { threshold: .45 }).observe(dial);
    paint(0); show(0);
  })();

  /* ---------- footer: Kia ora letters react to the pointer ---------- */
  (() => {
    const g = $('#giant'); g.innerHTML = [...'Kia ora'].map(ch => ch === ' ' ? '<span class="gsp"></span>' : '<span class="gl">' + ch + '</span>').join('');
    const letters = $$('.gl', g), foot = $('.foot');
    const reset = () => { g.classList.remove('is-live'); letters.forEach(l => { l.style.color = ''; l.style.fontWeight = ''; l.style.transform = ''; l.style.webkitTextStrokeColor = ''; }); };
    foot.addEventListener('pointermove', e => {
      g.classList.add('is-live');
      letters.forEach(l => {
        const r = l.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const d = Math.hypot(e.clientX - cx, (e.clientY - cy) * 1.4), t = Math.max(0, 1 - d / 340);
        l.style.fontWeight = Math.round(300 + t * 500);
        l.style.color = 'rgba(244,183,61,' + t.toFixed(3) + ')';
        l.style.webkitTextStrokeColor = 'rgba(245,239,228,' + (.28 + t * .5).toFixed(3) + ')';
        l.style.transform = 'translateY(' + (-t * 6).toFixed(1) + '%) rotate(' + ((e.clientX - cx) / 60 * t).toFixed(2) + 'deg)';
      });
    });
    foot.addEventListener('pointerleave', reset);
    letters.forEach((l, i) => l.addEventListener('click', () => { l.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14%) scale(1.05)', color: '#F4B73D' }, { transform: 'translateY(0)' }], { duration: 700, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }));
  })();

  /* ---------- header, progress, mobile bar ---------- */
  const hdr = $('#hdr'), prog = $('#prog'), mbar = $('#mbar'); let lastY = 0;
  function onScroll() { const y = scrollY, h = innerHeight, max = document.documentElement.scrollHeight - h; hdr.classList.toggle('is-solid', y > 60); hdr.classList.toggle('is-hidden', y > lastY && y > h * 1.2); lastY = y; prog.style.strokeDashoffset = 1 - y / max; mbar.classList.toggle('is-on', y > h * .7); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- GSAP choreography ---------- */
  const pre = $('#pre');
  const counters = () => $$('[data-count]').forEach(el => { const end = +el.dataset.count; if (!G || reduce) { el.textContent = end.toLocaleString('en-IN'); return; } const o = { v: 0 }; G.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' }, onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('en-IN') }); });
  if (!G || !ST || reduce) { pre.classList.add('is-gone'); counters(); return; }

  const mist = $$('.mist');
  const intro = G.timeline({ defaults: { ease: 'expo.out' } });
  intro.to('#pre-line', { scaleX: 1, duration: .7, ease: 'power2.inOut' }, 0)
    .to('.pre__inner', { opacity: 0, duration: .3, ease: 'power1.in' }, .75)
    .to('#pre', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, .9)
    .add(() => pre.classList.add('is-gone'), 1.9)
    .from(mist, { opacity: 0, duration: 2, ease: 'power1.out' }, 1.2)
    .from('#hero-h .w > span', { yPercent: 105, duration: 1.1, stagger: .045 }, 1.25)
    .from('#hero [data-in]', { y: 24, opacity: 0, duration: 1, stagger: .1 }, 1.45)
    .from('#facts > div', { x: 30, opacity: 0, duration: 1, stagger: .1 }, 1.6)
    .from('#qform', { y: 40, opacity: 0, duration: 1.1 }, 1.75)
    .from('.hdr__bar', { y: -30, opacity: 0, duration: .9 }, 1.5);
  setTimeout(() => { pre.classList.add('is-gone'); if (intro.progress() < 1) intro.progress(1); }, 3500);
  mist.forEach((m, i) => G.to(m, { x: (i % 2 ? -1 : 1) * (40 + i * 20), duration: 14 + i * 4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));

  const mm = G.matchMedia();
  mm.add('(min-width: 1000px)', () => {
    // hero: gentle parallax as it scrolls away (no pin, so no empty gap)
    G.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('#slides', { yPercent: 18, ease: 'none' }, 0)
      .to(mist[0], { xPercent: -30, ease: 'none' }, 0).to(mist[1], { xPercent: 30, ease: 'none' }, 0)
      .fromTo('#hero-copy', { y: 0 }, { y: -90, ease: 'none' }, 0)
      .fromTo('#facts', { y: 0 }, { y: -140, ease: 'none' }, 0);

    // cities: horizontal scroll (unchanged)
    const track = $('#track'), dist = () => track.scrollWidth - innerWidth + 60;
    const tween = G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '#cities-pin', start: 'top top', end: () => '+=' + dist(), scrub: 1, pin: true, invalidateOnRefresh: true, onUpdate: s => G.set('#cities-bar', { scaleX: s.progress }) } });
    $$('.city__img').forEach(img => G.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
    $$('.city__big').forEach(b => G.fromTo(b, { xPercent: 30 }, { xPercent: -20, ease: 'none', scrollTrigger: { trigger: b.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
  });

  // headings + reveals
  $$('[data-split]').forEach(h => { if (h.id === 'hero-h') return; G.from(h.querySelectorAll('.w > span'), { yPercent: 108, duration: 1.1, stagger: .045, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 86%' } }); });
  $$('[data-in]').forEach(el => { if (el.closest('#hero')) return; G.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }); });
  counters();
  G.from('.svc', { y: 50, opacity: 0, duration: 1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '#services', start: 'top 82%' } });
  G.from('.stat', { y: 30, opacity: 0, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

  // reasons + process reveals
  G.from('.ap', { y: 60, opacity: 0, duration: 1.1, stagger: .05, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '#acc10', start: 'top 85%' } });
  G.from('#dial-prog', { strokeDashoffset: 1, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: '#dial', start: 'top 80%' } });
  G.from('.dnode', { scale: 0, opacity: 0, duration: .8, stagger: .08, ease: 'back.out(2)', clearProps: 'transform,opacity', scrollTrigger: { trigger: '#dial', start: 'top 80%' } });
  G.from('.dial__tick', { opacity: 0, duration: .6, stagger: .01, scrollTrigger: { trigger: '#dial', start: 'top 80%' } });

  // postcards drop in like they've been dealt onto a table
  G.from('.pcard', { y: 80, rotate: (i) => [-6, 3, -3][i] || 0, opacity: 0, duration: 1.2, stagger: .14, ease: 'expo.out', scrollTrigger: { trigger: '#cards', start: 'top 82%' } });
  // faq + consult
  G.from('.qa', { y: 24, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: '#acc', start: 'top 85%' } });
  G.from('#cbox', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '#cbox', start: 'top 85%' } });
  G.from('.cnext li', { x: -24, opacity: 0, duration: 1, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.cnext', start: 'top 88%' } });
  G.from('.gl', { yPercent: 35, opacity: 0, duration: 1.1, stagger: .06, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.foot', start: 'top 85%' } });

  addEventListener('load', () => { ST.refresh(); const t = location.hash && document.getElementById(location.hash.slice(1)); if (t) { intro.progress(1); const jump = () => { const y = t.getBoundingClientRect().top + scrollY; lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); }; setTimeout(jump, 60); setTimeout(() => { ST.refresh(); jump(); }, 900); } });
  window.__shot = (at, p) => { intro.progress(1); pre.classList.add('is-gone'); const el = $('#' + at), base = el.closest('.pin-spacer') || el; const y = base.getBoundingClientRect().top + scrollY + (p || 0) * Math.max(0, base.offsetHeight - innerHeight); lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); ST.update(); return Math.round(y); };
})();
