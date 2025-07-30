import fs from 'fs';
import path from 'path';
import { findPackages } from './utils/findPackages';
import { replaceAutoSection } from './utils/replaceAutoSection';

function autoDescriptionFromName(pkgName: string): string {
  if (pkgName.includes('api'))
    return `Backend API service for ${pkgName.replace(/api[-_]?/, '')}`;
  if (pkgName.includes('web'))
    return `Frontend web application for ${pkgName.replace(/web[-_]?/, '')}`;
  if (pkgName.includes('ui')) return `Shared UI components library`;
  if (pkgName.includes('types'))
    return `Shared TypeScript types for the project`;
  return 'No description provided.';
}

function detectRunCommand(pkgJsonPath: string): string {
  if (!fs.existsSync(pkgJsonPath)) return 'pnpm build';

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const scripts = pkgJson.scripts || {};

  if (scripts.dev) return 'pnpm dev';
  if (scripts.start) return 'pnpm start';
  if (scripts.build) return 'pnpm build';

  return 'pnpm build';
}

function getReadmeSections(pkgDir: string): Record<string, string> {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const pkgName = pkgJson.name || path.basename(pkgDir);
  const description = pkgJson.description || autoDescriptionFromName(pkgName);
  const runCmd = detectRunCommand(pkgJsonPath);
  const relativePathFromRoot = path
    .relative(process.cwd(), pkgDir)
    .replace(/\\/g, '/');

  return {
    TITLE: `# 📦 ${pkgName}`,
    DESC: `${description}`,
    GETTING_STARTED: `\`\`\`bash
# 1️⃣ Clone the public repo and move to this package if it's public
git clone https://github.com/DFranck/ezstart-public.git
cd ${relativePathFromRoot}

# 2️⃣ Install dependencies
pnpm install

# 3️⃣ Run the package
${runCmd}
\`\`\``,
  };
}

function ensureReadme(pkgDir: string): void {
  const readmePath = path.join(pkgDir, 'README.md');
  const sections = getReadmeSections(pkgDir);

  for (const [sectionName, content] of Object.entries(sections)) {
    replaceAutoSection(readmePath, sectionName, content);
  }
}

function main(): void {
  const root = process.argv[2] || process.cwd();
  console.log(`📦 Scanning repo at: ${root}`);

  const packages = findPackages(root);
  packages.forEach(ensureReadme);

  console.log(`🎉 Done!`);
}

main();
