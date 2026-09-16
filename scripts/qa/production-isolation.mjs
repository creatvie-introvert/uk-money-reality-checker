import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Run after `npm run build`, never against an in-progress/dev build.
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const files = [...walk('.next/static'), ...walk('.next/server/app').filter((file) => /\.(html|rsc)$/.test(file))];
const forbidden = [
  'ukmr_data_pack_and_source_register_v3_1.xlsx', '/Users/', 'Leannes-MacBook',
  'Development fixture', 'Complete rUK',
  '47,477.35', '2,314.67', '2,163.31', '978.63', '1,374.81',
  '47477.35', '2314.67', '2163.31', '1374.81',
  'rawSourceValue', 'sourceNumberFormat', 'sourceCell', 'sourceRow',
  'release_status', 'confidence_class',
];
for (const file of files) {
  assert(!file.endsWith('.map'), `Browser source map: ${file}`);
  const text = fs.readFileSync(file, 'utf8');
  for (const marker of forbidden) assert(!text.includes(marker), `${file}: unexpected ${marker}`);
}
const meta = JSON.parse(fs.readFileSync('.next/server/app/dev/calculator-results.meta', 'utf8'));
assert.equal(meta.status, 404, 'Production development fixture route must be 404');
console.log(`Production isolation passed: ${files.length} public assets/HTML/RSC files; development route is 404.`);
