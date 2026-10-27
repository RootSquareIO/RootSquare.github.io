// README.md + README.pdf from one block list.
const L = require('./lib');
const { fs, path, KIT, C } = L;
const D = require('./docs');
const P = require('./palette-data');
const G = require('./guidelines');
const S = require('./scene');

function blocks() {
  const pal = P.palette();
  const cm = (c) => `C${c[0]} M${c[1]} Y${c[2]} K${c[3]}`;
  const ratio = (v) => (v === null ? 'same colour' : `${v}:1${v < 3 ? ' (under 3:1)' : ''}`);
  const colourRow = (c) => [`${c.name} (${c.css})`, c.hex.toUpperCase(), cm(c.cmyk.swop.values), cm(c.cmyk.fogra39.values),
    `${c.pantone.name.replace('PANTONE ', '')} (ΔE ${c.pantone.deltaE2000})`, `${ratio(c.contrast.on_white)} / ${ratio(c.contrast.on_dark)}`];
  const colourHead = ['Colour', 'HEX', 'CMYK US (SWOP)', 'CMYK EU (FOGRA39)', 'Nearest Pantone*', 'Contrast on white / on Shadow Grey'];
  const colourCols = [0.17, 0.1, 0.16, 0.17, 0.18, 0.22];
  const under = (list, k) => list.filter((c) => c.contrast[k] !== null && c.contrast[k] < 3).map((c) => c.name).join(', ');
  const byKey = (k) => pal.brand.find((c) => c.key === k);
  const logoCols = [byKey('blaze-orange'), byKey('blazing-flame')];
  const worst = (id) => Math.max(...logoCols.map((c) => c.cmyk[id].deltaE2000));
  const gamutNote = `Blaze Orange and Blazing Flame are brighter than process inks can print: the closest CMYK is up to ΔE ${worst('swop')} away in SWOP and ${worst('fogra39')} in FOGRA39, so the logo prints a little less vivid than on screen. Where the colour matters (signage, merchandise), print with spot inks: the nearest Pantones are ${logoCols.map((c) => c.pantone.name.replace('PANTONE ', '') + ' (' + c.name + ')').join(' and ')}; check them against a physical guide.`;
  const alts = S.ALTS.map((a) => `\`${a.name}\` (+${(a.dt / 1000).toFixed(1)} s)`).join(', ');
  return [
    { h1: 'RootSquare logo package' },
    { meta: `Version ${L.VERSION} · ${L.DATE}` },
    { p: 'Everything needed to use the RootSquare logo on screen, in print, on social media and in motion. Start with “Which file do I need?” below; the usage rules are on one page in `06_guidelines/rootsquare_usage-guidelines_colour_rgb.pdf`.' },

    { h2: 'Contents' },
    { table: { cols: [0.3, 0.7], head: ['Folder or file', 'What is in it'], rows: [
      ['`01_logos/`', 'Five variations, each in four colour versions. `digital/` holds the SVG master, PNGs and JPG; `print/` holds the RGB PDF, the EPS, and two CMYK PDFs (North America and Europe). `primary-alternates/` holds three extra versions of the primary logo with the mesh at other moments of its wave.'],
      ['`02_palette/`', 'The brand palette, which the logo uses: `palette.json`, `palette.css`, `palette.ase` (Adobe swatches) and a one-page palette sheet (PDF and PNG).'],
      ['`03_typography/`', 'The Outfit font files (nine static weights and the variable font) with the OFL licence, and `typography.md`.'],
      ['`04_social/`', 'LinkedIn avatar 400×400, LinkedIn banner 1584×396, Open Graph image 1200×630.'],
      ['`05_motion/`', 'A 5-second loop of the primary logo: MP4 (H.264, on white) and WebM (VP9 with transparency).'],
      ['`06_guidelines/`', 'Clear-space diagram (SVG, PNG, PDF) and the one-page usage guide (PDF).'],
      ['`README.md`, `README.pdf`', 'This document.'],
      ['`manifest.csv`', 'Every file with its dimensions, colour mode, size in bytes and SHA-256 checksum.'],
      ['`contact_sheet.pdf`', 'Every artwork on a light and a dark ground, with the files made from it.'],
    ] } },

    { h2: 'Which file do I need?' },
    { ul: [
      'Website, slides, documents: the SVG in `digital/`. Use a PNG where SVG is not accepted (512 or 1024 px suits most uses).',
      'Profile picture: `04_social/rootsquare_linkedin-avatar_colour_rgb_400.png`.',
      'A printer in North America: `print/…_cmyk-swop.pdf`. A printer in Europe: `print/…_cmyk-fogra39.pdf`. Ask for a proof either way. For older software that needs EPS, send the `_rgb.eps`.',
      'Embroidery, one-colour print, vinyl or signage: `mark/flat` or `wordmark/flat`. The primary logo’s mesh is too fine for these.',
      'Dark or photographic backgrounds: the `white` version.',
    ] },

    { h2: 'Variations' },
    { table: { cols: [0.27, 0.73], head: ['Variation', 'Use'], rows: [
      ['`primary`', 'The full composition: mesh, window and radical. For large, hero uses: website header, covers, signage.'],
      ['`mark`', 'The window with the radical cut out, no mesh. For small sizes, avatars and app icons. The radical sits exactly where it sits in the primary logo.'],
      ['`wordmark`', '“RootSquare” in Outfit ExtraBold, converted to outlines.'],
      ['`lockup-horizontal`', 'Mark and wordmark side by side. The wordmark’s capitals are 0.40 × the mark’s height, centred on it, 0.24 × the mark’s height away.'],
      ['`lockup-stacked`', 'Mark above wordmark. The wordmark is 2.1 × the mark’s width, 0.20 × the mark’s height below it.'],
      ['`primary-alt-1` to `-3`', `The primary logo with the mesh at other moments of the same wave field: ${alts} after the main version. Same window, radical and colours; use any of them where the primary fits, for example to vary a series of covers. Screen files only (SVG and PNG).`],
    ] } },

    { h2: 'Colour versions' },
    { table: { cols: [0.17, 0.83], head: ['Version', 'What it is'], rows: [
      ['`colour`', 'Full colour, with the Blaze Orange to Blazing Flame gradient. White or light grounds.'],
      ['`flat`', `One solid colour, Blazing Flame ${C.red.toUpperCase()}, with no gradient or transparency. For one-colour print, embroidery and vinyl.`],
      ['`black`', 'Solid black (#000000; K 100 in CMYK).'],
      ['`white`', 'Solid white, for dark grounds.'],
    ] } },
    { p: 'In every version the radical is a true cut-out: whatever is behind the logo shows through it. On a dark ground the radical reads dark, which is intended. Never fill it in.' },

    { h2: 'Naming convention' },
    { code: 'rootsquare_<variant>_<colour>_<rgb|cmyk-swop|cmyk-fogra39>[_<px>].<ext>' },
    { ul: [
      '`variant`: primary, mark, wordmark, lockup-horizontal, lockup-stacked, primary-alt-1 to -3. Other assets use a short descriptive name in the same slot (linkedin-avatar, palette-sheet, clearspace, primary-loop).',
      '`colour`: colour, flat, black or white.',
      '`rgb`, `cmyk-swop` or `cmyk-fogra39`: the colour space of the file, and for CMYK the press standard it was converted for.',
      '`px`: for raster files, the longest edge in pixels. Social images give the full size, for example `1584x396`.',
      'Lowercase throughout. Hyphens join words inside a part, underscores separate parts. File names never say “final”; the version is recorded here.',
      'Example: `rootsquare_mark_white_rgb_512.png`. Standard files keep their usual names: `palette.json`, `palette.css`, `palette.ase`, `typography.md`, the font files and `OFL.txt`.',
    ] },

    { h2: 'Formats' },
    { table: { cols: [0.2, 0.8], head: ['Format', 'Details'], rows: [
      ['SVG', 'The master artwork, in RGB. Every shape is a path: there is no live text and there are no embedded images.'],
      ['PNG', 'Transparent background. 256, 512, 1024 and 2048 px on the longest edge, plus 4096 px for the primary logo. The primary alternates come at 1024 and 2048 px.'],
      ['JPG', 'Primary logo on white, 1024 px, in the colour, flat and black versions. There is no white JPG because it would be blank.'],
      ['PDF (rgb)', 'Vector, 100 mm on the longest edge; scale freely. No live text, no images.'],
      ['EPS', 'Vector, PostScript level 3, about 100 mm (the EPS bounding box hugs the artwork, so sizes vary by a millimetre or two). EPS cannot hold transparency, so in the colour primary EPS the mesh’s fade is flattened against white: use that file on white only.'],
      ['PDF (cmyk-swop, cmyk-fogra39)', 'Vector, DeviceCMYK, 100 mm, one file per press standard. Each names its standard in the PDF’s output intent. Conversions, not proofs: see below.'],
    ] } },

    { h2: 'Print and CMYK' },
    { p: 'There are two CMYK versions of every logo: one for North America, converted for U.S. Web Coated (SWOP) v2, and one for Europe, converted for Coated FOGRA39 (ISO 12647-2:2004). Use the one that matches where the job is printed; if your printer names a different standard (for example GRACoL or FOGRA51), send the RGB PDF and let them convert it.' },
    { p: 'They are conversions, not proofs. Each colour is the closest colorimetric match (ΔE2000) to the screen colour that stays within the standard’s ink limit (300% for SWOP, 330% for FOGRA39), using Adobe’s profiles for the two standards.' },
    { ul: [
      'Gradients are real CMYK blends, not stepped bands.',
      'The colour primary’s mesh fades to 55% opacity towards its edges. In CMYK that fade prints as a 55% tint, which matches the screen version on white paper. Where mesh lines cross, the screen version is slightly darker and the print version is not.',
      'Black is solid K 100. White is no ink (0/0/0/0): the paper shows through. For white ink, foil or thread, the printer must assign a spot colour.',
      gamutNote,
      'Ask your printer for a hard proof on their own press.',
    ] },

    { h2: 'Colours' },
    { p: 'The brand palette is RootSquare’s ten-colour palette, with its own names and in its own order; `palette.css` defines a variable for each. The logo uses two of them: Blaze Orange and Blazing Flame.' },
    { p: `Website check: ${pal.brand.length - pal.brand.filter((c) => !c.site.matches).length} of ${pal.brand.length} colours match the website (\`css/root-square.css\`), which uses its own variable names (listed at the top of \`palette.css\`). ` +
      pal.brand.filter((c) => !c.site.matches).map((c) => `${c.name} is ${c.site.hex} on the site (\`${c.site.css}\`), ΔE ${c.site.deltaE2000}${c.site.deltaE2000 < 1 ? ', too small to see' : ', a visibly paler colour'}`).join('; ') + '. This package uses the palette values.' },
    { table: { cols: colourCols, head: colourHead, rows: pal.brand.map(colourRow) } },
    { p: `* Nearest match, verify against a physical guide. Full values, roles and notes: \`02_palette/palette.json\` and the palette sheet. Under 3:1 against white: ${under(pal.brand, 'on_white')}. Under 3:1 against Shadow Grey: ${under(pal.brand, 'on_dark')}. Blaze Orange, Blazing Flame and Electric Red pass 3:1 on white but not 4.5:1, so do not use them for body text on white.` },

    { h2: 'Clear space and minimum size' },
    { p: 'Keep a margin of x on every side. For the mark, primary logo and lockups, x is a quarter of the window side; for the wordmark alone, x is half the cap height of the R. See `06_guidelines/rootsquare_clearspace_colour_rgb.svg`.' },
    { table: { cols: [0.25, 0.17, 0.17, 0.41], head: ['Variation', 'Screen', 'Print', 'Note'], rows: G.MIN.map((r) => r.slice()) } },

    { h2: 'Social' },
    { ul: [
      'LinkedIn avatar, 400×400: the mark, full-bleed on white.',
      'LinkedIn banner, 1584×396: the mesh band from the earlier 2256×382 banner, regenerated at this size from its saved settings. LinkedIn places the page logo over the lower left of the banner, so the band carries no text.',
      'Open Graph, 1200×630: the horizontal lockup centred on white.',
    ] },

    { h2: 'Motion' },
    { ul: [
      '`rootsquare_primary-loop_colour_rgb_1080.mp4`: 1080×1080, 30 fps, 5.0 s, H.264, on a white background (H.264 cannot carry transparency).',
      '`rootsquare_primary-loop_colour_rgb_1080.webm`: the same loop in VP9 with an alpha channel, so the background is transparent. Chrome, Edge and Firefox show the transparency; check other players before relying on it.',
      'Both files are encoded and tagged as BT.709 with the sRGB tone curve, which is what browsers expect, so the window and gradient show the same colours as the static logos (within dE 1). Like all web video, they store colour at half resolution, so the thin mesh lines look very slightly softer and less saturated than in the PNG and SVG files.',
      'The motion uses the same wave field, seed and settings as the logo tool. Each wave’s speed is rounded to a whole number of cycles per 5 seconds, so the last frame runs straight into the first with no jump.',
    ] },

    { h2: 'Checks' },
    { ul: [
      '`manifest.csv` lists every file in the package except itself (a file cannot contain its own checksum): path, format, width, height, units, colour mode, bytes, SHA-256.',
      '`contact_sheet.pdf` shows every artwork on a light ground (white) and a dark ground (Shadow Grey), labelled with the files produced from it.',
      'Automated checks run on this release: no logo vector contains text or images; documents embed only Outfit; the motion loop closes exactly; the WebM decodes with transparency.',
    ] },

    { h2: 'Sources and rebuilding' },
    { p: 'Built from the `Logo Material` folder in the website repository. The mesh and window come unchanged from the logo tool’s SVG export of the primary logo. The radical is rebuilt with the tool’s own code at the primary logo’s placement, so the mark and the primary match exactly. The mesh for the alternates, the banner and the motion loop is regenerated from the tool’s saved settings (the JSON files), and reproduces the original SVG exactly. The wordmark is set in Outfit ExtraBold (800) and converted to outlines, matching `RootSquare-letters.png`. The logo tool’s own oranges (#F55D23 and #F53D27) are replaced everywhere, in the window, wordmark and mesh, by Blaze Orange and Blazing Flame from the palette.' },
    { p: 'The scripts that build this package are in `logo_scripts/` in the website repository; its README explains how to rerun them.' },

    { h2: 'Version history' },
    { table: { cols: [0.12, 0.18, 0.7], head: ['Version', 'Date', 'Changes'], rows: [
      ['1.0', '2026-10-23', 'First release; lockups as a sample only.'],
      [L.VERSION, L.DATE, 'Palette replaced with the official ten-colour brand palette, cross-checked against the website. Logo recoloured to the palette: Blaze Orange to Blazing Flame (it used #F55D23 to #F53D27, which are not palette colours); the flat logo is now Blazing Flame. Mark: radical moved to the primary logo’s placement (centred). Lockups approved and produced in every format. CMYK files for both North America (SWOP) and Europe (FOGRA39). Three primary alternates added.'],
    ] } },

    { h2: 'Trademark' },
    { p: '“RootSquare” and the RootSquare logos (primary logo, mark, wordmark and lockups) are trademarks of RootSquare. Use them only as supplied in this package and as described in the usage guide: do not redraw, alter, recolour, animate differently or combine them with other marks. The Outfit typeface is licensed separately under the SIL Open Font License, and that licence does not cover the logos.' },
  ];
}

// ---------- Markdown ----------
function toMd(bl) {
  const cell = (s) => String(s).replace(/\|/g, '\\|');
  return bl.map((b) => {
    if (b.h1) return `# ${b.h1}`;
    if (b.meta) return `**${b.meta}**`;
    if (b.h2) return `## ${b.h2}`;
    if (b.p) return b.p;
    if (b.note) return `> ${b.note}`;
    if (b.code) return '```\n' + b.code + '\n```';
    if (b.ul) return b.ul.map((x) => `- ${x}`).join('\n');
    if (b.table) return [`| ${b.table.head.join(' | ')} |`, `|${b.table.head.map(() => '---').join('|')}|`, ...b.table.rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');
    return '';
  }).join('\n\n') + '\n';
}

// ---------- PDF ----------
const plain = (s) => String(s).replace(/`/g, '').replace(/\*\*/g, '');
function toPages(bl) {
  const pg = D.A4, M = 56, CW = pg.w - 2 * M, BOTTOM = pg.h - 60;
  const pages = [];
  let body = '', y = 0;
  const newPage = () => {
    if (body) pages.push(body);
    body = ''; y = 70;
    if (pages.length) body += D.text(`RootSquare logo package · v${L.VERSION}`, M, 36, 8.5, { fill: '#8a8794' });
  };
  const need = (h) => { if (y + h > BOTTOM) newPage(); };
  newPage();
  for (const b of bl) {
    if (b.h1) { body += D.text(b.h1, M, y + 10, 28, { weight: 'Bold' }); y += 34; }
    else if (b.meta) { body += D.text(b.meta, M, y, 11, { fill: '#6b6878' }); y += 26; }
    else if (b.h2) { need(60); y += 14; body += D.text(b.h2, M, y, 15, { weight: 'SemiBold' }); y += 18; }
    else if (b.p || b.note) {
      const p = D.para(plain(b.p || b.note), M + (b.note ? 12 : 0), 0, CW - (b.note ? 24 : 0), 10, { lineHeight: 14.5 });
      need(p.height + 8);
      if (b.note) body += D.rect(M, y - 4, CW, p.height + 14, '#fff3ec', 'rx="3"') + D.rect(M, y - 4, 3, p.height + 14, C.orange);
      body += D.para(plain(b.p || b.note), M + (b.note ? 12 : 0), y + 8, CW - (b.note ? 24 : 0), 10, { lineHeight: 14.5 }).svg;
      y += p.height + (b.note ? 18 : 8);
    } else if (b.code) {
      need(30); body += D.rect(M, y, CW, 24, '#f3f2f5', 'rx="3"') + D.text(b.code, M + 10, y + 16, 10.5, { weight: 'Medium' }); y += 34;
    } else if (b.ul) {
      for (const it of b.ul) {
        const p = D.para(plain(it), M + 14, 0, CW - 14, 10, { lineHeight: 14.5 });
        need(p.height + 4);
        body += D.text('•', M + 2, y + 8, 10, { fill: C.orange }) + D.para(plain(it), M + 14, y + 8, CW - 14, 10, { lineHeight: 14.5 }).svg;
        y += p.height + 4;
      }
      y += 4;
    } else if (b.table) {
      const xs = []; let acc = M;
      b.table.cols.forEach((f) => { xs.push(acc); acc += f * CW; });
      const row = (cells, head) => {
        const ps = cells.map((c, i) => D.para(plain(c), xs[i] + 4, 0, b.table.cols[i] * CW - 10, head ? 9 : 9.5, { lineHeight: 13, weight: head ? 'SemiBold' : 'Regular' }));
        const h = Math.max(...ps.map((p) => p.height)) + 8;
        need(h);
        if (head) body += D.rect(M, y, CW, h, '#f3f2f5');
        else body += D.rect(M, y + h, CW, 0.6, '#e4e2e8');
        cells.forEach((c, i) => { body += D.para(plain(c), xs[i] + 4, y + 13, b.table.cols[i] * CW - 10, head ? 9 : 9.5, { lineHeight: 13, weight: head ? 'SemiBold' : 'Regular', fill: head ? '#4a4756' : C.ink }).svg; });
        y += h;
      };
      row(b.table.head, true);
      b.table.rows.forEach((r) => row(r, false));
      y += 10;
    }
  }
  pages.push(body);
  return pages.map((bd, i) => D.page(pg, bd + D.text(`${i + 1} / ${pages.length}`, pg.w - M, pg.h - 30, 8.5, { anchor: 'end', fill: '#8a8794' }), 'RootSquare logo package README'));
}

async function main() {
  const bl = blocks();
  fs.writeFileSync(path.join(KIT, 'README.md'), toMd(bl));
  const pages = toPages(bl);
  const out = path.join(KIT, 'README.pdf');
  await D.pagesToPdf(pages, out, { title: `RootSquare logo package v${L.VERSION} README` }, { png: (i) => path.join(__dirname, '.tmp', `readme_p${i}.png`), pngWidth: 1240 });
  console.log('README pages:', pages.length, 'fonts:', D.fontsIn(out).join(', '));
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { main };
