// Check: every CMYK PDF has the same silhouette as its RGB PDF (same page, same geometry).
// Both are rendered by the Windows PDF engine (winpdf.ps1) at the same width; Inkscape's PDF
// importer is not used here because it drops soft masks. Ink masks are compared pixel by pixel.
// Usage: node verify-pdf.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { KIT } = require('./lib');

const TMP = path.join(__dirname, '.tmp', 'verify');
const W = 600;

const render = (pdf) => {
  const png = path.join(TMP, path.basename(pdf, '.pdf') + '.png');
  if (!fs.existsSync(png)) execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'winpdf.ps1'), pdf, png, String(W)]);
  return png;
};
// The Windows engine picks its own output size, so read the real dimensions.
function mask(png) {
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', png]).toString().trim().split(',').map(Number);
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', png, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
  return { w, h, at: (x, y) => raw[y * w + x] < 235 };
}

if (process.argv.includes('--fresh')) fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const pairs = walk(path.join(KIT, '01_logos')).filter((f) => /_cmyk-\w+\.pdf$/.test(f) && !/_white_/.test(f)) // white on white has no silhouette
  .map((f) => [f.replace(/_cmyk-\w+\.pdf$/, '_rgb.pdf'), f]);

let fail = 0, worst = 1;
for (const [rgb, cmyk] of pairs) {
  const a = mask(render(rgb)), c = mask(render(cmyk));
  // page sizes may differ by rounding (RGB PDFs carry mm to 2 dp): allow 1 px, compare the common area
  const sameSize = a.w === c.w && Math.abs(a.h - c.h) <= 1;
  let inter = 0, union = 0;
  for (let y = 0; y < Math.min(a.h, c.h); y++) for (let x = 0; x < Math.min(a.w, c.w); x++) {
    const p = a.at(x, y), q = c.at(x, y);
    if (p && q) inter++; if (p || q) union++;
  }
  const iou = union ? inter / union : 1;
  worst = Math.min(worst, iou);
  const ok = sameSize && iou > 0.97;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} overlap ${(iou * 100).toFixed(2)}%  ${path.basename(cmyk)}${sameSize ? '' : `  (size ${a.w}x${a.h} vs ${c.w}x${c.h})`}`);
}
console.log(`${pairs.length} CMYK PDFs checked against their RGB PDFs: ${fail} failed, lowest overlap ${(worst * 100).toFixed(2)}%`);
process.exitCode = fail ? 1 : 0;
