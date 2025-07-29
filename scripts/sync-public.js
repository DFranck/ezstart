#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { findPackages } = require('./utils/findPackages');

// Repos
const PRIVATE_REPO = 'git@github.com:DFranck/ezstart.git';
const PUBLIC_REPO = 'git@github.com:DFranck/ezstart-public.git';

// ✅ Sous Windows → on utilise un dossier local temporaire
const WORKDIR = path.resolve(process.cwd(), '.public-build');

// Charger la whitelist des NAMES de packages.json
const WHITELIST_NAMES = require('./public-whitelist.json');

function run(cmd, options = {}) {
  console.log(`▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...options });
}

function cleanPackage(packageDir) {
  const pkgJsonPath = path.join(packageDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const pkgName = pkg.name;

  if (WHITELIST_NAMES.includes(pkgName)) {
    console.log(`✅ Keep FULL package: ${pkgName} (${packageDir})`);
    return; // on garde tout
  }

  console.log(`❌ Clean partial package: ${pkgName}`);

  const entries = fs.readdirSync(packageDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(packageDir, entry.name);

    // on garde seulement README.md et structure.md
    if (
      entry.isFile() &&
      (entry.name === 'README.md' || entry.name === 'structure.md')
    ) {
      console.log(`📄 Keep doc: ${pkgName}/${entry.name}`);
      continue;
    }

    // sinon, on supprime
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function cleanNonWhitelistedPackages(root) {
  const packages = findPackages(root);

  console.log(`🔍 Found ${packages.length} packages`);

  packages.forEach((pkgDir) => {
    try {
      cleanPackage(pkgDir);
    } catch (err) {
      console.warn(`⚠️ Could not clean ${pkgDir}`, err.message);
    }
  });
}

// === Main script ===
(async () => {
  console.log(`🚀 Sync public started`);

  // 0️⃣ Nettoyer ou créer le WORKDIR
  if (fs.existsSync(WORKDIR)) {
    console.log(`🗑 Cleaning old build dir: ${WORKDIR}`);
    fs.rmSync(WORKDIR, { recursive: true, force: true });
  }

  // 1️⃣ Clone le repo privé dans le WORKDIR
  run(`git clone --depth=1 ${PRIVATE_REPO} "${WORKDIR}"`);
  process.chdir(WORKDIR);

  // 2️⃣ Clean les packages non whitelistés
  cleanNonWhitelistedPackages(WORKDIR);

  // 3️⃣ Reset historique → commit unique
  run(`git checkout --orphan public-snapshot`);
  run(`git add .`);
  run(
    `git commit -m "Public snapshot ${new Date().toISOString().slice(0, 10)}"`
  );

  // 4️⃣ Push forcé vers le repo public
  run(`git push --force ${PUBLIC_REPO} public-snapshot:main`);

  console.log('✅ Repo public updated with filtered snapshot');

  // 5️⃣ Supprimer le WORKDIR pour ne rien laisser traîner
  console.log(`🧹 Cleaning temp build dir...`);
  process.chdir('..');
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  console.log(`✨ Temp build dir removed`);
})();
