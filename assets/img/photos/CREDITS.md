# Photo credits

All four photographs are New Zealand subjects sourced from Wikimedia Commons,
and — unusually for these pages — **all four are CC0**, so attribution is not
legally required. The footer credit line is kept anyway as a courtesy and
because the `data-photo-credit` element is part of the shared markup; if you
swap any photo, update this file **and** `PHOTO_CREDIT` in
`_tooling/localise_nz.py`, then re-run `localise_nz.py`, `assemble.py newzealand`
and `build_unipage.py newzealand`.

CC BY-SA, NC and ND images were deliberately avoided, as on the UK, Canadian,
Irish and German pages.

Each file was cropped and resized from the Commons original with `sips`. The
output dimensions match the German, Irish and Canadian files, which in turn match
the slots, so the layout cannot shift.

**No photograph has an identifiable person as its subject** — the same rule the
other four pages follow. One otherwise good candidate (a Napier art-deco
streetscape, CC BY 2.0) was rejected for exactly this reason: two pedestrians
stand in the near foreground and the frame is dominated by shop branding.

---

## students-campus.jpg — hero (`#home`), 1200×1143

> **The filename does not describe the subject**, and it is kept because
> `students-campus.jpg` is a literal key in the compiled stylesheet — the class
> `bg-[url('/assets/img/photos/students-campus.jpg')]` plus the matching escaped
> selector and `url()` in `assets/css/main.css`, and the `<link rel="preload">`
> in the page shell. Renaming the file means editing all of those together;
> `verify_site.py` fails on a mismatch, the browser fails silently.

- **Depicts:** the Clocktower (Registry) Building of the University of Otago,
  Dunedin — the most recognisable university building in New Zealand, and the
  direct counterpart of the UK page's Radcliffe Camera and Ireland's Campanile.
- **Commons file page:** https://commons.wikimedia.org/wiki/File:University_of_Otago_Clocktower._NZ_(22954035383).jpg
- **Author / photographer:** Bernard Spragg. NZ, Christchurch
- **Licence:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0
- **Attribution required:** no (credited anyway)
- **Crop:** original 4000×2702 → `sips -c 2702 2837 --cropOffset 0 0` (1.0499:1,
  anchored left) → resized to 1200×1143, quality 82.
  **The offset is load-bearing:** a centred crop pushes the clocktower to the
  left quarter of a near-square frame. Anchoring at x=0 drops the right-hand end
  of the long wing and the large tree instead, and leaves the tower close to the
  centre of the visible panel.
- **Why 1.05:1 and not a landscape file:** the hero panel measures about
  **596×584 CSS px on desktop (1.02:1) and 319×292 on mobile (1.09:1)** —
  essentially square at every breakpoint. The div is `bg-cover bg-center`, so a
  1.8:1 file would have roughly 43% of its width thrown away.
- **Safe to reshape:** referenced only as a CSS `background-image` and a
  `<link rel="preload">` — there is no `<img>` tag for it on either page, so its
  ratio has no effect on layout.

## team-working.jpg — `#relocate` ("The Pathway to Settlement"), 1400×933

- **Depicts:** the Great Hall and clock tower block of the Christchurch Arts
  Centre — the original Gothic Revival campus of Canterbury College, now the
  University of Canterbury.
- **Commons file page:** https://commons.wikimedia.org/wiki/File:Christchurch_Arts_Centre_-_Christchurch,_NZ_-_DSC01139.jpg
- **Author / photographer:** Daderot
- **Licence:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0
- **Attribution required:** no (credited anyway)
- **Crop:** original 5472×3648 is **already exactly 3:2**, so there is no crop —
  resized straight to 1400×933, quality 82.
- **Note:** this image is rendered with `w-full h-auto object-cover`, so **its
  aspect ratio drives the layout**. Any replacement must also be 3:2.

## family.jpg — `#relocate` ("Relocating with Your Family?"), 1400×1050

- **Depicts:** Queenstown and Lake Wakatipu from Bob's Peak, with the snow-capped
  Remarkables behind — the town's houses and streets fill the left half.
- **Commons file page:** https://commons.wikimedia.org/wiki/File:Queenstown._Lake_Wakatipu._(50854629786).jpg
- **Author / photographer:** Bernard Spragg. NZ, Christchurch
- **Licence:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0
- **Attribution required:** no (credited anyway)
- **Crop:** original 3872×2592 → `sips -c 2592 3456` (centred, exact 4:3) →
  resized to 1400×1050, quality 82.
- **Why this subject:** a place people live rather than people, the same trade
  the UK page makes with Notting Hill, Canada with Cabbagetown, Ireland with the
  Georgian doors and Germany with Quedlinburg. The slot renders at `h-[300px]`
  on desktop and `h-[180px]` on mobile with `object-cover`, so only a central
  band is ever seen — which here is the town, the lake and the mountain line.

## newzealand-city.jpg — `#universities` panel background, 1400×933

- **Depicts:** the Auckland city centre skyline with the Sky Tower, seen over
  the Parnell/Beach Road rooftops and nikau palms.
- **Commons file page:** https://commons.wikimedia.org/wiki/File:Auckland_skyline_PA01.jpg
- **Author / photographer:** Paora
- **Licence:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0
- **Attribution required:** no (credited anyway)
- **Crop:** original 5712×3486 → `sips -c 3486 5229` (centred, exact 3:2) →
  resized to 1400×933, quality 82.
- **Note:** this file is referenced by a Tailwind arbitrary-value class,
  `bg-[url('/assets/img/photos/newzealand-city.jpg')]`, which is a literal key
  into the compiled stylesheet. Renaming the file means editing **both** the
  class in the HTML and the escaped selector plus `url()` in
  `assets/css/main.css`. `verify_site.py` fails on a mismatch; the browser fails
  silently. That rule was renamed from `germany-city.jpg` when this page was
  scaffolded from the German assets.

---

## Combined credit line (as rendered in the footer)

> Photography: University of Otago Clocktower, Dunedin and Queenstown, Lake
> Wakatipu © Bernard Spragg. NZ (CC0); Auckland skyline © Paora (CC0);
> Christchurch Arts Centre © Daderot (CC0). Via Wikimedia Commons.

Generated from `PHOTO_CREDIT` in `_tooling/localise_nz.py` — change it there and
rebuild, never in the built HTML.
