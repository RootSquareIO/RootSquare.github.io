// manifest.csv: every file (except itself) with format, dimensions, colour mode, bytes, sha256.
// Colour mode is read from the file contents, not inferred from the name.
const crypto = require('crypto');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const L = require('./lib');
const { fs, path, KIT } = L;

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const mm = (pt) => +((pt / 72) * 25.4).toFixed(1);

function png(buf) {
  const ct = buf[25];
  const mode = { 0: 'Greyscale', 2: 'RGB', 3: 'Indexed', 4: 'Greyscale + alpha', 6: 'RGB + alpha' }[ct];
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), units: 'px', mode: mode + (buf.includes('sRGB') ? ' (sRGB)' : '') };
}
function jpg(buf) {
  let i = 2;
  while (i < buf.length) {
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
      const comps = buf[i + 9];
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5), units: 'px', mode: { 1: 'Greyscale', 3: 'RGB (YCbCr)', 4: 'CMYK' }[comps] };
    }
    i += 2 + len;
  }
  return {};
}
function pdfStreams(buf) {
  const out = [];
  const s = buf.toString('latin1');
  const re = /(?<!end)stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length, end = s.indexOf('endstream', start);
    if (end < 0) break;
    try { out.push(zlib.inflateSync(buf.subarray(start, end)).toString('latin1')); } catch (e) { /* not flate: images, fonts */ }
    re.lastIndex = end + 9;
  }
  // dictionaries live outside the streams
  return out.join('\n') + '\n' + s.replace(/(?<!end)stream\r?\n[\s\S]*?endstream/g, '');
}
function pdfMode(all) {
  const cmyk = /\/DeviceCMYK|(^|\s)[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+(k|K)(\s|$)/m.test(all);
  const rgb = /\/DeviceRGB|\/sRGB|\/ICCBased|(^|\s)[\d.]+\s+[\d.]+\s+[\d.]+\s+(rg|RG)(\s|$)|\/CalRGB/m.test(all);
  return cmyk && rgb ? 'CMYK + RGB' : cmyk ? 'CMYK (DeviceCMYK)' : rgb ? 'RGB' : 'unknown';
}
async function pdf(buf) {
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.load(buf);
  const { width, height } = doc.getPage(0).getSize();
  const n = doc.getPageCount();
  return { w: mm(width), h: mm(height), units: 'mm' + (n > 1 ? ` (page 1 of ${n})` : ''), mode: pdfMode(pdfStreams(buf)) };
}
function eps(buf) {
  const s = buf.toString('latin1');
  const bb = s.match(/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
  const hi = s.match(/%%HiResBoundingBox:\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/) || bb;
  const mode = /setcmykcolor|DeviceCMYK/.test(s) ? 'CMYK' : /setrgbcolor|DeviceRGB|\/rg\b/.test(s) ? 'RGB' : 'unknown';
  return { w: mm(hi[3] - hi[1]), h: mm(hi[4] - hi[2]), units: 'mm', mode };
}
function svg(buf) {
  const s = buf.toString('utf8');
  const vb = s.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
  return { w: +vb[2].toFixed(2), h: +vb[3].toFixed(2), units: 'user units', mode: 'RGB' };
}
function video(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = j.streams.find((x) => x.codec_type === 'video');
  const alpha = v.tags && (v.tags.alpha_mode === '1' || v.tags.ALPHA_MODE === '1');
  return { w: v.width, h: v.height, units: `px, ${eval(v.r_frame_rate)} fps, ${(+j.format.duration).toFixed(2)} s, ${v.codec_name}`, mode: `${v.pix_fmt.replace('yuv', 'YUV ').replace('p', '')}${alpha ? ' + alpha' : ''}` };
}

async function main() {
  const out = path.join(KIT, 'manifest.csv');
  const files = walk(KIT).filter((f) => path.resolve(f) !== path.resolve(out)).sort();
  const q = (v) => (v === undefined || v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = [['path', 'format', 'width', 'height', 'units', 'colour_mode', 'bytes', 'sha256']];
  for (const f of files) {
    const buf = fs.readFileSync(f);
    const ext = path.extname(f).slice(1).toLowerCase();
    let info = {};
    if (ext === 'png') info = png(buf);
    else if (ext === 'jpg') info = jpg(buf);
    else if (ext === 'pdf') info = await pdf(buf);
    else if (ext === 'eps') info = eps(buf);
    else if (ext === 'svg') info = svg(buf);
    else if (ext === 'mp4' || ext === 'webm') info = video(f);
    else info = { mode: 'n/a' };
    rows.push([path.relative(KIT, f).replace(/\\/g, '/'), ext, info.w, info.h, info.units, info.mode, buf.length, crypto.createHash('sha256').update(buf).digest('hex')]);
  }
  fs.writeFileSync(out, rows.map((r) => r.map(q).join(',')).join('\n') + '\n');
  console.log('manifest rows:', rows.length - 1);
  return rows;
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { main };
