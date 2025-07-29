#!/usr/bin/env node
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { findPackages } = require('./utils/findPackages');
const ora = require('ora');

// 📦 Config
const ROOT = process.cwd();
const EXPORT_DIR = path.join(path.dirname(ROOT), '.public-export');
const PUBLIC_REPO = 'git@github.com:DFranck/ezstart-public.git';
const WHITELIST_NAMES = require('./public-whitelist.json');

function run(cmd, options = {}) {
  console.log(`▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...options });
}

function cleanPackage(pkgDir) {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const pkgName = pkg.name;

  if (WHITELIST_NAMES.includes(pkgName)) {
    console.log(`✅ Keep FULL package: ${pkgName}`);
    return; // Ne rien supprimer
  }

  console.log(`❌ Clean partial package: ${pkgName}`);

  const entries = fs.readdirSync(pkgDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(pkgDir, entry.name);

    // On garde les fichiers Markdown uniquement
    if (entry.isFile() && entry.name.endsWith('.md')) {
      console.log(`📄 Keep .md file: ${pkgName}/${entry.name}`);
      continue;
    }

    // Supprime tout le reste (fichiers & dossiers)
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function cleanNonWhitelistedPackages(rootDir) {
  const packages = findPackages(rootDir);
  console.log(`🔍 Found ${packages.length} packages`);
  packages.forEach((pkgDir) => {
    try {
      cleanPackage(pkgDir);
    } catch (err) {
      console.warn(`⚠️ Could not clean ${pkgDir}`, err.message);
    }
  });
}

(async () => {
  console.log('🚀 Starting local public export & push');

  // 1. Clean previous export
  if (fs.existsSync(EXPORT_DIR)) {
    console.log(`🗑 Removing old export: ${EXPORT_DIR}`);
    fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
  }

  // 2. Copy everything from current repo
  console.log(`📦 Copying current repo to: ${EXPORT_DIR}`);
  const spinner = ora(`📦 Copying current repo to: ${EXPORT_DIR}`).start();

  try {
    await fse.copy(ROOT, EXPORT_DIR);
    spinner.succeed(`✅ Copied repo to: ${EXPORT_DIR}`);
  } catch (err) {
    spinner.fail('❌ Failed to copy repo');
    throw err;
  }

  // 3. Clean non-whitelisted packages
  process.chdir(EXPORT_DIR);
  cleanNonWhitelistedPackages(EXPORT_DIR);

  // 4. Init new git repo
  run(`git init`);
  try {
    run(`git remote remove origin`);
  } catch (err) {
    console.warn('⚠️ No existing origin to remove');
  }
  run(`git remote add origin ${PUBLIC_REPO}`);
  run(`git checkout -b main`);
  run(`git add .`);
  run(
    `git commit -m "Public snapshot ${new Date().toISOString().slice(0, 10)}"`
  );

  // 5. Push to public repo
  run(`git push --force origin main`);

  try {
    fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
    console.log(`🧹 Cleaned up export directory: ${EXPORT_DIR}`);
  } catch (err) {
    console.warn(
      `⚠️ Failed to clean export directory: ${EXPORT_DIR}`,
      err.message
    );
  }
  console.log(`✅ Public repo updated → ${PUBLIC_REPO}`);
})();
