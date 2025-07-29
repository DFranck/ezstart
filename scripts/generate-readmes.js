const fs = require('fs');
const path = require('path');
const { findPackages } = require('./utils/findPackages');

function autoDescriptionFromName(pkgName) {
  if (pkgName.includes('api'))
    return `Backend API service for ${pkgName.replace(/api[-_]?/, '')}`;
  if (pkgName.includes('web'))
    return `Frontend web application for ${pkgName.replace(/web[-_]?/, '')}`;
  if (pkgName.includes('ui')) return `Shared UI components library`;
  if (pkgName.includes('types'))
    return `Shared TypeScript types for the project`;
  return 'No description provided.';
}
function detectRunCommand(pkgJsonPath) {
  if (!fs.existsSync(pkgJsonPath)) return 'pnpm build';

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const scripts = pkgJson.scripts || {};

  if (scripts.dev) return 'pnpm dev';
  if (scripts.start) return 'pnpm start';
  if (scripts.build) return 'pnpm build';

  return 'pnpm build'; // fallback
}

function createBaseReadme(pkgDir) {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

  const pkgName = pkgJson.name || path.basename(pkgDir);
  const description = pkgJson.description || autoDescriptionFromName(pkgName);
  const runCmd = detectRunCommand(pkgJsonPath);

  const standaloneFolder = path.basename(pkgDir); // <- juste le dernier dossier

  return `# 📦 ${pkgName}

${description}

## 🚀 Getting Started

\`\`\`bash
# 1️⃣ Clone only this package
git clone <your-repo-url>
cd ${standaloneFolder}

# 2️⃣ Install dependencies
pnpm install

# 3️⃣ Run the package
${runCmd}
\`\`\`
`;
}

function ensureReadme(pkgDir) {
  const readmePath = path.join(pkgDir, 'README.md');

  if (!fs.existsSync(readmePath)) {
    const baseReadme = createBaseReadme(pkgDir);
    fs.writeFileSync(readmePath, baseReadme, 'utf-8');
    console.log(`✅ Created README.md for ${pkgDir}`);
  } else {
    console.log(`➡️  README.md already exists for ${pkgDir}, skipped`);
  }
}

function main() {
  const root = process.argv[2] || process.cwd();
  console.log(`📦 Scanning repo at: ${root}`);

  const packages = findPackages(root);

  packages.forEach((pkg) => ensureReadme(pkg));

  console.log(`🎉 Done!`);
}

main();
