#!/usr/bin/env tsx
import { execSync, ExecSyncOptions } from 'child_process';
import fs from 'fs';
import fse from 'fs-extra';
import ora from 'ora';
import path from 'path';
import WHITELIST_NAMES from './public-whitelist.json';
import { findPackages } from './utils/findPackages';

// 📦 Config
const ROOT = process.cwd();
const EXPORT_DIR = path.join(path.dirname(ROOT), '.public-export');
const PUBLIC_REPO = 'git@github.com:DFranck/ezstart-public.git';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  '.vscode',
  '.next',
  'dist',
  'build',
  'coverage',
]);

function run(cmd: string, options: ExecSyncOptions = {}): void {
  console.log(`▶ ${cmd}`);
  execSync(cmd, {
    stdio: 'inherit',
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
    ...options,
  });
}

function cleanPackage(pkgDir: string): void {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  const pkgName = pkg.name as string;

  if (WHITELIST_NAMES.includes(pkgName)) {
    console.log(`✅ Keep FULL package: ${pkgName}`);
    return;
  }

  console.log(`❌ Clean partial package: ${pkgName}`);
  const entries = fs.readdirSync(pkgDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(pkgDir, entry.name);

    // keep markdown files only
    if (entry.isFile() && entry.name.endsWith('.md')) {
      console.log(`📄 Keep .md file: ${pkgName}/${entry.name}`);
      continue;
    }

    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function cleanNonWhitelistedPackages(rootDir: string): void {
  const packages = findPackages(rootDir);
  console.log(`🔍 Found ${packages.length} packages`);
  packages.forEach((pkgDir) => {
    try {
      cleanPackage(pkgDir);
    } catch (err: any) {
      console.warn(`⚠️ Could not clean ${pkgDir}`, err.message);
    }
  });
}

async function main(): Promise<void> {
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
    await fse.copy(ROOT, EXPORT_DIR, {
      filter: (src) => {
        const relative = path.relative(ROOT, src);
        const parts = relative.split(path.sep);
        return !parts.some((part) => IGNORE_DIRS.has(part));
      },
    });
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
  } catch {
    console.warn('⚠️ No existing origin to remove');
  }

  run(`git remote add origin ${PUBLIC_REPO}`);
  run(`git checkout -b main`);
  run(`git add .`);
  run(
    `git commit -m "Public snapshot ${new Date().toISOString().slice(0, 10)}"`
  );
  run(`git push --force origin main`);

  // 5. Cleanup export dir
  try {
    fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
    console.log(`🧹 Cleaned up export directory: ${EXPORT_DIR}`);
  } catch (err: any) {
    console.warn(
      `⚠️ Failed to clean export directory: ${EXPORT_DIR}`,
      err.message
    );
  }

  console.log(`✅ Public repo updated → ${PUBLIC_REPO}`);
}

main();
