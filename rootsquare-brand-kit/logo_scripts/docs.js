// Page-building helpers shared by the palette sheet, guidelines, README.pdf and contact sheet.
// Documents use live Outfit text (embedded by Inkscape through ink.fontEnv); logos stay outlined.
const { execFileSync } = require('child_process');
const L = require('./lib');
const { fs, path, C, f2, esc } = L;
const { PDFDocument } = require('pdf-lib');
const { Batch } = require('./ink');

let uid = 0;
// Inline an SVG document as a nested <svg> at (x,y), width w; ids are prefixed so copies never clash.
function embed(svgText, x, y, w, h) {
  const p = `e${++uid}-`;
  const vb = svgText.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
  if (h === undefined) h = (w * vb[3]) / vb[2];
  else { const k = Math.min(w / vb[2], h / vb[3]); x += (w - vb[2] * k) / 2; y += (h - vb[3] * k) / 2; w = vb[2] * k; h = vb[3] * k; }
  const inner = svgText.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[^<]*<\/title>/, '')
    .replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`);
  return { svg: `<svg x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" viewBox="${vb.join(' ')}">${inner}</svg>`, x, y, w, h };
}
// Raster previews are inlined (Inkscape's shell mode does not resolve plain file paths in href)
// and fitted here, because Inkscape ignores preserveAspectRatio on <image>.
function image(file, x, y, w, h) {
  const buf = fs.readFileSync(file);
  const iw = buf.readUInt32BE(16), ih = buf.readUInt32BE(20), k = Math.min(w / iw, h / ih);
  const fw = iw * k, fh = ih * k;
  return `<image x="${f2(x + (w - fw) / 2)}" y="${f2(y + (h - fh) / 2)}" width="${f2(fw)}" height="${f2(fh)}" xlink:href="data:image/png;base64,${buf.toString('base64')}"/>`;
}

const WEIGHT = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800 };
// Outfit has no †, Δ, ≥ or ≤; substitute so no fallback font is ever embedded.
const sane = (s) => String(s).replace(/ΔE/g, 'dE').replace(/Δ/g, 'd').replace(/†/g, '**').replace(/≥/g, 'at least ').replace(/≤/g, 'at most ');
function text(str, x, y, size, o = {}) {
  const w = o.weight || 'Regular';
  str = sane(str);
  return `<text x="${f2(x)}" y="${f2(y)}" font-family="Outfit" font-weight="${WEIGHT[w]}" font-size="${size}" fill="${o.fill || C.ink}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(str)}</text>`;
}
// Greedy word wrap with real Outfit metrics. Returns { svg, height }.
function para(str, x, y, width, size, o = {}) {
  const lh = o.lineHeight || size * 1.4, w = o.weight || 'Regular';
  const words = sane(str).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const t = cur ? cur + ' ' + wd : wd;
    if (L.textWidth(t, size, w) > width && cur) { lines.push(cur); cur = wd; } else cur = t;
  }
  if (cur) lines.push(cur);
  return { svg: lines.map((ln, i) => text(ln, x, y + i * lh, size, o)).join(''), height: lines.length * lh, lines: lines.length };
}
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${fill}" ${extra}/>`;

// A4 portrait / landscape in px at 96 dpi (Inkscape's user unit)
const A4 = { w: 793.7, h: 1122.5 };
const A4L = { w: 1122.5, h: 793.7 };
const page = (size, body, title) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}">
<title>${esc(title || '')}</title>
${rect(0, 0, size.w, size.h, '#ffffff')}
${body}
</svg>
`;

// SVG pages -> one PDF (Inkscape per page, merged with pdf-lib), plus optional PNG renders of each page.
async function pagesToPdf(pages, outPdf, meta, opts = {}) {
  const tmp = path.join(__dirname, '.tmp', 'pages', path.basename(outPdf, '.pdf'));
  fs.mkdirSync(tmp, { recursive: true });
  const b = new Batch();
  const files = pages.map((p, i) => { const s = path.join(tmp, `p${i}.svg`); fs.writeFileSync(s, p); b.vector(s, path.join(tmp, `p${i}.pdf`)); return s; });
  if (opts.png) files.forEach((s, i) => b.png(s, opts.png(i), opts.pngWidth || 1600, '#ffffff'));
  b.run(path.basename(outPdf));
  const merged = await PDFDocument.create();
  for (let i = 0; i < pages.length; i++) {
    const src = await PDFDocument.load(fs.readFileSync(path.join(tmp, `p${i}.pdf`)));
    (await merged.copyPages(src, src.getPageIndices())).forEach((pg) => merged.addPage(pg));
  }
  merged.setTitle(meta.title);
  if (meta.subject) merged.setSubject(meta.subject);
  merged.setAuthor('RootSquare');
  merged.setCreator('RootSquare brand kit build');
  merged.setProducer('RootSquare brand kit build (Inkscape + pdf-lib)');
  merged.setCreationDate(new Date(`${L.DATE}T12:00:00Z`));
  merged.setModificationDate(new Date(`${L.DATE}T12:00:00Z`));
  fs.writeFileSync(outPdf, await merged.save({ useObjectStreams: false }));
  return files;
}

// After export, every embedded font must be Outfit.
function fontsIn(pdfFile) {
  return [...new Set([...fs.readFileSync(pdfFile, 'latin1').matchAll(/\/FontName\s*\/[A-Z]{6}\+([A-Za-z0-9-]+)/g)].map((m) => m[1]))];
}

module.exports = { embed, image, text, para, rect, page, pagesToPdf, A4, A4L, WEIGHT, sane, fontsIn };
