# Tutee Connect — New Zealand landing page

A lead-generation landing page for students (and parents) planning to study in New Zealand. Every
section ends in a way to become a lead, and every lead goes to `POST /api/enquiry`
(`netlify/functions/enquiry.mjs`), which stores it in Supabase and emails it to the business inbox.

## Files

```
index.html                  the landing page ("Aotearoa Awaits" design)
assets/css/nz.css           its stylesheet: brand tokens, layout, every animation
assets/css/nz-fonts.css     @font-face rules for the self-hosted fonts in assets/fonts/nz/
assets/js/nz.js             its behaviour: counselling form → /api/enquiry, UTM capture, legacy anchors, animations
assets/vendor/              GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13, libphonenumber-js 1.13.13 mobile bundle (MIT;
                            loaded only when the form is near), all self-hosted so script-src 'self' holds
assets/img/hd/              the 25 HD CC0 photographs. The page serves <slot>-640/1024/1600/2400.webp (hero also 1920/2880)
                            via srcset; the .jpg originals are the masters (and og:image). CREDITS.md
assets/img/flags/           country flags for the dial-code picker (flagcdn, public domain)
assets/img/brand/           logo.png (from the master logo), mark-64/192.png, bird.png (the logo's bird, cut out)
assets/img/nz/              the previous page's four 1200px photos, no longer used by index.html
assets/img/loan-partner/    the twelve education-loan partner logos (incl. Tata Capital, Poonawalla Fincorp)
design-preview/             the design concepts reviewed with the team; aotearoa.html is the approved one
                            (index.html has moved on since: the immersive city view and Wellington card exist only in index.html)

universities.html           the 195-provider directory (generated — see below)
assets/css/main.css         universities.html only: the compiled Tailwind from the old design
assets/js/main.js, *-data.js, supabase-*.js   universities.html only
netlify/functions/enquiry.mjs   shared lead endpoint (canonical copy lives in _tooling)
netlify/functions/verify-email.mjs   this site only: GET /api/verify-email?domain= (DNS MX lookup, no deps)
netlify/functions/news.mjs       this site only: GET /api/news, live NZ education stories (RNZ, NZ Herald, Universities NZ RSS)
netlify/functions/news-img.mjs   this site only: GET /api/news-img?u=, relays those stories' images (two allowed hosts only)
scripts/news-snapshot.mjs   saves the current stories to assets/js/news-snapshot.js + assets/img/news/; the page falls back to it
                            when /api/news isn't reachable (index.html opened from disk, static preview, feed outage).
                            Re-run `node scripts/news-snapshot.mjs` before each deploy to keep the fallback fresh.
serve.py                    local preview server
```

No build step and no third-party scripts, fonts or images (libraries, fonts, flags and photos are all
self-hosted), so the strict CSP in `netlify.toml` holds
(`script-src 'self'`). The two JSON-LD blocks in `<head>` are data, not scripts, so CSP leaves them
alone.

## Page structure and lead capture

| # | Section | Lead hook |
|---|---|---|
| 1 | Hero (HD Queenstown, slow drift) | "Book a free consultation" + a quick-start bar (subject · level · city) that carries into the form |
| 2 | Why Tutee Connect | Stats, six services, loan-partner logos |
| 3 | City gallery (horizontal scroll, 5 cities). Each card opens a full-screen "step inside" view: weekday / weekend photo, a day in your life, live NZ time, climate, rent, universities, the feel of the city; arrows / swipe between cities | "Plan my move to {city}" pre-fills the city into the form; end card → "Talk to a counsellor" |
| 4 | 10 reasons (photo accordion) | — |
| 4b | In the news: up to 4 live NZ education stories with their images (hides itself if the feeds are down) | — |
| 5 | How it works (compass dial, 7 steps) | "Start with step one" |
| 6 | Postcards home | — |
| 7 | FAQ | Contact card |
| 8 | Counselling form (2 steps) | Name, email, WhatsApp (searchable dial codes with flags), state/region; then call time |
| 9 | Footer | Offices; the "Kia ora" letters react to the pointer |

Always on: the header "Talk to a counsellor" button and, on phones, a sticky WhatsApp / Call / Free
consultation bar.

### What a lead carries

`name`, `email`, `phone` (dial code + number), `destination` (always New Zealand), `page`,
`from_name` (`NZ landing page · Counselling form`), `botcheck` (honeypot), plus extras the function
forwards as their own rows: `preferredCallTime`, `consent` (the form states that requesting a call is
consent to be contacted), `state`, `interest` (from the hero bar), and `utm_*`. That is at most 10
extras, inside `MAX_EXTRA_FIELDS` (12).

### Email and phone verification

No code is sent to the student; the form checks the details are real before it moves on:

- **Email:** strict format; typo suggestions for common providers (gmial.com → gmail.com, .con → .com),
  asked once and then respected; throwaway inboxes (mailinator, yopmail, 10minutemail …) and placeholders
  (test@test.com) refused; then `/api/verify-email` checks the domain has a mail server (MX, or an A
  record). If that lookup fails or times out, the form lets the lead through rather than lose it.
- **WhatsApp number:** libphonenumber-js checks it is a valid *mobile* number for the chosen country;
  obvious fakes (9999999999, 9876543210, 1234567890) are refused; a pasted +971 / 0091 number switches
  the country flag; the lead carries the number in international format (`+91 98401 23456`).
- The server (`enquiry.mjs`) still only checks format and 7–15 digits. To enforce the mail-server
  check server-side too, add it to the canonical copy in `_tooling`.

UTM tags are captured on the first visit and kept for 30 days in `localStorage`. On success the page
pushes `{ event: 'generate_lead' }` to `window.dataLayer`. Old anchors (`#contact`, `#services`,
`#reasons`, …) used by `universities.html` and past campaigns are mapped to the new sections.

On success the page pushes `{ event: 'generate_lead' }` to `window.dataLayer`, ready for GTM / GA4 /
Meta Pixel. Loading any of those also means widening the CSP in `netlify.toml`.

## Performance

Stress-tested in headless Edge at 360×640, 390×844 (phones, CPU slowed 4× and 6×), 768×1024 (tablet),
1024×768, 1280×800, 1366×768, 1440×900, 1920×1080 and 2560×1440, on throttled 4G / cable. What keeps it fast:

- **Images:** responsive WebP sets with `sizes` that match how big each photo is drawn, so a phone
  never downloads a desktop image. Everything below the hero is `loading="lazy"`. The hero is preloaded
  with `fetchpriority="high"`.
- **No loading curtain:** the hero photo paints at once and the copy rises in over it. CSS holds the hero
  copy hidden until the intro starts (and shows it after 2s if scripts fail), so nothing flashes.
- **Start-up:** the ~40 scroll-reveal animations are created in idle time after first paint, a few per
  frame, then measured once. `text-wrap: balance` is not used on the word-split animated headings
  (it cost over 1s of layout on a phone).
- **Scrolling:** Lenis smooth scroll only runs with a real mouse; phones keep native scrolling.
  ScrollTrigger ignores the mobile address-bar resize. The scroll handler never measures layout.
  The hero drift, logo marquee and dial pulse pause while off screen. Phones skip the blend-mode glint
  and the blurred mist. No `backdrop-filter` on elements that move while scrolling.
- **Start-up timing:** the scroll-reveal setup waits for the web fonts (max 1.5s), because a font swap re-lays-out all
  text and would otherwise land inside a setup task. The news strip formats dates without `Intl` (its first use
  costs about 100ms on a phone), and loads its stories only when near or 3s after page load.
- **Deferred:** the postcards' handwriting font loads only when the section is near. The phone-number
  library (190 KB) loads in idle time near the form, or when a field is focused.
## Before launch

- **Sign off the public claims** in `#trust` and the hero facts: 5,000+ students guided, 200+ NZ
  institution tie-ups, 12 loan partners, up to 3-year post-study work visa. They are unverified.
- **Replace the placeholder testimonials**: the postcards (Karthik, Ananya, Harini) are illustrative
  and must be swapped for real, consented student stories before launch.
- **Confirm the university partners** listed in `#universities` (from SPEC §6). Manukau Institute of
  Technology and Unitec are being reorganised (see below), so check how they should be named.
- **Check the city facts** in ssets/js/nz.js (CITIES): rent ranges, climate, populations,
  universities and the 1–5 "feel of the city" scores are indicative editorial figures, not sourced data.
- **Have a counsellor check** the visa summaries and FAQ answers, and the part-time work hour limits.
- Testimonials were deliberately left out until there are verified ones to show.

## universities.html (generated)

`universities.html` and its assets are still produced by the shared toolchain in `../_tooling`
(`build_dataset_nz.py`, `build_unipage.py newzealand`). Its header links back to `index.html#contact`
and similar old anchors; `nz.js` maps those to the new section ids, so they keep working.

### The dataset

195 providers from **NZQA's "Find Education Organisations" register**, filtered to
**Code of Practice signatory status = Y** (snapshot in
`_tooling/reference/nzqa-code-signatories.json`). Nothing is invented and the list is not padded.

**That filter is the whole point.** A provider that has not signed the Education (Pastoral Care of
Tertiary and International Learners) Code of Practice 2021 **may not legally enrol an international
student**. The reference card markup hardcodes `Intl. Admits: Yes` for every institution it renders,
and on this page — for the first time across the five countries — that claim is *exactly* what the
register field means. So, unlike Germany, where nine Verwaltungshochschulen had to be dropped
because the page would have misdescribed them, **no provider needed excluding by editorial
judgement**. The filter does the work at the source.

- **Composition:** 8 universities, 17 institutes of technology, 1 wānanga, 169 private training
  establishments.
- **Ordering:** the 8 universities by QS World 2026 rank; then institutes of technology and the
  wānanga; then the private training establishments — each group by NZQA category, then
  alphabetically.
- **Flagship group:** **University** — the eight institutions the Education and Training Act 2020
  lets use the title. Replaces the UK's Russell Group, Canada's U15 and Germany's TU9.
- **Regions:** NZQA's own 21 region codes, which are *not* the 16 local-government regions — they
  split Canterbury and Otago and carry a Pacific Islands code. Head-office city comes from the
  provider page; the city→region table is seeded for the main centres and otherwise learned from
  the providers that operate in exactly one region.
- **Editorial fields** are marked as such in the generated file's header: `programs` is an
  indicative subject descriptor, written per institution for the 26 public providers and derived by
  rule from the registered name for the 169 PTEs; `alt` is the search-only alias list.

### Known issues to settle before launch

1. **Annual figures need re-checking each intake.** The NZ$20,000 living-costs threshold, the
   NZ$850 visa fee, the NZ$1,670 PSWV fee, the NZ$23.95 minimum wage and the NZ$25,000–NZ$50,000
   tuition range all move. They are flagged **[annual]** in `_tooling/NEW_ZEALAND_SPEC.md`.
2. **`programs` is editorial**, not a course inventory, and 169 of the 195 descriptors are
   rule-derived from the provider's registered name. Fine as a descriptor; do not present it as an
   admissions guarantee.
3. **Some registered names are awkward** — `(i) FocusFutures, (ii) Elite Management School`,
   `Connexis, Competenz, ServiceIQ, Careerforce, Primary ITO, EarnLearn`. They are shown verbatim
   because the register name is what appears on an Offer of Place. Tidying them would mean
   inventing names.
4. **The vocational sector is mid-reorganisation.** Te Pūkenga was renamed the New Zealand
   Institute of Skills and Technology and ten ITPs were re-established on 1 January 2026, with full
   disestablishment due by March 2027. The register still lists the umbrella body, and 14 providers
   have no EER category yet for the same reason. Re-run `build_dataset_nz.py --refresh` before
   launch and again after each intake.
