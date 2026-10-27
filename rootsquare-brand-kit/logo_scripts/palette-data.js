// Palette facts: the official brand palette (which the logo uses), CMYK for North America (SWOP)
// and Europe (FOGRA39), nearest Pantone Coated, WCAG contrast, and a cross-check against the
// variables the website uses today (css/root-square.css).
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const K = require('./colour');
const { PROFILES, ORDER, profilePath } = require('./profiles');

const VALUES = path.join(__dirname, 'cmyk-values.json'); // committed: rebuilds need no profiles
const PANTONE_CSV = path.join(__dirname, 'vendor', 'pantone', 'coated.csv');

// The official palette: names, values and order as supplied by RootSquare (2026-10-26).
// hsl is the supplied HSL, kept to check the hex values against. site = the website variable
// that plays the same part, and the value it uses.
const BRAND = [
  { key: 'shadow-grey', name: 'Shadow Grey', hex: '#1d1a27', hsl: [254, 20, 13], site: { css: '--ink', hex: '#1b1825' },
    role: 'Text, dark sections and primary buttons. The dark ground for the white logo.' },
  { key: 'twilight-indigo', name: 'Twilight Indigo', hex: '#37375e', hsl: [240, 26, 29], site: { css: '--indigo', hex: '#37375e' },
    role: 'Section labels (eyebrows), call-to-action panels, team initials.' },
  { key: 'chocolate-plum', name: 'Chocolate Plum', hex: '#644041', hsl: [358, 22, 32], site: { css: '--muted', hex: '#644041' },
    role: 'Secondary text: intros, captions, supporting copy.' },
  { key: 'light-blue', name: 'Light Blue', hex: '#aacfdd', hsl: [196, 43, 77], site: { css: '--sky, --line', hex: '#d3e7ee' },
    role: 'Lines and borders, light bands, light text on Shadow Grey.' },
  { key: 'white-smoke', name: 'White Smoke', hex: '#f5f5f5', hsl: [0, 0, 96], site: { css: '--bg', hex: '#f5f5f5' },
    role: 'Page background, and text on Shadow Grey buttons.' },
  { key: 'powder-petal', name: 'Powder Petal', hex: '#ffe8d9', hsl: [24, 100, 93], site: { css: '--soft', hex: '#ffe8d9' },
    role: 'Footer, soft sections and image placeholders.' },
  { key: 'cherry-blossom', name: 'Cherry Blossom', hex: '#fea9af', hsl: [356, 98, 83], site: { css: '--blush', hex: '#fea9af' },
    role: 'Decorative rings and soft accents.' },
  { key: 'blaze-orange', name: 'Blaze Orange', hex: '#fd5a01', hsl: [21, 99, 50], site: { css: '--accent', hex: '#fd5a01' },
    role: 'Logo gradient start (top-left). On screen: hover states and highlights (buttons, card borders, hero glow).' },
  { key: 'blazing-flame', name: 'Blazing Flame', hex: '#fe3911', hsl: [10, 99, 53], site: { css: '--flame', hex: '#fe3911' },
    role: 'Logo gradient end (bottom-right), mesh core and the flat logo. On screen: glow rings and warm emphasis.' },
  { key: 'electric-red', name: 'Electric Red', hex: '#fe1100', hsl: [4, 100, 50], site: { css: '--red', hex: '#fe1100' },
    role: 'Small emphasis marks, such as the check marks in lists.' },
].map((c) => ({ ...c, css: `--${c.key}` }));
// The logo is drawn in palette colours only (lib.js C): check that stays true.
for (const hex of [L.C.orange, L.C.red, L.C.ink]) if (!BRAND.some((c) => c.hex === hex)) throw new Error(`logo colour ${hex} is not in the brand palette`);
const ALL = BRAND;
const FIXED = { '#ffffff': [0, 0, 0, 0], '#000000': [0, 0, 0, 100] }; // white = no ink; one-colour black = K only

function loadValues() { try { return JSON.parse(fs.readFileSync(VALUES, 'utf8')); } catch (e) { return {}; } }

// { profileId: { hex: [c,m,y,k] } }, computing (and saving) anything missing.
function cmykTable(hexes = ALL.map((c) => c.hex)) {
  const v = loadValues();
  let changed = false;
  for (const id of ORDER) {
    v[id] = v[id] || {};
    for (const hex of hexes) {
      if (FIXED[hex] || v[id][hex]) continue;
      v[id][hex] = K.matchCMYK(hex, profilePath(id), PROFILES[id].tac);
      changed = true;
    }
  }
  // keep the saved file to the current colours only
  const current = new Set(ALL.map((c) => c.hex));
  for (const id of ORDER) for (const hex of Object.keys(v[id])) if (!current.has(hex) && !hexes.includes(hex)) { delete v[id][hex]; changed = true; }
  if (changed) fs.writeFileSync(VALUES, JSON.stringify(v, null, 1) + '\n');
  const map = {};
  for (const id of ORDER) {
    map[id] = { ...FIXED };
    for (const [hex, r] of Object.entries(v[id])) map[id][hex] = r.cmyk;
  }
  return { map, values: v };
}

let pantoneRows;
function nearestPantone(hex) {
  pantoneRows = pantoneRows || fs.readFileSync(PANTONE_CSV, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  const t = K.rgbToLab(K.hexToRgb(hex));
  const pretty = (n) => 'PANTONE ' + n.replace(/-c$/, '').split('-').map((w) => (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ') + ' C';
  const r = pantoneRows.map(([n, x]) => ({ name: pretty(n), ref: x, dE: K.dE2000(t, K.rgbToLab(K.hexToRgb(x))) })).sort((a, b) => a.dE - b.dE);
  return { name: r[0].name, srgb_reference: r[0].ref, deltaE2000: +r[0].dE.toFixed(2), runner_up: `${r[1].name} (dE ${r[1].dE.toFixed(2)})`,
    note: 'nearest match, verify against a physical guide' };
}

// Contrast grounds: white, and Shadow Grey (the dark ground).
const GROUNDS = { white: '#ffffff', dark: L.C.ink };

function hslOf([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, Math.round(l * 100)];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function describe(c, values) {
  const vsWhite = +K.contrast(c.hex, GROUNDS.white).toFixed(2);
  const vsDark = c.hex === GROUNDS.dark ? null : +K.contrast(c.hex, GROUNDS.dark).toFixed(2);
  const flags = [];
  if (vsWhite < 3) flags.push('UNDER 3:1 against white');
  if (vsDark !== null && vsDark < 3) flags.push('UNDER 3:1 against Shadow Grey');
  const rgb = K.hexToRgb(c.hex);
  const hsl = hslOf(rgb);
  // the supplied HSL should agree with the hex (within rounding)
  if (c.hsl && c.hsl.some((v, i) => Math.abs(v - hsl[i]) > 1)) throw new Error(`${c.name}: hex ${c.hex} gives hsl ${hsl}, supplied ${c.hsl}`);
  const site = c.site && { ...c.site, matches: c.site.hex === c.hex,
    deltaE2000: +K.dE2000(K.rgbToLab(rgb), K.rgbToLab(K.hexToRgb(c.site.hex))).toFixed(2) };
  return {
    ...c,
    rgb, hsl: c.hsl || hsl, site,
    cmyk: Object.fromEntries(ORDER.map((id) => [id, { values: values[id][c.hex].cmyk, deltaE2000: values[id][c.hex].dE }])),
    pantone: nearestPantone(c.hex),
    contrast: { on_white: vsWhite, on_dark: vsDark },
    flags,
  };
}
function palette() {
  const { values } = cmykTable();
  return { brand: BRAND.map((c) => describe(c, values)) };
}

const CMYK_NOTE = 'CMYK values are conversions from sRGB, not proofs. Each is the closest colorimetric match (dE2000) within the standard\'s ink limit: North America, U.S. Web Coated (SWOP) v2; Europe, Coated FOGRA39 (ISO 12647-2:2004). Ask your printer to proof on their own press.';

module.exports = { BRAND, ALL, GROUNDS, cmykTable, palette, nearestPantone, CMYK_NOTE, PROFILES, ORDER };

if (require.main === module) {
  const p = palette();
  for (const c of p.brand) console.log(c.name.padEnd(16), c.hex, 'SWOP', c.cmyk.swop.values.join('/'), 'FOGRA39', c.cmyk.fogra39.values.join('/'), '|', c.pantone.name, c.pantone.deltaE2000, '| white', c.contrast.on_white, 'dark', c.contrast.on_dark, c.flags.join('; '), c.site && !c.site.matches ? `| SITE ${c.site.css} ${c.site.hex} dE ${c.site.deltaE2000}` : '');
}
