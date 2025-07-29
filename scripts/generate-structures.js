const fs = require('fs');
const path = require('path');
const { findPackages } = require('./utils/findPackages');

const DESCRIPTIONS = {};

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  '.vscode',
  '.next',
  'dist',
  'build',
]);

/**
 * ✅ Tente de charger les descriptions locales du package
 * - Cherche descriptions.json dans le package
 * - Retourne {} si non trouvé
 */
function loadPackageDescriptions(pkgDir) {
  const descPath = path.join(pkgDir, 'descriptions.json');
  const jsPath = path.join(pkgDir, 'descriptions.js');

  if (fs.existsSync(descPath)) {
    try {
      return JSON.parse(fs.readFileSync(descPath, 'utf-8'));
    } catch (err) {
      console.warn(`⚠️ Invalid JSON in ${descPath}, skipping`);
      return {};
    }
  }

  if (fs.existsSync(jsPath)) {
    try {
      return require(jsPath);
    } catch (err) {
      console.warn(`⚠️ Cannot load ${jsPath}, skipping`);
      return {};
    }
  }

  return {}; // pas de mapping dispo
}

// ✅ Liste uniquement les dossiers racine de src/
function getRootSrcDirs(pkgDir) {
  const srcPath = path.join(pkgDir, 'src');
  if (!fs.existsSync(srcPath)) return [];

  return fs
    .readdirSync(srcPath, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !IGNORE_DIRS.has(e.name))
    .map((e) => e.name);
}

// ✅ Génère Quick Overview à partir du fichier descriptions du package
function generateQuickOverview(pkgDir, descriptionsFromJson = {}) {
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

function generateTree(dir, depth = 0, maxDepth = Infinity, root = dir) {
  const indent = '  '.repeat(depth);
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  let tree = '';
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const pkgJsonPath = path.join(fullPath, 'package.json');

      // ✅ Si c'est un package → stop et mettre un lien
      if (fs.existsSync(pkgJsonPath)) {
        // chemin relatif du lien depuis le root
        const relativeLink = path.relative(
          root,
          path.join(fullPath, 'structure.md')
        );
        tree += `${indent}- ${entry.name}/ → [structure.md](./${relativeLink.replace(/\\\\/g, '/')})\n`;
        continue; // stop ici
      }

      // Sinon on continue
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

// ✅ Met à jour le README du package
function updateReadmeWithStructure(pkgDir, descriptionsFromJson = {}) {
  const readmePath = path.join(pkgDir, 'README.md');
  const structureLink = `👉 See the full structure here: [structure.md](./structure.md)`;
  const quickOverview = generateQuickOverview(pkgDir, descriptionsFromJson);

  // 📝 Si pas de README → on en crée un minimal
  if (!fs.existsSync(readmePath)) {
    const base = `# 📦 ${path.basename(pkgDir)}\n\nNo description provided.\n`;
    fs.writeFileSync(readmePath, base, 'utf-8');
  }

  let readmeContent = fs.readFileSync(readmePath, 'utf-8');

  // 🔄 SUPPRIME tous les anciens blocs "Project Structure" ou "Quick Overview"
  readmeContent = readmeContent
    .replace(/(## 📂 Project Structure[\s\S]*?)(?=\n##|\n#|$)/g, '')
    .replace(/(### 📁 Quick Overview[\s\S]*?)(?=\n##|\n#|$)/g, '');

  // ✅ Nouveau bloc complet
  let newSection = `## 📂 Project Structure\n\n`;
  if (quickOverview) newSection += quickOverview + '\n';
  newSection += `${structureLink}\n`;

  // Ajoute le nouveau bloc **à la fin**
  readmeContent = readmeContent.trim() + '\n\n' + newSection.trim() + '\n';

  fs.writeFileSync(readmePath, readmeContent, 'utf-8');
  console.log(`✅ Overwritten Project Structure section for ${pkgDir}`);
}

// ✅ Génère structure.md du package
function generatePackageStructure(pkgDir, root) {
  const tree = generateTree(pkgDir, 0, Infinity); // on garde full profondeur pour les packages
  const mdContent = `# Project structure for ${path.relative(root, pkgDir)}\n\n${tree}`;
  fs.writeFileSync(path.join(pkgDir, 'structure.md'), mdContent);
  console.log(`✅ Generated structure.md for ${pkgDir} (profondeur infinie)`);
}

// ✅ Point d’entrée
function main() {
  const root = process.argv[2] || process.cwd();
  console.log(`📦 Scanning repo at: ${root}`);

  const packages = findPackages(root);

  // 1️⃣ Vue globale du monorepo → 2 niveaux max
  const rootTree = generateTree(root, 0, 2);
  fs.writeFileSync(
    path.join(root, 'structure.md'),
    `# Monorepo structure\n\n${rootTree}`
  );
  console.log(`✅ Generated root structure.md (2 niveaux max)`);

  // 2️⃣ Pour chaque package → profondeur infinie
  packages.forEach((pkg) => {
    generatePackageStructure(pkg, root); // utilise Infinity
    const descriptionsFromJson = loadPackageDescriptions(pkg);
    updateReadmeWithStructure(pkg, descriptionsFromJson);
  });

  console.log(`🎉 Done!`);
}

main();
