// Clean rebuild of the whole kit, in dependency order. Usage: node build-all.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const { KIT } = require('./lib');

const steps = [['logos'], ['verify-pdf', '--fresh'], ['social'], ['palette'], ['typography'], ['guidelines'], ['readme'], ['contact'], ['manifest']];
fs.rmSync(KIT, { recursive: true, force: true });
for (const [s, ...args] of steps) {
  const t = Date.now();
  execFileSync(process.execPath, [`${__dirname}/${s}.js`, ...args], { stdio: 'inherit' });
  console.log(`-- ${s} done in ${((Date.now() - t) / 1000).toFixed(0)} s`);
}
