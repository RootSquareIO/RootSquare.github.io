// 02_palette: palette.json, palette.css, palette.ase and the one-page palette sheet (PDF + PNG).
const L = require('./lib');
const { fs, path, KIT, C, f2 } = L;
const P = require('./palette-data');
const D = require('./docs');

const OUT = path.join(KIT, '02_palette');
const cmykStr = (c) => `C${c[0]} M${c[1]} Y${c[2]} K${c[3]}`;
const SOURCE = 'The official RootSquare palette, Shadow Grey to Electric Red. The logo uses Blaze Orange and Blazing Flame.';
const siteDiffs = (pal) => pal.brand.filter((c) => !c.site.matches);
const SITE_NOTE = (pal) => `Website check (css/root-square.css): ${pal.brand.length - siteDiffs(pal).length} of ${pal.brand.length} colours match. ` +
  siteDiffs(pal).map((c) => `${c.name} is ${c.site.hex.toUpperCase()} on the site (${c.site.css}, dE ${c.site.deltaE2000}${c.site.deltaE2000 < 1 ? ', not visible' : ', visibly different'})`).join('; ') + '.';

function json(pal) {
  const entry = (c) => ({
    name: c.name, css_variable: c.css, role: c.role, hex: c.hex, rgb: c.rgb,
    ...(c.hsl ? { hsl: c.hsl } : {}),
    cmyk: Object.fromEntries(P.ORDER.map((id) => [id, { standard: P.PROFILES[id].label, region: P.PROFILES[id].region,
      c: c.cmyk[id].values[0], m: c.cmyk[id].values[1], y: c.cmyk[id].values[2], k: c.cmyk[id].values[3], deltaE2000_vs_srgb: c.cmyk[id].deltaE2000 }])),
    pantone_nearest: c.pantone,
    wcag_contrast: { on_white: c.contrast.on_white, on_shadow_grey: c.contrast.on_dark },
    flags: c.flags,
    ...(c.site ? { website: { variable: c.site.css, value: c.site.hex, matches: c.site.matches, deltaE2000: c.site.deltaE2000 } } : {}),
  });
  const doc = {
    name: 'RootSquare palette', version: L.VERSION, date: L.DATE, source: SOURCE,
    notes: {
      cmyk: P.CMYK_NOTE,
      pantone: 'Nearest PANTONE Coated by dE2000 against Pantone\'s published sRGB values. Nearest match, verify against a physical guide.',
      contrast: `WCAG 2.x contrast ratio against white (#ffffff) and Shadow Grey (${C.ink}). Anything under 3:1 is flagged. 3:1 is the minimum for graphics and large text; body text needs 4.5:1.`,
      website: SITE_NOTE(pal),
      logo_white_black: 'The white logo is #ffffff (CMYK: no ink). The black logo is #000000 (CMYK: K 100 only).',
    },
    brand: pal.brand.map(entry),
    logo: {
      gradient: { from: 'Blaze Orange', to: 'Blazing Flame', direction: 'top-left to bottom-right', css: 'linear-gradient(135deg, var(--blaze-orange) 0%, var(--blazing-flame) 100%)' },
      mesh: 'Blazing Flame at the centre, fading to Blaze Orange at 55% opacity towards the edges',
      flat: 'Blazing Flame',
    },
  };
  fs.writeFileSync(path.join(OUT, 'palette.json'), JSON.stringify(doc, null, 2) + '\n');
}

function css(pal) {
  const pad = Math.max(...pal.brand.map((c) => c.css.length)) + 12; // ': #rrggbb;' + a space
  const line = (c) => `  ${(c.css + ': ' + c.hex + ';').padEnd(pad)}/* ${c.name} */`;
  const map = pal.brand.map((c) => `   ${c.site.css.padEnd(14)} -> ${c.css}${c.site.matches ? '' : `   (site uses ${c.site.hex}; palette is ${c.hex})`}`).join('\n');
  fs.writeFileSync(path.join(OUT, 'palette.css'), `/* RootSquare palette v${L.VERSION} (${L.DATE})
 * Screen colours (sRGB). For print values see palette.json; CMYK figures are conversions,
 * not proofs.
 *
 * The website (css/root-square.css) uses its own variable names for the same colours:
${map}
 */
:root {
  /* brand palette */
${pal.brand.map(line).join('\n')}

  /* the logo gradient: Blaze Orange to Blazing Flame, top-left to bottom-right */
  --logo-gradient: linear-gradient(135deg, var(--blaze-orange) 0%, var(--blazing-flame) 100%);
}
`);
}

// Adobe Swatch Exchange: one group per colour space, global swatches.
function ase(pal) {
  const blocks = [];
  const str = (s) => { const b = Buffer.alloc(2 + (s.length + 1) * 2); b.writeUInt16BE(s.length + 1, 0); for (let i = 0; i < s.length; i++) b.writeUInt16BE(s.charCodeAt(i), 2 + i * 2); return b; };
  const block = (type, body) => { const h = Buffer.alloc(6); h.writeUInt16BE(type, 0); h.writeUInt32BE(body.length, 2); return Buffer.concat([h, body]); };
  const colour = (nm, model, vals) => {
    const v = Buffer.alloc(4 + vals.length * 4 + 2);
    v.write(model.padEnd(4, ' '), 0, 'ascii');
    vals.forEach((x, i) => v.writeFloatBE(x, 4 + i * 4));
    v.writeUInt16BE(0, 4 + vals.length * 4); // 0 = global
    return block(0x0001, Buffer.concat([str(nm), v]));
  };
  const group = (name, items) => { blocks.push(block(0xc001, str(name))); items.forEach((b) => blocks.push(b)); blocks.push(block(0xc002, Buffer.alloc(0))); };
  const all = pal.brand;
  group(`RootSquare v${L.VERSION} (RGB)`, all.map((c) => colour(`${c.name} ${c.hex}`, 'RGB', c.rgb.map((x) => x / 255))));
  for (const id of P.ORDER) {
    group(`RootSquare v${L.VERSION} (CMYK ${P.PROFILES[id].outputCondition === 'FOGRA39' ? 'FOGRA39, Europe' : 'SWOP, North America'})`,
      all.map((c) => colour(`${c.name} ${id.toUpperCase()}`, 'CMYK', c.cmyk[id].values.map((x) => x / 100))));
  }
  const head = Buffer.alloc(12);
  head.write('ASEF', 0, 'ascii'); head.writeUInt16BE(1, 4); head.writeUInt16BE(0, 6); head.writeUInt32BE(blocks.length, 8);
  fs.writeFileSync(path.join(OUT, 'palette.ase'), Buffer.concat([head, ...blocks]));
}

// One A4 landscape page: a row per colour.
function sheetSvg(pal) {
  const pg = D.A4L, M = 34, W = pg.w - 2 * M;
  const GREY = '#6b6878', RED = '#c0262d';
  const cols = [['', 48], ['Colour', 96], ['Role', 214], ['HEX', 58], ['RGB', 74], ['CMYK US (SWOP)*', 96], ['CMYK EU (FOGRA39)*', 102], ['Nearest Pantone**', 118], ['On white', 72], ['On Shadow Grey', 72]];
  const gap = (W - cols.reduce((a, c) => a + c[1], 0)) / (cols.length - 1);
  const xs = []; let acc = M; for (const [, w] of cols) { xs.push(acc); acc += w + gap; }
  let b = D.text('RootSquare colour palette', M, 52, 24, { weight: 'Bold' });
  b += D.text(`v${L.VERSION} · ${L.DATE}`, pg.w - M, 52, 10.5, { anchor: 'end', fill: GREY });
  b += D.para(SOURCE, M, 72, W, 9, { fill: GREY, lineHeight: 12 }).svg;
  let y = 98;
  b += D.rect(M, y, W, 20, '#f3f2f5');
  cols.forEach(([h], i) => { b += D.text(h, xs[i] + 2, y + 13.5, 8.5, { weight: 'SemiBold', fill: '#4a4756' }); });
  y += 20;
  const RH = 39;
  const con = (v, x, yy) => {
    if (v === null) return D.text('same colour', x + 2, yy + 17, 8.5, { fill: GREY });
    const ok = v >= 3;
    return D.text(`${v.toFixed(2)}:1`, x + 2, yy + 15, 9.5, { weight: ok ? 'Regular' : 'Bold', fill: ok ? C.ink : RED }) +
      D.text(ok ? (v >= 4.5 ? 'text + graphics' : 'graphics only') : 'UNDER 3:1', x + 2, yy + 27, 8, { fill: ok ? GREY : RED, weight: ok ? 'Regular' : 'SemiBold' });
  };
  const section = (title, list) => {
    b += D.text(title, M, y + 22, 11.5, { weight: 'SemiBold' }); y += 30;
    for (const c of list) {
      b += D.rect(xs[0], y + 4, cols[0][1], RH - 8, c.hex, c.hex === '#ffffff' || c.contrast.on_white < 1.3 ? 'stroke="#d9d6de" stroke-width="0.8" rx="3"' : 'rx="3"');
      b += D.text(c.name, xs[1] + 2, y + 15, 10.5, { weight: 'SemiBold' }) + D.text(c.css, xs[1] + 2, y + 27, 8.5, { fill: GREY });
      b += D.para(c.role, xs[2] + 2, y + 14, cols[2][1] - 4, 8.5, { fill: '#4a4756', lineHeight: 11 }).svg;
      b += D.text(c.hex.toUpperCase(), xs[3] + 2, y + 15, 9.5, { weight: 'SemiBold' });
      if (c.site && !c.site.matches) b += D.text(`site ${c.site.hex.toUpperCase()}***`, xs[3] + 2, y + 27, 7.5, { fill: RED });
      b += D.text(c.rgb.join(' / '), xs[4] + 2, y + 15, 9.5);
      P.ORDER.forEach((id, k) => { b += D.text(cmykStr(c.cmyk[id].values), xs[5 + k] + 2, y + 15, 9.5); });
      b += D.text(c.pantone.name.replace('PANTONE ', ''), xs[7] + 2, y + 15, 9.5) + D.text(`dE ${c.pantone.deltaE2000}, nearest match`, xs[7] + 2, y + 27, 8, { fill: GREY });
      b += con(c.contrast.on_white, xs[8], y) + con(c.contrast.on_dark, xs[9], y);
      b += D.rect(M, y + RH, W, 0.6, '#e4e2e8');
      y += RH;
    }
  };
  section('Brand palette', pal.brand);
  // the logo is drawn in palette colours only
  y += 14;
  b += D.text('The logo', M, y + 13, 11.5, { weight: 'SemiBold' });
  b += `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.orange}"/><stop offset="1" stop-color="${C.red}"/></linearGradient></defs>`;
  b += D.rect(xs[1] + 2, y + 1, 150, 16, 'url(#g)', 'rx="3"');
  b += D.text('Gradient: Blaze Orange to Blazing Flame, top-left to bottom-right. Flat logo: Blazing Flame. White logo: no ink. Black logo: K 100 only.', xs[1] + 166, y + 13, 9.5, { fill: '#4a4756' });
  y += 34;
  for (const note of [
    '* ' + P.CMYK_NOTE,
    '** Nearest PANTONE Coated by dE2000 against Pantone\'s published sRGB values: nearest match, verify against a physical guide before specifying a spot colour.',
    'Contrast: WCAG 2.x ratio against white and against Shadow Grey. 3:1 is the minimum for logos, icons and large text; body text needs 4.5:1. Anything under 3:1 is flagged in red.',
    '*** ' + SITE_NOTE(pal),
  ]) { const p = D.para(note, M, y, W, 8.5, { fill: '#4a4756', lineHeight: 11.5 }); b += p.svg; y += p.height + 3; }
  return D.page(pg, b, 'RootSquare colour palette');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const pal = P.palette();
  json(pal); css(pal); ase(pal);
  const png = path.join(OUT, 'rootsquare_palette-sheet_colour_rgb.png');
  await D.pagesToPdf([sheetSvg(pal)], path.join(OUT, 'rootsquare_palette-sheet_colour_rgb.pdf'),
    { title: 'RootSquare colour palette v' + L.VERSION, subject: P.CMYK_NOTE }, { png: () => png, pngWidth: 2245 });
  console.log('palette done; fonts:', D.fontsIn(path.join(OUT, 'rootsquare_palette-sheet_colour_rgb.pdf')).join(', '));
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { main };
