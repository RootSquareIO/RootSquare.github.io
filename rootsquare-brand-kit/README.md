# RootSquare logo package

**Version 1.1 · 2026-10-26**

Everything needed to use the RootSquare logo on screen, in print, on social media and in motion. Start with “Which file do I need?” below; the usage rules are on one page in `06_guidelines/rootsquare_usage-guidelines_colour_rgb.pdf`.

## Contents

| Folder or file | What is in it |
|---|---|
| `01_logos/` | Five variations, each in four colour versions. `digital/` holds the SVG master, PNGs and JPG; `print/` holds the RGB PDF, the EPS, and two CMYK PDFs (North America and Europe). `primary-alternates/` holds three extra versions of the primary logo with the mesh at other moments of its wave. |
| `02_palette/` | The brand palette, which the logo uses: `palette.json`, `palette.css`, `palette.ase` (Adobe swatches) and a one-page palette sheet (PDF and PNG). |
| `03_typography/` | The Outfit font files (nine static weights and the variable font) with the OFL licence, and `typography.md`. |
| `04_social/` | LinkedIn avatar 400×400, LinkedIn banner 1584×396, Open Graph image 1200×630. |
| `05_motion/` | A 5-second loop of the primary logo: MP4 (H.264, on white) and WebM (VP9 with transparency). |
| `06_guidelines/` | Clear-space diagram (SVG, PNG, PDF) and the one-page usage guide (PDF). |
| `README.md`, `README.pdf` | This document. |
| `manifest.csv` | Every file with its dimensions, colour mode, size in bytes and SHA-256 checksum. |
| `contact_sheet.pdf` | Every artwork on a light and a dark ground, with the files made from it. |

## Which file do I need?

- Website, slides, documents: the SVG in `digital/`. Use a PNG where SVG is not accepted (512 or 1024 px suits most uses).
- Profile picture: `04_social/rootsquare_linkedin-avatar_colour_rgb_400.png`.
- A printer in North America: `print/…_cmyk-swop.pdf`. A printer in Europe: `print/…_cmyk-fogra39.pdf`. Ask for a proof either way. For older software that needs EPS, send the `_rgb.eps`.
- Embroidery, one-colour print, vinyl or signage: `mark/flat` or `wordmark/flat`. The primary logo’s mesh is too fine for these.
- Dark or photographic backgrounds: the `white` version.

## Variations

| Variation | Use |
|---|---|
| `primary` | The full composition: mesh, window and radical. For large, hero uses: website header, covers, signage. |
| `mark` | The window with the radical cut out, no mesh. For small sizes, avatars and app icons. The radical sits exactly where it sits in the primary logo. |
| `wordmark` | “RootSquare” in Outfit ExtraBold, converted to outlines. |
| `lockup-horizontal` | Mark and wordmark side by side. The wordmark’s capitals are 0.40 × the mark’s height, centred on it, 0.24 × the mark’s height away. |
| `lockup-stacked` | Mark above wordmark. The wordmark is 2.1 × the mark’s width, 0.20 × the mark’s height below it. |
| `primary-alt-1` to `-3` | The primary logo with the mesh at other moments of the same wave field: `primary-alt-1` (+1.2 s), `primary-alt-2` (+3.6 s), `primary-alt-3` (+6.0 s) after the main version. Same window, radical and colours; use any of them where the primary fits, for example to vary a series of covers. Screen files only (SVG and PNG). |

## Colour versions

| Version | What it is |
|---|---|
| `colour` | Full colour, with the Blaze Orange to Blazing Flame gradient. White or light grounds. |
| `flat` | One solid colour, Blazing Flame #FE3911, with no gradient or transparency. For one-colour print, embroidery and vinyl. |
| `black` | Solid black (#000000; K 100 in CMYK). |
| `white` | Solid white, for dark grounds. |

In every version the radical is a true cut-out: whatever is behind the logo shows through it. On a dark ground the radical reads dark, which is intended. Never fill it in.

## Naming convention

```
rootsquare_<variant>_<colour>_<rgb|cmyk-swop|cmyk-fogra39>[_<px>].<ext>
```

- `variant`: primary, mark, wordmark, lockup-horizontal, lockup-stacked, primary-alt-1 to -3. Other assets use a short descriptive name in the same slot (linkedin-avatar, palette-sheet, clearspace, primary-loop).
- `colour`: colour, flat, black or white.
- `rgb`, `cmyk-swop` or `cmyk-fogra39`: the colour space of the file, and for CMYK the press standard it was converted for.
- `px`: for raster files, the longest edge in pixels. Social images give the full size, for example `1584x396`.
- Lowercase throughout. Hyphens join words inside a part, underscores separate parts. File names never say “final”; the version is recorded here.
- Example: `rootsquare_mark_white_rgb_512.png`. Standard files keep their usual names: `palette.json`, `palette.css`, `palette.ase`, `typography.md`, the font files and `OFL.txt`.

## Formats

| Format | Details |
|---|---|
| SVG | The master artwork, in RGB. Every shape is a path: there is no live text and there are no embedded images. |
| PNG | Transparent background. 256, 512, 1024 and 2048 px on the longest edge, plus 4096 px for the primary logo. The primary alternates come at 1024 and 2048 px. |
| JPG | Primary logo on white, 1024 px, in the colour, flat and black versions. There is no white JPG because it would be blank. |
| PDF (rgb) | Vector, 100 mm on the longest edge; scale freely. No live text, no images. |
| EPS | Vector, PostScript level 3, about 100 mm (the EPS bounding box hugs the artwork, so sizes vary by a millimetre or two). EPS cannot hold transparency, so in the colour primary EPS the mesh’s fade is flattened against white: use that file on white only. |
| PDF (cmyk-swop, cmyk-fogra39) | Vector, DeviceCMYK, 100 mm, one file per press standard. Each names its standard in the PDF’s output intent. Conversions, not proofs: see below. |

## Print and CMYK

There are two CMYK versions of every logo: one for North America, converted for U.S. Web Coated (SWOP) v2, and one for Europe, converted for Coated FOGRA39 (ISO 12647-2:2004). Use the one that matches where the job is printed; if your printer names a different standard (for example GRACoL or FOGRA51), send the RGB PDF and let them convert it.

They are conversions, not proofs. Each colour is the closest colorimetric match (ΔE2000) to the screen colour that stays within the standard’s ink limit (300% for SWOP, 330% for FOGRA39), using Adobe’s profiles for the two standards.

- Gradients are real CMYK blends, not stepped bands.
- The colour primary’s mesh fades to 55% opacity towards its edges. In CMYK that fade prints as a 55% tint, which matches the screen version on white paper. Where mesh lines cross, the screen version is slightly darker and the print version is not.
- Black is solid K 100. White is no ink (0/0/0/0): the paper shows through. For white ink, foil or thread, the printer must assign a spot colour.
- Blaze Orange and Blazing Flame are brighter than process inks can print: the closest CMYK is up to ΔE 2.93 away in SWOP and 4.06 in FOGRA39, so the logo prints a little less vivid than on screen. Where the colour matters (signage, merchandise), print with spot inks: the nearest Pantones are Bright Orange C (Blaze Orange) and 172 C (Blazing Flame); check them against a physical guide.
- Ask your printer for a hard proof on their own press.

## Colours

The brand palette is RootSquare’s ten-colour palette, with its own names and in its own order; `palette.css` defines a variable for each. The logo uses two of them: Blaze Orange and Blazing Flame.

Website check: 8 of 10 colours match the website (`css/root-square.css`), which uses its own variable names (listed at the top of `palette.css`). Shadow Grey is #1b1825 on the site (`--ink`), ΔE 0.63, too small to see; Light Blue is #d3e7ee on the site (`--sky, --line`), ΔE 7.87, a visibly paler colour. This package uses the palette values.

| Colour | HEX | CMYK US (SWOP) | CMYK EU (FOGRA39) | Nearest Pantone* | Contrast on white / on Shadow Grey |
|---|---|---|---|---|---|
| Shadow Grey (--shadow-grey) | #1D1A27 | C25 M23 Y0 K95 | C51 M45 Y10 K91 | 532 C (ΔE 4.21) | 17.08:1 / same colour |
| Twilight Indigo (--twilight-indigo) | #37375E | C58 M53 Y0 K62 | C69 M61 Y0 K59 | 5265 C (ΔE 2.39) | 11.23:1 / 1.52:1 (under 3:1) |
| Chocolate Plum (--chocolate-plum) | #644041 | C10 M47 Y30 K68 | C25 M58 Y40 K63 | 7617 C (ΔE 3.54) | 8.93:1 / 1.91:1 (under 3:1) |
| Light Blue (--light-blue) | #AACFDD | C23 M0 Y1 K11 | C31 M0 Y5 K11 | 551 C (ΔE 2.35) | 1.66:1 (under 3:1) / 10.31:1 |
| White Smoke (--white-smoke) | #F5F5F5 | C0 M0 Y0 K3 | C0 M0 Y0 K4 | 663 C (ΔE 5.36) | 1.09:1 (under 3:1) / 15.67:1 |
| Powder Petal (--powder-petal) | #FFE8D9 | C0 M9 Y11 K0 | C0 M12 Y15 K0 | 7604 C (ΔE 7.32) | 1.18:1 (under 3:1) / 14.48:1 |
| Cherry Blossom (--cherry-blossom) | #FEA9AF | C0 M40 Y16 K0 | C0 M43 Y20 K0 | 176 C (ΔE 2.65) | 1.82:1 (under 3:1) / 9.36:1 |
| Blaze Orange (--blaze-orange) | #FD5A01 | C0 M74 Y95 K0 | C0 M70 Y88 K0 | Bright Orange C (ΔE 1.08) | 3.16:1 / 5.4:1 |
| Blazing Flame (--blazing-flame) | #FE3911 | C0 M85 Y94 K0 | C0 M79 Y84 K0 | 172 C (ΔE 1.68) | 3.62:1 / 4.72:1 |
| Electric Red (--electric-red) | #FE1100 | C0 M90 Y96 K0 | C0 M83 Y90 K0 | Bright Red C (ΔE 3.09) | 3.97:1 / 4.31:1 |

* Nearest match, verify against a physical guide. Full values, roles and notes: `02_palette/palette.json` and the palette sheet. Under 3:1 against white: Light Blue, White Smoke, Powder Petal, Cherry Blossom. Under 3:1 against Shadow Grey: Twilight Indigo, Chocolate Plum. Blaze Orange, Blazing Flame and Electric Red pass 3:1 on white but not 4.5:1, so do not use them for body text on white.

## Clear space and minimum size

Keep a margin of x on every side. For the mark, primary logo and lockups, x is a quarter of the window side; for the wordmark alone, x is half the cap height of the R. See `06_guidelines/rootsquare_clearspace_colour_rgb.svg`.

| Variation | Screen | Print | Note |
|---|---|---|---|
| primary | 240 px wide | 40 mm wide | Below this the mesh lines thin to hairlines. Use the mark instead. Not for embroidery. |
| mark | 16 px | 6 mm | Embroidery: at least 15 mm, flat version. |
| wordmark | 80 px wide | 20 mm wide |  |
| lockup-horizontal | 120 px wide | 30 mm wide |  |
| lockup-stacked | 64 px wide | 18 mm wide |  |

## Social

- LinkedIn avatar, 400×400: the mark, full-bleed on white.
- LinkedIn banner, 1584×396: the mesh band from the earlier 2256×382 banner, regenerated at this size from its saved settings. LinkedIn places the page logo over the lower left of the banner, so the band carries no text.
- Open Graph, 1200×630: the horizontal lockup centred on white.

## Motion

- `rootsquare_primary-loop_colour_rgb_1080.mp4`: 1080×1080, 30 fps, 5.0 s, H.264, on a white background (H.264 cannot carry transparency).
- `rootsquare_primary-loop_colour_rgb_1080.webm`: the same loop in VP9 with an alpha channel, so the background is transparent. Chrome, Edge and Firefox show the transparency; check other players before relying on it.
- Both files are encoded and tagged as BT.709 with the sRGB tone curve, which is what browsers expect, so the window and gradient show the same colours as the static logos (within dE 1). Like all web video, they store colour at half resolution, so the thin mesh lines look very slightly softer and less saturated than in the PNG and SVG files.
- The motion uses the same wave field, seed and settings as the logo tool. Each wave’s speed is rounded to a whole number of cycles per 5 seconds, so the last frame runs straight into the first with no jump.

## Checks

- `manifest.csv` lists every file in the package except itself (a file cannot contain its own checksum): path, format, width, height, units, colour mode, bytes, SHA-256.
- `contact_sheet.pdf` shows every artwork on a light ground (white) and a dark ground (Shadow Grey), labelled with the files produced from it.
- Automated checks run on this release: no logo vector contains text or images; documents embed only Outfit; the motion loop closes exactly; the WebM decodes with transparency.

## Sources and rebuilding

Built from the `Logo Material` folder in the website repository. The mesh and window come unchanged from the logo tool’s SVG export of the primary logo. The radical is rebuilt with the tool’s own code at the primary logo’s placement, so the mark and the primary match exactly. The mesh for the alternates, the banner and the motion loop is regenerated from the tool’s saved settings (the JSON files), and reproduces the original SVG exactly. The wordmark is set in Outfit ExtraBold (800) and converted to outlines, matching `RootSquare-letters.png`. The logo tool’s own oranges (#F55D23 and #F53D27) are replaced everywhere, in the window, wordmark and mesh, by Blaze Orange and Blazing Flame from the palette.

The scripts that build this package are in `logo_scripts/` in the website repository; its README explains how to rerun them.

## Version history

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-10-23 | First release; lockups as a sample only. |
| 1.1 | 2026-10-26 | Palette replaced with the official ten-colour brand palette, cross-checked against the website. Logo recoloured to the palette: Blaze Orange to Blazing Flame (it used #F55D23 to #F53D27, which are not palette colours); the flat logo is now Blazing Flame. Mark: radical moved to the primary logo’s placement (centred). Lockups approved and produced in every format. CMYK files for both North America (SWOP) and Europe (FOGRA39). Three primary alternates added. |

## Trademark

“RootSquare” and the RootSquare logos (primary logo, mark, wordmark and lockups) are trademarks of RootSquare. Use them only as supplied in this package and as described in the usage guide: do not redraw, alter, recolour, animate differently or combine them with other marks. The Outfit typeface is licensed separately under the SIL Open Font License, and that licence does not cover the logos.
