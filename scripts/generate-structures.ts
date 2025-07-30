import fs from 'fs';
import path from 'path';
import { findPackages } from './utils/findPackages';
import { replaceAutoSection } from './utils/replaceAutoSection';

const DESCRIPTIONS: Record<string, string> = {};

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  '.vscode',
  '.next',
  'dist',
  'build',
]);

function loadPackageDescriptions(pkgDir: string): Record<string, string> {
  const descPath = path.join(pkgDir, 'descriptions.json');
  const jsPath = path.join(pkgDir, 'descriptions.js');

  if (fs.existsSync(descPath)) {
    try {
      return JSON.parse(fs.readFileSync(descPath, 'utf-8'));
    } catch {
      console.warn(`⚠️ Invalid JSON in ${descPath}, skipping`);
    }
  }

  if (fs.existsSync(jsPath)) {
    try {
      return require(jsPath);
    } catch {
      console.warn(`⚠️ Cannot load ${jsPath}, skipping`);
    }
  }

  return {};
}

function getRootSrcDirs(pkgDir: string): string[] {
  const srcPath = path.join(pkgDir, 'src');
  if (!fs.existsSync(srcPath)) return [];

  return fs
    .readdirSync(srcPath, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !IGNORE_DIRS.has(e.name))
    .map((e) => e.name);
}

function generateQuickOverview(
  pkgDir: string,
  descriptionsFromJson: Record<string, string> = {}
): string {
  const dirs = getRootSrcDirs(pkgDir);
  if (!dirs.length) return '';

  return (
    `### 📁 Quick Overview\n` +
    dirs
      .map((dir) => {
        const desc =
          descriptionsFromJson[dir] ||
          DESCRIPTIONS[dir] ||
          'No description provided';
        return `- **${dir}/** → ${desc}`;
      })
      .join('\n') +
    '\n'
  );
}

function generateTree(
  dir: string,
  depth = 0,
  maxDepth = Infinity,
  root: string = dir
): string {
  const indent = '  '.repeat(depth);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let tree = '';

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const pkgJsonPath = path.join(fullPath, 'package.json');

      if (fs.existsSync(pkgJsonPath)) {
        const relativeLink = path.relative(
          root,
          path.join(fullPath, 'structure.md')
        );
        tree += `${indent}- ${entry.name}/ → [structure.md](./${relativeLink.replace(/\\/g, '/')})\n`;
        continue;
      }

      tree += `${indent}- ${entry.name}/\n`;
      if (depth < maxDepth) {
        tree += generateTree(fullPath, depth + 1, maxDepth, root);
      }
    } else {
      tree += `${indent}- ${entry.name}\n`;
    }
  }

  return tree;
}

function updateReadmeWithStructure(
  pkgDir: string,
  descriptionsFromJson: Record<string, string> = {}
): void {
  const readmePath = path.join(pkgDir, 'README.md');
  const structureLink = `👉 See the full structure here: [structure.md](./structure.md)`;
  const quickOverview = generateQuickOverview(pkgDir, descriptionsFromJson);

  if (!fs.existsSync(readmePath)) {
    const base = `# 📦 ${path.basename(pkgDir)}\n`;
    fs.writeFileSync(readmePath, base, 'utf-8');
  }

  if (quickOverview) {
    replaceAutoSection(readmePath, 'QUICK_OVERVIEW', quickOverview.trim());
  }

  replaceAutoSection(
    readmePath,
    'PROJECT_STRUCTURE',
    `## 📂 Project Structure\n\n${structureLink}`
  );
}

function generatePackageStructure(pkgDir: string, root: string): void {
  const tree = generateTree(pkgDir, 0, Infinity);
  const mdContent = `# Project structure for ${path.relative(root, pkgDir)}\n\n${tree}`;
  fs.writeFileSync(path.join(pkgDir, 'structure.md'), mdContent);
  console.log(`✅ Generated structure.md for ${pkgDir}`);
}

function main(): void {
  const root = process.argv[2] || process.cwd();
  console.log(`📦 Scanning repo at: ${root}`);

  const packages = findPackages(root);

  const rootTree = generateTree(root, 0, 2);
  fs.writeFileSync(
    path.join(root, 'structure.md'),
    `# Monorepo structure\n\n${rootTree}`
  );
  console.log(`✅ Generated root structure.md`);

  packages.forEach((pkg) => {
    generatePackageStructure(pkg, root);
    const descriptionsFromJson = loadPackageDescriptions(pkg);
    updateReadmeWithStructure(pkg, descriptionsFromJson);
  });

  console.log(`🎉 Done!`);
}

main();
