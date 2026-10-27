// Shared constants, source geometry and font helpers for the RootSquare brand kit build.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'Logo Material');
const KIT = path.join(ROOT, 'rootsquare-brand-kit');
const VENDOR = path.join(__dirname, 'vendor');
const TMP = path.join(__dirname, '.tmp');
const VERSION = '1.1';
const DATE = '2026-10-26';

// Logo colours, all from the brand palette (palette-data.js).
const C = {
  orange: '#fd5a01', // Blaze Orange: logo gradient start (top-left), mesh fade
  red: '#fe3911',    // Blazing Flame: logo gradient end (bottom-right), mesh core, flat logo
  ink: '#1d1a27',    // Shadow Grey: the dark ground and document text
  white: '#ffffff',
  black: '#000000',
};
const FLAT = C.red; // single-colour version

// The logo tool's exports and saved settings use its own oranges (#f55d23, #f53d27);
// the kit swaps them for their brand-palette counterparts wherever they appear.
const TOOL_TO_BRAND = { '#f55d23': C.orange, '#f53d27': C.red };
const brandHex = (hex) => TOOL_TO_BRAND[String(hex).toLowerCase()] || hex;

const fonts = {};
function font(w) {
  if (!fonts[w]) fonts[w] = opentype.loadSync(path.join(VENDOR, 'outfit', `Outfit-${w}.ttf`));
  return fonts[w];
}
const f2 = (n) => +(+n).toFixed(2);

// ---------- source geometry ----------
const primarySrc = fs.readFileSync(path.join(SRC, 'rootsquare-radical-window-gradient-mesh-square-1024x1024.svg'), 'utf8');
const meshPaths = [...primarySrc.matchAll(/<path d="([^"]+)"\/>/g)].map((m) => m[1]).filter((d) => d.length > 500);
const hole = (src) => src.match(/<clipPath id="markOut"[^>]*><path clip-rule="evenodd" d="([^"]+)"/)[1].replace(/^M[^Z]*Z/, '');
const primaryRadicalD = hole(primarySrc); // in the 340 window

// The radical exactly as radical-window_public.html builds it (RADICAL, strokeOutline,
// radicalPathD, cutoutXform), for a square window of side s. x/y are the tool's
// cutoutX/cutoutY offsets as fractions of the window.
const RADICAL = [[0.220, 0.470], [0.330, 0.720], [0.605, 0.255], [0.815, 0.255]];
const svgn = (v) => (isFinite(v) ? String(Math.round(v * 100) / 100) : '0');
function radicalPath(s, { strokeWeight = 0.1125, x = 0, y = 0, scale = 1, stretch = 1 } = {}) {
  const pts = RADICAL.map(([fx, fy]) => [fx * s, fy * s]);
  const h = (s * strokeWeight) / 2, n = pts.length;
  const seg = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    const L = Math.hypot(dx, dy) || 1;
    seg.push({ ux: dx / L, uy: dy / L });
  }
  const edge = (sign) => pts.map((p, i) => {
    const a = seg[i - 1], b = seg[i];
    const plain = (d) => [p[0] + sign * h * -d.uy, p[1] + sign * h * d.ux];
    if (!a) return plain(b);
    if (!b) return plain(a);
    let mx = -a.uy - b.uy, my = a.ux + b.ux;
    const mL = Math.hypot(mx, my);
    if (mL < 1e-6) return plain(a);
    mx /= mL; my /= mL;
    const cosHalf = mx * -a.uy + my * a.ux;
    const len = Math.max(h, Math.min(h * 10, h / Math.max(1e-6, cosHalf)));
    return [p[0] + sign * len * mx, p[1] + sign * len * my];
  });
  const Lft = edge(1), Rgt = edge(-1);
  let d = '';
  Lft.forEach((q, i) => { d += (i ? 'L' : 'M') + svgn(q[0]) + ' ' + svgn(q[1]); });
  for (let i = Rgt.length - 1; i >= 0; i--) d += 'L' + svgn(Rgt[i][0]) + ' ' + svgn(Rgt[i][1]);
  d += 'Z';
  const c = s / 2;
  return d.replace(/([ML])(-?[\d.]+) (-?[\d.]+)/g, (m0, cmd, a, b) =>
    cmd + svgn(c + x * s + (parseFloat(a) - c) * scale * stretch) + ' ' + svgn(c + y * s + (parseFloat(b) - c) * scale));
}

function bboxOfD(dList) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of dList) for (const m of d.matchAll(/(-?\d+\.?\d*)[ ,](-?\d+\.?\d*)/g)) {
    const x = +m[1], y = +m[2];
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
const meshBox = bboxOfD(meshPaths);

function windowD(s, r) {
  return `M${r} 0H${s - r}A${r} ${r} 0 0 1 ${s} ${r}V${s - r}A${r} ${r} 0 0 1 ${s - r} ${s}H${r}A${r} ${r} 0 0 1 0 ${s - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
}
// The mark uses the primary logo's placement (cut-out offset 0, 0). The old no-mesh export
// had cutoutX -0.02, cutoutY -0.04, which left the radical high and to the left.
const MARK_S = 620;
const radicalD = radicalPath(MARK_S);
const markD = windowD(MARK_S, 3) + radicalD;

// ---------- wordmark ----------
const WM_SIZE = 1000;
let wmCache;
function wordmark() {
  if (wmCache) return wmCache;
  const f = font('ExtraBold');
  const p = f.getPath('RootSquare', 0, 0, WM_SIZE, { kerning: true });
  const bb = p.getBoundingBox();
  const cap = (f.tables.os2.sCapHeight / f.unitsPerEm) * WM_SIZE;
  wmCache = { d: p.toPathData(2), bb: { x0: bb.x1, y0: bb.y1, x1: bb.x2, y1: bb.y2, w: bb.x2 - bb.x1, h: bb.y2 - bb.y1 }, cap };
  return wmCache;
}

// Outlined text, for labels drawn inside logo-adjacent artwork.
function textPath(str, x, y, size, weight = 'Medium', anchor = 'start') {
  const f = font(weight);
  const w = f.getAdvanceWidth(str, size, { kerning: true });
  const dx = anchor === 'middle' ? -w / 2 : anchor === 'end' ? -w : 0;
  return { d: f.getPath(str, x + dx, y, size, { kerning: true }).toPathData(2), w };
}
// Width of live text, for laying out documents that embed Outfit.
const textWidth = (str, size, weight = 'Regular') => font(weight).getAdvanceWidth(str, size, { kerning: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

module.exports = { fs, path, ROOT, SRC, KIT, VENDOR, TMP, VERSION, DATE, C, FLAT, brandHex, font, f2, meshPaths, meshBox, primaryRadicalD, radicalPath, radicalD, markD, MARK_S, windowD, wordmark, textPath, textWidth, esc, bboxOfD };
