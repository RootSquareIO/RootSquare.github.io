// 01_logos: every variant x colour in every format, plus the primary alternates.
const { execFileSync } = require('child_process');
const L = require('./lib');
const { fs, path, KIT } = L;
const S = require('./scene');
const { Batch } = require('./ink');
const P = require('./palette-data');

const TMP = path.join(__dirname, '.tmp', 'logos');
const PRINT_MM = 100; // longest edge of print vectors

const dir = (v, c, kind) => { const d = path.join(KIT, '01_logos', v, c, kind); fs.mkdirSync(d, { recursive: true }); return d; };
const name = (v, c, mode, px, ext) => `rootsquare_${v}_${c}_${mode}${px ? '_' + px : ''}.${ext}`;
const pngSizes = (v) => [256, 512, 1024, 2048].concat(v === 'primary' ? [4096] : []);

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  const { map: cmyk } = P.cmykTable();
  const b = new Batch(), vec = new Batch();
  const jpgs = [];

  for (const v of S.VARIANTS) for (const c of S.COLOURS) {
    const sc = S.build(v, c);
    const dig = dir(v, c, 'digital');
    const svg = path.join(dig, name(v, c, 'rgb', null, 'svg'));
    const text = S.toSVG(sc);
    if (/<text|<image|font-family|data:/.test(text)) throw new Error(`${v}/${c}: live text or embedded image`);
    fs.writeFileSync(svg, text);

    for (const px of pngSizes(v)) b.png(svg, path.join(dig, name(v, c, 'rgb', px, 'png')), px);
    if (v === 'primary' && c !== 'white') { // white on white would be blank
      const tmpPng = path.join(TMP, `${v}_${c}_white.png`);
      b.png(svg, tmpPng, 1024, '#ffffff');
      jpgs.push([tmpPng, path.join(dig, name(v, c, 'rgb', 1024, 'jpg'))]);
    }

    // print: RGB PDF + EPS from Inkscape at a 100 mm artboard; CMYK PDFs (one per press standard) written directly
    const prn = dir(v, c, 'print');
    const [, , w, h] = sc.vb;
    const size = w >= h ? [`${PRINT_MM}mm`, `${L.f2((PRINT_MM * h) / w)}mm`] : [`${L.f2((PRINT_MM * w) / h)}mm`, `${PRINT_MM}mm`];
    const pdfSvg = path.join(TMP, `${v}_${c}_print.svg`);
    fs.writeFileSync(pdfSvg, S.toSVG(sc, { size }));
    vec.vector(pdfSvg, path.join(prn, name(v, c, 'rgb', null, 'pdf')));
    const flat = S.flattenAlpha(sc);
    const epsSvg = path.join(TMP, `${v}_${c}_eps.svg`);
    fs.writeFileSync(epsSvg, S.toSVG(flat.scene, { size }));
    vec.vector(epsSvg, path.join(prn, name(v, c, 'rgb', null, 'eps')));
    if (flat.changed) console.log(`note: ${v}/${c} EPS has transparency flattened against white`);

    const whiteNote = c === 'white' ? ' White prints as no ink (the paper shows through); for white ink, foil or thread the printer must assign a spot colour.' : '';
    for (const id of P.ORDER) {
      const pr = P.PROFILES[id];
      const bytes = await S.toCMYKPdf(sc, cmyk[id], {
        title: `${sc.title}: CMYK for ${pr.label} (${pr.region}), a conversion, not a proof`,
        subject: P.CMYK_NOTE + whiteNote + (c === 'black' ? ' Black is solid K 100.' : ''),
        keywords: ['RootSquare', 'logo', v, c, 'CMYK', pr.outputCondition, 'conversion', 'not a proof'],
      }, PRINT_MM, pr);
      fs.writeFileSync(path.join(prn, name(v, c, `cmyk-${id}`, null, 'pdf')), bytes);
    }
  }

  // Alternates of the primary (other moments of the same wave field): SVG + PNGs, screen use.
  for (const a of S.ALTS) for (const c of S.COLOURS) {
    const d = path.join(KIT, '01_logos', 'primary-alternates', c, 'digital');
    fs.mkdirSync(d, { recursive: true });
    const svg = path.join(d, name(a.name, c, 'rgb', null, 'svg'));
    fs.writeFileSync(svg, S.toSVG(S.build(a.name, c)));
    for (const px of [1024, 2048]) b.png(svg, path.join(d, name(a.name, c, 'rgb', px, 'png')), px);
  }

  b.run('logo rasters');
  vec.run('logo vectors', 20);
  for (const [src, out] of jpgs) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-pix_fmt', 'yuvj444p', '-q:v', '2', out]);
  console.log('jpg', jpgs.length);

  // Vector hygiene: no raster images, no live text in any logo vector.
  const bad = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(path.join(KIT, '01_logos'))) {
    const ext = path.extname(f);
    if (!['.pdf', '.eps', '.svg'].includes(ext)) continue;
    const t = fs.readFileSync(f, 'latin1');
    if (ext === '.pdf' && /\/Subtype\s*\/Image|\/Font\b|\/ObjStm/.test(t)) bad.push(f);
    if (ext === '.eps' && /ImageType|colorimage|\bfindfont\b/.test(t)) bad.push(f);
    if (ext === '.svg' && /<text|<image|data:/.test(t)) bad.push(f);
    if (ext === '.svg' && /#f55d23|#f53d27/i.test(t)) bad.push(f + ' (logo tool colour, not the palette)');
  }
  if (bad.length) { console.log('VECTOR CHECK FAILED:\n' + bad.join('\n')); process.exitCode = 1; } else console.log('vector check: no images, no live text');
}
main().catch((e) => { console.error(e); process.exit(1); });
