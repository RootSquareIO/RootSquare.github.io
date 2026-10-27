# logo_scripts

Builds the RootSquare logo package in `../rootsquare-brand-kit/` from the logo tool's exports in `../Logo Material/`. One command regenerates every file: logos in every colour and format, palette files, typography, social images, the motion loop, guidelines, README, contact sheet and manifest.

## Requirements

- **Windows 10 or 11.** The CMYK conversion uses Windows Color System through PowerShell.
- **Node.js 16 or later.**
- **Inkscape 1.x** at `C:/Program Files/Inkscape`. If it is installed elsewhere, set `INKSCAPE` to the full path of `inkscape.com`.
- **ffmpeg** on the `PATH`, built with libx264 and libvpx-vp9 (for the motion loop).
- **Internet access** only when a colour changes. The CMYK step then downloads Adobe's free ICC profiles (SWOP and FOGRA39) into `.cache/`. Their licence limits redistribution, so they are not committed.

## Run

```
npm install
npm run build
```

`npm run build` deletes `../rootsquare-brand-kit/` and rebuilds it; it takes about three minutes, and stops if a check fails. Each step can also be run on its own, in this order: `node logos.js`, `verify-pdf.js --fresh`, `social.js`, `palette.js`, `typography.js`, `guidelines.js`, `readme.js`, `contact.js`, `manifest.js`. The contact sheet and manifest describe whatever is in the folder, so run them last.

`verify-pdf.js` renders every CMYK PDF and its RGB twin with the Windows PDF engine (`winpdf.ps1`) and checks that their shapes match. Inkscape's PDF importer is not used for checking, because it drops the soft masks that carry the mesh's fade.

## Where to change things

| To change | Edit |
|---|---|
| Version number and date | `lib.js` (`VERSION`, `DATE`) |
| Logo colours (taken from the palette), flat colour | `lib.js` (`C`, `FLAT`, and `TOOL_TO_BRAND` for the logo tool's own oranges) |
| Where the radical sits in the mark | `lib.js` (`radicalPath(MARK_S)`; options `x`, `y` are the tool's cut-out offsets) |
| Lockup proportions | `scene.js` (`LOCK`) |
| Primary alternates (which moments of the wave) | `scene.js` (`ALTS`, in ms after the saved still frame) |
| Brand palette: names, values, roles, website cross-check | `palette-data.js` (`BRAND`) |
| Press standards for CMYK | `profiles.js` |
| Minimum sizes, do/don't examples | `guidelines.js` |
| README text | `readme.js` |
| Social images and the motion loop | `social.js` |

## Files

| File | What it does |
|---|---|
| `lib.js` | Paths, constants, source geometry, a port of the tool's radical construction, the outlined wordmark |
| `mesh.js` | A port of the logo tool's mesh generator; reproduces the tool's SVG exactly from its saved JSON settings |
| `scene.js` | Each logo as geometry; writes SVG, and writes CMYK PDFs directly (with CMYK gradients) |
| `colour.js`, `cmyk2rgb.ps1`, `profiles.js` | Colour maths, and the colorimetric sRGB to CMYK match through each press profile |
| `palette-data.js`, `palette.js` | Palette facts and the files in `02_palette/` |
| `ink.js`, `docs.js` | Batch exports through Inkscape; page layout for the PDF documents |
| `logos.js`, `social.js`, `typography.js`, `guidelines.js`, `readme.js`, `contact.js`, `manifest.js` | One step of the build each |
| `verify-pdf.js`, `winpdf.ps1` | Check that each CMYK PDF matches its RGB PDF, rendered by the Windows PDF engine |
| `cmyk-values.json` | Saved CMYK matches. Delete it to recompute them (needs the profiles) |
| `vendor/outfit/` | The Outfit typeface, SIL Open Font License (`OFL.txt`) |
| `vendor/pantone/coated.csv` | Pantone Coated sRGB reference values, from the MIT-licensed `pantoner` package (v1.1.2), used only to name the nearest match |

`.tmp/` (intermediate files) and `.cache/` (downloaded profiles) are ignored by git.
