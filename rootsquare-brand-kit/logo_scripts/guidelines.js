// 06_guidelines: clear-space diagram (SVG/PNG/PDF) and the one-page usage guide (PDF).
const L = require('./lib');
const { fs, path, KIT, C, f2 } = L;
const S = require('./scene');
const D = require('./docs');
const { Batch } = require('./ink');

const OUT = path.join(KIT, '06_guidelines');
const BLUE = '#3b82f6', GREY = '#6b6878', DO = '#1f7a4d', DONT = '#c0262d';
const T = (s, x, y, size, o = {}) => `<path fill="${o.fill || C.ink}" d="${L.textPath(D.sane(s), x, y, size, o.weight || 'Medium', o.anchor || 'start').d}"/>`;
const svgOf = (v, c = 'colour') => S.toSVG(S.build(v, c));

const MIN = [
  ['primary', '240 px wide', '40 mm wide', 'Below this the mesh lines thin to hairlines. Use the mark instead. Not for embroidery.'],
  ['mark', '16 px', '6 mm', 'Embroidery: at least 15 mm, flat version.'],
  ['wordmark', '80 px wide', '20 mm wide', ''],
  ['lockup-horizontal', '120 px wide', '30 mm wide', ''],
  ['lockup-stacked', '64 px wide', '18 mm wide', ''],
];
const NOTE = {
  primary: 'x = 1/4 of the window side', mark: 'x = 1/4 of the window side', wordmark: 'x = 1/2 of the cap height of R',
  'lockup-horizontal': 'x = 1/4 of the mark height', 'lockup-stacked': 'x = 1/4 of the mark height',
};

// One variant with its clear-space zone, fitted into a maxW x maxH cell centred on (cx, cy).
function clearCell(v, cx, cy, maxW, maxH, outlined = true) {
  const sc = S.build(v, 'colour');
  const c = S.clear[v];
  const [, , bw, bh] = sc.vb;
  const k = Math.min(maxW / (bw + 2 * c.x), maxH / (bh + 2 * c.x));
  const w = bw * k, h = bh * k, X = c.x * k, lx = cx - w / 2, ly = cy - h / 2;
  const lab = (s, x, y, size, o) => (outlined ? T(s, x, y, size, o) : D.text(s, x, y, size, o));
  const sq = (sx, sy) => D.rect(sx, sy, X, X, BLUE, `fill-opacity="0.18" stroke="${BLUE}" stroke-width="1"`) +
    lab('x', sx + X / 2, sy + X / 2 + Math.min(X * 0.55, 22) * 0.35, Math.min(X * 0.55, 22), { anchor: 'middle', fill: BLUE });
  return [
    D.rect(lx - X, ly - X, w + 2 * X, h + 2 * X, BLUE, `fill-opacity="0.05" stroke="${BLUE}" stroke-width="1.2" stroke-dasharray="6 4"`),
    D.rect(lx, ly, w, h, 'none', `stroke="${BLUE}" stroke-width="0.8"`),
    D.embed(S.toSVG(sc), lx, ly, w).svg,
    sq(lx - X, ly - X), sq(lx + w, ly - X), sq(lx - X, ly + h), sq(lx + w, ly + h),
  ].join('\n') + (outlined ? T(v, cx, cy + maxH / 2 + 34, 20, { anchor: 'middle', weight: 'SemiBold' }) +
    T(NOTE[v], cx, cy + maxH / 2 + 60, 16, { anchor: 'middle', fill: GREY }) : '');
}

function clearspace() {
  const W = 1800, H = 1240;
  const body = D.rect(0, 0, W, H, '#ffffff') +
    T('RootSquare clear space', 60, 70, 34, { weight: 'Bold' }) +
    T('Keep the shaded zone free of text, edges and other graphics. x scales with the logo.', 60, 104, 18, { fill: GREY }) +
    clearCell('primary', 300, 340, 420, 420) + clearCell('mark', 900, 340, 420, 420) + clearCell('lockup-stacked', 1500, 340, 480, 420) +
    clearCell('lockup-horizontal', 520, 930, 860, 300) + clearCell('wordmark', 1350, 930, 700, 300);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<title>RootSquare clear-space diagram</title>
${body}
</svg>
`;
}

// ---------- usage one-pager ----------
function tile(x, y, w, h, ground, art, ok, caption) {
  let s = D.rect(x, y, w, h, ground, ground === C.white ? 'stroke="#d9d6de" stroke-width="1"' : '');
  s += art(x, y, w, h);
  s += D.rect(x, y + h + 8, ok ? 30 : 42, 18, ok ? DO : DONT, 'rx="9"') + D.text(ok ? 'Do' : "Don't", x + (ok ? 15 : 21), y + h + 21, 10, { anchor: 'middle', fill: '#fff', weight: 'SemiBold' });
  s += D.para(caption, x + (ok ? 38 : 50), y + h + 21, w - (ok ? 38 : 50), 10, { fill: C.ink, lineHeight: 13 }).svg;
  return s;
}
function usage() {
  const pg = D.A4, M = 40, CW = pg.w - 2 * M;
  let b = '';
  b += D.embed(svgOf('mark'), M, 34, 34).svg;
  b += D.text('RootSquare logo usage', M + 48, 60, 24, { weight: 'Bold' });
  b += D.text(`v${L.VERSION} · ${L.DATE}`, pg.w - M, 60, 10.5, { anchor: 'end', fill: GREY });

  // 1. clear space
  let y = 104;
  const h2 = (s) => { b += D.text(s, M, y, 14, { weight: 'SemiBold' }); y += 10; };
  h2('1  Clear space');
  b += clearCell('mark', M + 70, y + 72, 120, 120, false);
  b += clearCell('lockup-horizontal', M + 300, y + 72, 250, 120, false);
  const cs = D.para('Keep a margin of x on every side, free of text, edges and other graphics. For the mark, the primary logo and both lockups, x = 1/4 of the window side (the mark\'s height). For the wordmark alone, x = 1/2 of the cap height of R. Full diagram: rootsquare_clearspace_colour_rgb.svg.', M + 470, y + 22, CW - 470, 10, { fill: C.ink, lineHeight: 14 });
  b += cs.svg;
  y += 160;

  // 2. minimum size
  h2('2  Minimum size');
  y += 8;
  const cols = [M, M + 120, M + 210, M + 300];
  ['Variant', 'Screen', 'Print', 'Note'].forEach((t, i) => { b += D.text(t, cols[i], y, 9.5, { fill: GREY, weight: 'Medium' }); });
  y += 6;
  for (const [v, scr, prn, note] of MIN) {
    b += D.rect(M, y, CW, 0.6, '#e4e2e8');
    y += 15;
    b += D.text(v, cols[0], y, 10.5, { weight: 'Medium' }) + D.text(scr, cols[1], y, 10.5) + D.text(prn, cols[2], y, 10.5);
    if (note) b += D.para(note, cols[3], y, CW - (cols[3] - M), 9.5, { fill: GREY, lineHeight: 12 }).svg;
    y += 4;
  }
  y += 26;

  // 3. colour versions
  h2('3  Which version on which ground');
  y += 6;
  const vw = (CW - 3 * 12) / 4, vh = 70;
  const versions = [
    ['colour', C.white, 'Full colour', 'Default. White or light grounds.'],
    ['flat', C.white, 'Flat (Blazing Flame)', 'One-colour print, embroidery, signage.'],
    ['black', C.white, 'Black', 'One-colour black print, stamps, engraving.'],
    ['white', C.ink, 'White (reversed)', 'Shadow Grey, dark photos, orange or red grounds.'],
  ];
  versions.forEach(([c, ground, name, use], i) => {
    const x = M + i * (vw + 12);
    b += D.rect(x, y, vw, vh, ground, ground === C.white ? 'stroke="#d9d6de" stroke-width="1"' : '');
    b += D.embed(svgOf('mark', c), x + (vw - 46) / 2, y + 12, 46).svg;
    b += D.text(name, x, y + vh + 16, 10.5, { weight: 'SemiBold' });
    b += D.para(use, x, y + vh + 30, vw, 9.5, { fill: GREY, lineHeight: 12 }).svg;
  });
  y += vh + 70;

  // 4. do / don't
  h2('4  Do and don\'t');
  y += 6;
  const tw = (CW - 2 * 16) / 3, th = 150, MS = 80;
  const mk = (c = 'colour') => (x, yy, w, h) => D.embed(svgOf('mark', c), x + (w - MS) / 2, yy + (h - MS) / 2, MS).svg;
  const tiles = [
    [C.white, mk('colour'), true, 'Use the full-colour logo on white or light grounds.'],
    [C.ink, mk('white'), true, 'Use the white logo on dark grounds. The radical stays a cut-out.'],
    [C.white, (x, yy, w, h) => { const e = D.embed(svgOf('mark'), 0, 0, MS); return e.svg.replace(/<svg x="[^"]+" y="[^"]+" width="[^"]+" height="[^"]+"/, `<svg x="${f2(x + (w - MS * 1.5) / 2)}" y="${f2(yy + (h - MS * 0.9) / 2)}" width="${MS * 1.5}" height="${MS * 0.9}" preserveAspectRatio="none"`); }, false, 'Don\'t stretch, squash or rotate the logo.'],
    [C.white, (x, yy, w, h) => mk('colour')(x, yy, w, h).split(`stop-color="${C.orange}"`).join('stop-color="#3b82f6"').split(`stop-color="${C.red}"`).join('stop-color="#6d28d9"'), false, 'Don\'t recolour it or change the gradient.'],
    [C.ink, (x, yy, w, h) => { const k = MS / L.MARK_S, ox = x + (w - MS) / 2, oy = yy + (h - MS) / 2;
      return `<g transform="translate(${f2(ox)} ${f2(oy)}) scale(${k})"><path fill="#ffffff" d="${L.radicalD}"/></g>` + mk('colour')(x, yy, w, h); }, false, 'Don\'t fill the cut-out. On dark grounds use the white logo.'],
    [C.red, mk('colour'), false, 'Don\'t put the colour logo on orange or red grounds.'],
  ];
  tiles.forEach(([g, art, ok, cap], i) => {
    const x = M + (i % 3) * (tw + 16), yy = y + Math.floor(i / 3) * (th + 52);
    b += tile(x, yy, tw, th, g, art, ok, cap);
  });

  b += D.rect(M, pg.h - 46, CW, 0.6, '#e4e2e8');
  b += D.text('Files, formats and naming: README.md. Colours: 02_palette. Type: 03_typography.', M, pg.h - 30, 9, { fill: GREY });
  return D.page(pg, b, 'RootSquare logo usage');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const v of S.VARIANTS) S.build(v, 'colour'); // fills S.clear
  const cs = path.join(OUT, 'rootsquare_clearspace_colour_rgb.svg');
  const csText = clearspace();
  if (/<text|<image/.test(csText)) throw new Error('clear-space diagram must be outlined');
  fs.writeFileSync(cs, csText);
  const b = new Batch();
  b.png(cs, cs.replace('.svg', '_1800.png'), 1800, '#ffffff');
  b.vector(cs, cs.replace('.svg', '.pdf'));
  b.run('clear space');
  const preview = path.join(__dirname, '.tmp', 'usage.png');
  await D.pagesToPdf([usage()], path.join(OUT, 'rootsquare_usage-guidelines_colour_rgb.pdf'), { title: 'RootSquare logo usage v' + L.VERSION }, { png: () => preview, pngWidth: 1588 });
  console.log('fonts:', D.fontsIn(path.join(OUT, 'rootsquare_usage-guidelines_colour_rgb.pdf')).join(', '));
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { main, MIN, NOTE };
