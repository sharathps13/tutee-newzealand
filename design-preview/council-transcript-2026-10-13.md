# LLM Council: NZ landing page redesign (2026-10-13)

## Original request
"Rework on the design of the entire page entirely. Make it as creative and visually appealing as possible. Create a design preview of how this would look like. COUNSIL THIS."

## Framed question
Tutee Connect's "Study in New Zealand from India" lead-gen page targets Indian students aged 18–28 and their parents, most of them arriving on mobile from paid ads. The only goal is leads: name, phone, email and a call slot. The current page has about 12 interactive set pieces: a night-sky parallax hero, a boarding-pass form, unverified stats (99% visa success, 200+ tie-ups, 5k+ students), a bank marquee, 10 reason cards plus postcards, an intake countdown, visa stamps, a document checklist with confetti, a 7-step scroll-drawn flight path, an SVG map with a university list, a loan slider, an FAQ, a final form and a footer. Constraints: static HTML/CSS/JS, strict CSP, existing data-* hooks and lead API, and 4 real photos. What creative direction should the redesign take, what should change and what should stay, and what are the biggest risks?

## Advisor responses (summarised)
- **Contrarian:** The brief itself is the fatal flaw: "as creative as possible" is the wrong goal. Get a baseline conversion rate first. Unverified claims are an ASCI and ad-policy liability. Put the form above the fold over the real Queenstown photo, cut 60% of the modules, and add real trust proof.
- **First Principles:** The real problem is getting a nervous parent on a cheap Android to hand over a phone number. That takes trust, speed and clarity. Use one strong visual idea and the real photos, add offices and named counsellors, and offer a 2-field fallback form. A/B test the result.
- **Expansionist:** Make the "Kiwi Passport" the spine of the page. Every widget should pre-fill a briefed lead. Add a Parent-view toggle, a stamp-collecting progress passport, a night-to-dawn story arc and a shareable "My NZ Plan" card. The risk is being too timid.
- **Outsider (parent / student):** The dad wants to know where the price is and who these people are. He doesn't understand "MAA→AKL". He wants rupee costs first, real faces, an address, and a call in Tamil. To him "99%" smells like a scam. The student finds the countdown and confetti childish, and the animation eats their data.
- **Executor:** Re-skin and cut rather than rebuild, and ship in a week. Keep the hooks and wrap them, don't replace them. Static sky on mobile. Preview the mobile hero first. A/B test on cost per lead, with an LCP target under 2.5s.

## Peer review (letter mapping: A Expansionist, B Outsider, C Contrarian, D Executor, E First Principles)
- Reviewer 1: D strongest. A has the biggest blind spot. Everyone missed DPDP consent, a speed-to-contact SLA, ad message match and the Dubai audience.
- Reviewer 2 (design craft): E strongest. A has the biggest blind spot. Everyone missed that the colour roles are muddy, that tokens should be fixed before the preview, and that a 360px mock is needed.
- Reviewer 3 (client relationship): A strongest. B has the biggest blind spot. Everyone missed showing creativity and credibility together, and making the design itself the trust signal.
- Reviewer 4 (CRO / performance): D strongest. A has the biggest blind spot. Everyone missed message match, field-level drop-off, lead-quality fields and webfont cost.
- Reviewer 5 (Indian families / accessibility): E strongest. A has the biggest blind spot. Everyone missed Tamil/Hindi copy, contrast for older parents, parent trust signals and DPDP.

## Chairman verdict
**Recommendation: "First Light."** New Zealand sees each day's sunrise among the first. The page scrolls from a Chennai night (teal) into an Aotearoa dawn (warm paper). One signature mark, a gold dawn line along the MAA→AKL arc, is drawn once. Palette roles: teal for dark surfaces and headings, paper as the reading ground, maroon for calls to action only, gold for the dawn line and highlights only. A self-hosted display serif, a sans for body text at 17px or larger, and Quicksand kept only for the boarding-pass labels.

**Section order:**
1. Photo hero with a slim 3-field pass form
2. Trust band (offices, counsellors)
3. Cost in rupees, with the loan slider and bank logos merged in
4. Four reasons, one per photo
5. Intakes, with no countdown
6. Five steps, with visas and documents folded in
7. Cities and universities
8. Parents' corner
9. FAQ and a final form pre-filled from the visitor's choices

**Cut:** confetti, the countdown, the stamps section, the postcard stack, the scroll-drawn flight path, the marquee and mobile parallax.

**Do first:** build and judge the 360px first screen, and add form-start tracking to the current page the same day as a baseline.
