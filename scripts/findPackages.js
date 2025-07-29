const fs = require('fs');
const path = require('path');

const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  '.vscode',
  '.next',
  'dist',
  'build',
  'coverage',
]);

/**
 * 🔍 Trouve tous les sous-projets contenant un `package.json`
 *
 * @param {string} rootDir - Chemin de départ (généralement process.cwd())
 * @param {Object} options
 * @param {boolean} [options.includeRootIfHasPackageJson=true] - Inclure le root s'il contient un package.json
 * @param {Set<string>} [options.ignoreDirs] - Dossiers à ignorer
 * @returns {string[]} Liste absolue des chemins des projets
 */
function findPackages(rootDir, options = {}) {
  const {
    includeRootIfHasPackageJson = true,
    ignoreDirs = DEFAULT_IGNORE_DIRS,
  } = options;

  const found = new Set();

  function recurse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (!entry.isDirectory()) continue;
      if (ignoreDirs.has(entry.name)) continue;

      // ✅ Si ce dossier est un projet → on le garde
      if (fs.existsSync(path.join(fullPath, 'package.json'))) {
        found.add(fullPath);
      } else {
        recurse(fullPath);
      }
    }
  }

  // ✅ Si le root lui-même est un projet → on l’ajoute directement
  if (
    includeRootIfHasPackageJson &&
    fs.existsSync(path.join(rootDir, 'package.json'))
  ) {
    found.add(rootDir);
  }

  recurse(rootDir);

  return Array.from(found);
}

/**
 * ✅ Détermine si c’est un monorepo ou un projet simple
 */
function detectRepoType(rootDir = process.cwd()) {
  const pkgs = findPackages(rootDir);
  if (pkgs.length > 1) return { type: 'monorepo', packages: pkgs };
  if (pkgs.length === 1 && pkgs[0] === rootDir)
    return { type: 'single', packages: pkgs };
  return { type: 'empty', packages: [] };
}

module.exports = {
  findPackages,
  detectRepoType,
};
