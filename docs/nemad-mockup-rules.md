# Nemad Man — Product Gallery Mockup Rules

**Status:** Approved visual production brief — 2026-11-17.  
**Scope:** All future «نماد من» product-gallery mockups for the 12 zodiac months. This document records the mockup contract only; it does not change gallery implementation, approve production printing, or publish any product.

## Verified product constraints (main branch)

- **Gallery aspect ratio:** exactly **2:3 portrait** for «نماد من» product photos and mockups, not 4:5 or 1:1. The source is `components/shop/product-detail.module.css` (`.nemadMainPhoto`, `.nemadArtwork`, and mobile override).
- **Three real print sizes:** **10×15 cm**, **20×30 cm**, and **30×45 cm**, all portrait 2:3. Confirmed in `components/shop/product-detail-data.ts` (`SHOP_SIZES`) and `lib/shop/nemad-man-preview-export.ts` (`NEMAD_POSTER_SIZES`).
- **Physical presentation — hard requirement:** Halleus sells **only the frameless print mounted on shasi**. **Never place any frame around the poster in a mockup**: no wood/metal/plastic frame, border molding, picture-frame profile, mat/passe-partout, glass-front framing or decorative rim. Show the artwork printed directly on a frameless shasi with its honest unframed edge, whether wall-mounted or leaning. Do not imply a frame is included or available.

## Mandatory visual direction

1. Every final mockup image for the product gallery must be **2:3 portrait**. Maintain the whole poster in the correct **2:3 geometry** inside the scene; no squashing, stretching, or misleading crop.
2. The setting must be **premium, editorial, Pinterest-style, realistic, cohesive and uncluttered**. The poster is the hero; keep its actual details discernible at product-gallery scale.
3. Use Halleus's **cool, dark visual identity**: charcoal, slate, midnight-blue and cool blue/gray, with controlled soft/cool light. Favor the site's established dark shop colors such as `#111820`, `#243447`, `#3A4B5A`, `#BCCCDC` and `#D9EAFD`. **No warm cream, yellow/gold, or purple decorative aesthetic.** An original *light* poster variant must still remain light; never recolor the approved source artwork to suit the room.
4. **Use the actual exported Halleus PNGs**, not an AI redrawing of the zodiac wheel, symbols, stars, personal names, date, logo, glyphs or typography. Only the photographic/mockup environment, lighting, perspective and physically plausible positioning may change. Preserve artwork as exact source pixels wherever practicable, including on a perspective-transformed print surface. Never generate invented replacement lettering.
5. Show the **three actual sizes clearly across the gallery mockup set**. Each size must have an easy-to-understand, naturally placed real-world scale reference in the same scene (e.g. a standard book, desk lamp, chair, bedside table, desk, console or bed). The relative dimensions must be physically credible and visible at a glance. Use stable/common-size objects; don't artificially resize props to manufacture the comparison.
6. Label or identify the featured print size **10×15 / 20×30 / 30×45 cm** in gallery copy, caption or a restrained graphic annotation where necessary. A viewer must not have to guess which size a scene represents. Across four mockups of a month, cover **all three sizes**; the fourth may show an alternate room/view or light-vs-dark option. Do not pretend all three products are the same size.
7. Different mockups should vary meaningfully (surface/placement/camera/room, with accurate scale), while maintaining consistent art direction. **Every visible poster in every mockup must remain frameless**; the surrounding scene may include furniture and decor, but never a frame attached to the printed shasi.
8. Final acceptance: **2:3 export**, original poster details intact, cool-dark premium ambiance, physically realistic print scale, all three sizes communicated in the set, **absolutely no frame around any poster**, no invented product attributes.

## Provenance of original exports

Private backup repository: `bleucluod/halleus-gsc-private-backup`.  
Source directory: `Halleus-Nemad-Man-24-Exports-20261117/`.  
The original four `halleus-24-month-signs-10x15*.zip` exports and separately extracted month PNG files in that directory are reference assets. For Farvardin, select the 8 individual `01-farvardin-sign-{dark|light}-zip-{0|1|2|3}.png` files as appropriate for the four persons/two themes. **Do not infer a person's name from zip index; read the artwork**. Do not substitute generated images if a source image cannot be accessed.

## Change boundary

This commit is **documentation only**. No runtime/gallery/CSS change, artwork regeneration, print-size change, tag, release or deployment is authorized by recording this rule. When mockups are implemented, verify the real source assets and their scale against this document before adding them to product pages.
