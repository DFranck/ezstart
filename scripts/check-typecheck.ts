// scripts/check-typecheck.ts
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const LOCATIONS = ['apps', 'packages'];

const missing: string[] = [];

for (const folder of LOCATIONS) {
  const fullPath = path.join(ROOT, folder);
  if (!fs.existsSync(fullPath)) continue;

  const entries = fs.readdirSync(fullPath);
  for (const name of entries) {
    const pkgPath = path.join(fullPath, name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const hasTypecheck = pkg.scripts?.typecheck;
    if (!hasTypecheck) missing.push(`${folder}/${name}`);
  }
}

if (missing.length === 0) {
  console.log('✅ Tous les packages ont une task `typecheck`.');
} else {
  console.log("❌ Les packages suivants N'ONT PAS de task `typecheck` :");
  for (const p of missing) console.log(`- ${p}`);
  process.exit(1);
}
