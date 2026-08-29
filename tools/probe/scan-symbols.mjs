import fs from 'fs';
const files = process.argv.slice(2);
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  const hits = [];
  lines.forEach((l, i) => {
    if (!l.includes('?')) return;
    const unitSlot  = /\(\s*\?\s*\)/.test(l);                 // "(?)" where a unit belongs
    const labelSlot = /(?:>|`|'|"|\s)\?\s[A-Z]/.test(l);      // "? Series", "<label>? Resistance"
    const runSlot   = /\?{2,}/.test(l) && !/\?\?[=.]/.test(l) && !/https?:/.test(l);
    if (unitSlot || labelSlot || runSlot) hits.push([i + 1, l.trim().slice(0, 104)]);
  });
  console.log(`\n${f}: ${hits.length} suspicious lines`);
  for (const [n, t] of hits) console.log(`  ${n}: ${t}`);
}
