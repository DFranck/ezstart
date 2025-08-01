// scripts/generate-readmes-types.ts

import fs from 'fs';
import path from 'path';
import { findPackages } from './utils/findPackages';
import { replaceAutoSection } from './utils/replaceAutoSection';

const TYPES_DIR = path.resolve('packages/types');
const AUTO_TAG = 'TYPES';

function getDomainFromPackageName(pkgName: string): string | null {
  const match = pkgName.match(/(?:api|web|pwa)-(\w[\w-]+)/);
  return match ? match[1] : null;
}

function findDomainTypeFiles(domain: string): string[] {
  const domainPath = path.join(TYPES_DIR, domain);
  if (!fs.existsSync(domainPath)) return [];

  const files = fs.readdirSync(domainPath).filter((f) => f.endsWith('.ts'));
  return files.map((f) => path.join(domain, f).replace(/\\/g, '/'));
}

function updateReadmeWithTypes(pkgPath: string, domain: string): void {
  const readmePath = path.join(pkgPath, 'README.md');
  if (!fs.existsSync(readmePath)) return;

  const files = findDomainTypeFiles(domain);
  if (!files.length) {
    console.log(`⚠️ No type files found for domain "${domain}"`);
    return;
  }

  const links = files
    .map((file) => `- [${path.basename(file)}](../../packages/types/${file})`)
    .join('\n');

  const content = `### 🧾 Domain Types for \`${domain}\`\n\n${links}`;
  replaceAutoSection(readmePath, AUTO_TAG, content);
  console.log(`✅ Updated types section for ${domain} in ${readmePath}`);
}

function main(): void {
  const root = process.cwd();
  console.log('📦 Scanning for packages with domain-specific types...');

  const packages = findPackages(root);

  for (const pkg of packages) {
    const pkgJsonPath = path.join(pkg, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const domain = getDomainFromPackageName(pkgJson.name);

    if (!domain) {
      console.log(`⏭ Skipping non-domain package: ${pkgJson.name}`);
      continue;
    }

    const domainPath = path.join(TYPES_DIR, domain);
    if (!fs.existsSync(domainPath)) {
      console.log(`⏭ No matching types folder for domain: ${domain}`);
      continue;
    }

    updateReadmeWithTypes(pkg, domain);
  }

  console.log('🎉 Finished updating all README types sections.');
}

main();
