// Colour maths: sRGB <-> Lab, ΔE2000, WCAG contrast, and a colorimetric sRGB -> CMYK
// match against the SWOP profile (RSWOP.icm) using Windows Color System as the forward model.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
function relLum(hex) { const [r, g, b] = hexToRgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function contrast(a, b) { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

function rgbToLab([R, G, B]) {
  const [r, g, b] = [R, G, B].map(lin);
  let X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  let Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  let Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  [X, Y, Z] = [f(X), f(Y), f(Z)];
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
function dE2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (a, b) => { if (a === 0 && b === 0) return 0; const v = Math.atan2(b, a) * deg; return v < 0 ? v + 360 : v; };
  const h1p = h(a1p, b1), h2p = h(a2p, b2);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hbp += h1p + h2p < 360 ? 360 : -360; hbp /= 2; }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTh = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * T, RT = -Math.sin(2 * dTh * rad) * RC;
  return Math.sqrt(Math.pow(dLp / SL, 2) + Math.pow(dCp / SC, 2) + Math.pow(dHp / SH, 2) + RT * (dCp / SC) * (dHp / SH));
}

const TMP = path.join(__dirname, '.tmp');
// CMYK (percent) -> sRGB through the given CMYK profile, via Windows Color System.
function forward(cmykList, profile) {
  fs.mkdirSync(TMP, { recursive: true });
  const inF = path.join(TMP, 'cmyk.bin'), outF = path.join(TMP, 'rgb.bin');
  const buf = Buffer.alloc(cmykList.length * 4);
  cmykList.forEach((c, i) => c.forEach((v, j) => (buf[i * 4 + j] = Math.round(v * 2.55))));
  fs.writeFileSync(inF, buf);
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'cmyk2rgb.ps1'), inF, outF, profile.replace(/\\/g, '/')]);
  const o = fs.readFileSync(outF);
  return cmykList.map((_, i) => [o[i * 3 + 2], o[i * 3 + 1], o[i * 3]]);
}

// Colorimetric match: minimise ΔE2000 over a CMYK grid, then refine at 1%.
// Anything within 0.5 ΔE of the best (imperceptible) counts as a tie; ties go to the lowest
// total ink, which favours higher-black builds, never above the standard's ink limit (tac).
const TIE = 0.5;
function matchCMYK(hex, profile, tac) {
  const target = rgbToLab(hexToRgb(hex));
  const pick = (cands) => {
    const rgb = forward(cands, profile);
    const scored = cands.map((c, i) => ({ c, de: dE2000(target, rgbToLab(rgb[i])), tac: c[0] + c[1] + c[2] + c[3] }));
    const best = scored.reduce((m, s) => Math.min(m, s.de), Infinity);
    return scored.filter((s) => s.de <= best + TIE && s.tac <= tac).sort((a, b) => a.tac - b.tac || a.de - b.de)[0];
  };
  const grid = [];
  for (let c = 0; c <= 100; c += 5) for (let m = 0; m <= 100; m += 5) for (let y = 0; y <= 100; y += 5) for (let k = 0; k <= 100; k += 5) grid.push([c, m, y, k]);
  let best = pick(grid);
  const fine = [];
  const [C, M, Y, K] = best.c;
  const r = (v) => { const a = []; for (let d = -5; d <= 5; d++) if (v + d >= 0 && v + d <= 100) a.push(v + d); return a; };
  for (const c of r(C)) for (const m of r(M)) for (const y of r(Y)) for (const k of r(K)) fine.push([c, m, y, k]);
  best = pick(fine);
  return { cmyk: best.c, dE: +best.de.toFixed(2) };
}

module.exports = { hexToRgb, relLum, contrast, rgbToLab, dE2000, matchCMYK, forward };

if (require.main === module) {
  const { PROFILES, profilePath } = require('./profiles');
  const [id, ...hexes] = process.argv.slice(2);
  for (const h of hexes) console.log(id, h, JSON.stringify(matchCMYK(h, profilePath(id), PROFILES[id].tac)));
}
