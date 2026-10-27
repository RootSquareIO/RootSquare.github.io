// Batch Inkscape exports through --shell (one process per chunk instead of one per file).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Inkscape 1.x; override with INKSCAPE=<path to inkscape.com>
const INK = process.env.INKSCAPE || 'C:/Program Files/Inkscape/bin/inkscape.com';
const INK_FONTS_CONF = path.join(path.dirname(path.dirname(INK)), 'etc', 'fonts', 'fonts.conf').replace(/\\/g, '/');
const FONTDIR = path.join(__dirname, '.tmp', 'fonts');
const FCONF = path.join(__dirname, '.tmp', 'fonts.conf');

// Make Outfit visible to Inkscape's fontconfig without installing it system-wide.
// Only the static weights: the variable font shares their family name and would shadow them.
function fontEnv() {
  fs.mkdirSync(FONTDIR, { recursive: true });
  const src = path.join(__dirname, 'vendor', 'outfit');
  for (const f of fs.readdirSync(src).filter((f) => /^Outfit-\w+\.ttf$/.test(f))) fs.copyFileSync(path.join(src, f), path.join(FONTDIR, f));
  fs.writeFileSync(FCONF, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <include ignore_missing="no">${INK_FONTS_CONF}</include>
  <dir>${FONTDIR.replace(/\\/g, '/')}</dir>
  <cachedir>${path.join(__dirname, '.tmp', 'fccache').replace(/\\/g, '/')}</cachedir>
</fontconfig>
`);
  return { ...process.env, FONTCONFIG_FILE: FCONF };
}

const svgSize = (file) => fs.readFileSync(file, 'utf8').match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number).slice(2);

class Batch {
  constructor() { this.cmds = []; this.outs = []; }
  // px = longest edge; bg = null for transparent, or a hex for an opaque ground
  png(svg, out, px, bg = null) {
    const [w, h] = svgSize(svg);
    const width = w >= h ? px : Math.round((px * w) / h);
    this.cmds.push(`file-open:${svg}; export-type:png; export-filename:${out}; export-width:${width}; export-background:${bg || '#ffffff'}; export-background-opacity:${bg ? 1 : 0}; export-do; file-close`);
    this.outs.push(out);
  }
  vector(svg, out) { // pdf or eps by extension
    const type = path.extname(out).slice(1);
    this.cmds.push(`file-open:${svg}; export-type:${type}; export-filename:${out}; export-do; file-close`);
    this.outs.push(out);
  }
  run(label = 'batch', chunk = 40) {
    const env = fontEnv();
    for (let i = 0; i < this.cmds.length; i += chunk) {
      const input = this.cmds.slice(i, i + chunk).join('\n') + '\nquit\n';
      const r = spawnSync(INK, ['--shell'], { input, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 });
      if (r.status !== 0 && r.status !== null) console.warn(label, 'inkscape exit', r.status);
    }
    const missing = this.outs.filter((o) => !fs.existsSync(o) || fs.statSync(o).size === 0);
    if (missing.length) throw new Error(`${label}: ${missing.length} exports missing, e.g. ${missing[0]}`);
    console.log(`${label}: ${this.outs.length} exports ok`);
    this.cmds = []; this.outs = [];
  }
}

module.exports = { Batch, INK, fontEnv, svgSize };
