// Press standards used for the CMYK files. The ICC profiles are Adobe's (free, but their
// licence restricts redistribution), so they are downloaded on first use into .cache/,
// which git ignores. Computed CMYK values are kept in cmyk-values.json, so a rebuild only
// needs the profiles when a colour changes.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CACHE = path.join(__dirname, '.cache', 'icc');
const ZIP_URL = 'https://download.adobe.com/pub/adobe/iccprofiles/win/AdobeICCProfilesCS4Win_end-user.zip';

const PROFILES = {
  swop: {
    id: 'swop', region: 'North America', label: 'U.S. Web Coated (SWOP) v2', file: 'USWebCoatedSWOP.icc', tac: 300,
    outputCondition: 'CGATS TR 001', info: 'U.S. Web Coated (SWOP) v2',
  },
  fogra39: {
    id: 'fogra39', region: 'Europe', label: 'Coated FOGRA39 (ISO 12647-2:2004)', file: 'CoatedFOGRA39.icc', tac: 330,
    outputCondition: 'FOGRA39', info: 'Coated FOGRA39 (ISO 12647-2:2004)',
  },
};
const ORDER = ['swop', 'fogra39'];

function profilePath(id) {
  const p = PROFILES[id];
  const file = path.join(CACHE, p.file);
  if (fs.existsSync(file)) return file;
  fs.mkdirSync(CACHE, { recursive: true });
  const zip = path.join(CACHE, 'adobe-icc.zip'), out = path.join(CACHE, 'unzipped');
  if (!fs.existsSync(zip)) execFileSync('curl', ['-sSLf', '-o', zip, ZIP_URL]);
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${out}' -Force`]);
  for (const q of Object.values(PROFILES)) fs.copyFileSync(path.join(out, 'Adobe ICC Profiles (end-user)', 'CMYK', q.file), path.join(CACHE, q.file));
  return file;
}

module.exports = { PROFILES, ORDER, profilePath };
