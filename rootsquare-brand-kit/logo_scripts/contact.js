// contact_sheet.pdf: every artwork on light (white) and dark (Shadow Grey) grounds, labelled with its files.
const L = require('./lib');
const { fs, path, KIT, C, f2 } = L;
const S = require('./scene');
const D = require('./docs');

const rel = (f) => path.relative(KIT, f).replace(/\\/g, '/');
const ls = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => fs.statSync(path.join(d, f)).isFile()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : []);

function items() {
  const out = [];
  for (const v of S.VARIANTS) for (const c of S.COLOURS) {
    const dig = path.join(KIT, '01_logos', v, c, 'digital'), prn = path.join(KIT, '01_logos', v, c, 'print');
    out.push({ label: `${v} · ${c}`,
      files: [rel(dig) + '/', ...ls(dig), ...(ls(prn).length ? [rel(prn) + '/', ...ls(prn)] : [])],
      svg: path.join(dig, `rootsquare_${v}_${c}_rgb.svg`) });
  }
  for (const a of S.ALTS) for (const c of S.COLOURS) {
    const dig = path.join(KIT, '01_logos', 'primary-alternates', c, 'digital');
    out.push({ label: `${a.name} · ${c} (wave +${(a.dt / 1000).toFixed(1)} s)`, files: [rel(dig) + '/', ...ls(dig).filter((f) => f.includes(a.name + '_'))],
      svg: path.join(dig, `rootsquare_${a.name}_${c}_rgb.svg`) });
  }
  const so = path.join(KIT, '04_social');
  for (const f of ls(so)) out.push({ label: 'social · ' + f.split('_')[1], files: ['04_social/', f], png: path.join(so, f) });
  const mo = path.join(KIT, '05_motion');
  out.push({ label: 'motion · primary loop (frame 1 of 150)', files: ['05_motion/', ...ls(mo), 'MP4 plays on white; WebM is transparent.'], svg: path.join(__dirname, '.tmp', 'social', 'frames', 'f_000.svg') });
  const pa = path.join(KIT, '02_palette');
  out.push({ label: 'palette sheet + palette files', files: ['02_palette/', ...ls(pa)], png: path.join(pa, 'rootsquare_palette-sheet_colour_rgb.png') });
  out.push({ label: 'typography · Outfit', files: ['03_typography/', ...ls(path.join(KIT, '03_typography')), 'outfit/: ' + ls(path.join(KIT, '03_typography', 'outfit')).length + ' files (9 static weights, variable font, OFL.txt)'], specimen: true });
  const gu = path.join(KIT, '06_guidelines');
  out.push({ label: 'clear-space diagram', files: ['06_guidelines/', ...ls(gu).filter((f) => f.includes('clearspace'))], svg: path.join(gu, 'rootsquare_clearspace_colour_rgb.svg') });
  out.push({ label: 'usage guide (one page)', files: ['06_guidelines/', ...ls(gu).filter((f) => f.includes('usage'))], png: path.join(__dirname, '.tmp', 'usage.png') });
  out.push({ label: 'README', files: ['README.md', 'README.pdf', 'manifest.csv', 'contact_sheet.pdf (this file)'], png: path.join(__dirname, '.tmp', 'readme_p0.png') });
  return out;
}

function specimen(x, y, w, h, fill) {
  const weights = ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'];
  const lh = (h - 16) / weights.length;
  return weights.map((wt, i) => D.text(`Outfit ${wt} · RootSquare 0123`, x + 14, y + 10 + lh * (i + 0.75), Math.min(15, lh * 0.7), { weight: wt, fill })).join('');
}

function pages(list) {
  const pg = D.A4L, M = 36, top = 78, rows = 5, rowH = (pg.h - top - 28) / rows;
  const out = [];
  const total = Math.ceil(list.length / rows);
  for (let i = 0; i < list.length; i += rows) {
    let b = D.text(`RootSquare brand kit · contact sheet · v${L.VERSION} · ${L.DATE}`, M, 42, 17, { weight: 'Bold' }) +
      D.text(`page ${out.length + 1} of ${total} · left: white ground · right: Shadow Grey ground (${C.ink})`, pg.w - M, 42, 9.5, { anchor: 'end', fill: '#6b6878' }) +
      D.rect(M, 56, pg.w - 2 * M, 0.8, '#e4e2e8');
    list.slice(i, i + rows).forEach((it, r) => {
      const y = top + r * rowH, gh = rowH - 12, gx = 380, gw = (pg.w - M - gx - 10) / 2;
      b += D.text(it.label, M, y + 12, 11.5, { weight: 'SemiBold' });
      const lines = it.files.length, fs_ = Math.min(8.5, (gh - 18) / lines / 1.18);
      it.files.forEach((f, j) => { b += D.text(f, M, y + 26 + j * fs_ * 1.18, fs_, { fill: f.endsWith('/') ? C.ink : '#55525f', weight: f.endsWith('/') ? 'Medium' : 'Regular' }); });
      [[C.white, gx], [C.ink, gx + gw + 10]].forEach(([bg, x]) => {
        b += D.rect(x, y, gw, gh, bg, 'stroke="#d9d6de" stroke-width="0.8"');
        const pad = 10;
        if (it.svg) b += D.embed(fs.readFileSync(it.svg, 'utf8'), x + pad, y + pad, gw - 2 * pad, gh - 2 * pad).svg;
        else if (it.png) b += D.image(it.png, x + pad, y + pad, gw - 2 * pad, gh - 2 * pad);
        else if (it.specimen) b += specimen(x, y, gw, gh, bg === C.white ? C.ink : C.white);
      });
    });
    out.push(D.page(pg, b, 'RootSquare contact sheet'));
  }
  return out;
}

async function main() {
  const list = items();
  const missing = list.filter((it) => (it.svg && !fs.existsSync(it.svg)) || (it.png && !fs.existsSync(it.png)));
  if (missing.length) throw new Error('missing artwork: ' + missing.map((m) => m.label).join(', '));
  const pgs = pages(list);
  await D.pagesToPdf(pgs, path.join(KIT, 'contact_sheet.pdf'), { title: `RootSquare brand kit v${L.VERSION} contact sheet` },
    { png: (i) => path.join(__dirname, '.tmp', `contact_p${i}.png`), pngWidth: 1684 });
  console.log('contact sheet:', list.length, 'rows on', pgs.length, 'pages; fonts:', D.fontsIn(path.join(KIT, 'contact_sheet.pdf')).join(', '));
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { main };
