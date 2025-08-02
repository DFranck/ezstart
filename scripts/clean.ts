import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { findPackages } from './utils/findPackages'; // adapte si besoin

const ROOT_DIR = process.cwd();
const TARGETS = [
  'node_modules',
  'dist',
  '.turbo',
  '.next',
  'coverage',
  'pnpm-lock.yaml',
];

const cleanInDir = (dir: string) => {
  console.log(`\n🧹 Cleaning in ${dir.replace(ROOT_DIR, '.')}`);
  for (const target of TARGETS) {
    const targetPath = join(dir, target);
    if (existsSync(targetPath)) {
      try {
        rmSync(targetPath, { recursive: true, force: true });
        console.log(`✅ Removed ${target}`);
      } catch (e) {
        console.warn(`⚠️ Could not remove ${target} in ${dir}`);
      }
    }
  }
};

const run = () => {
  console.log('🧼 Running full clean...');
  const packages = findPackages(ROOT_DIR, { includeRootIfHasPackageJson: true });

  for (const dir of packages) {
    cleanInDir(dir);
  }

  console.log('\n📦 Pruning pnpm store...');
  try {
    execSync('pnpm store prune', { stdio: 'inherit' });
  } catch (e) {
    console.warn('⚠️ Failed to prune pnpm store');
  }

  console.log('\n✅ Clean completed successfully.');
  console.log('👉 You can now reinstall your dependencies with:\n');
  console.log('   pnpm install\n');
};

try {
  run();
  process.exit(0); // ✅ indique un succès
} catch (e) {
  console.error('❌ Unhandled error during cleaning:', e);
  process.exit(1); // ❌ indique un échec
}


run();
