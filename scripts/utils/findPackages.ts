import fs from 'fs';
import path from 'path';

export const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  '.vscode',
  '.next',
  'dist',
  'build',
  'coverage',
]);

export function findPackages(
  rootDir: string,
  options: {
    includeRootIfHasPackageJson?: boolean;
    ignoreDirs?: Set<string>;
  } = {}
): string[] {
  const {
    includeRootIfHasPackageJson = true,
    ignoreDirs = DEFAULT_IGNORE_DIRS,
  } = options;

  const found = new Set<string>();

  function recurse(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      if (ignoreDirs.has(entry.name)) continue;

      if (fs.existsSync(path.join(fullPath, 'package.json'))) {
        found.add(fullPath);
      } else {
        recurse(fullPath);
      }
    }
  }

  if (
    includeRootIfHasPackageJson &&
    fs.existsSync(path.join(rootDir, 'package.json'))
  ) {
    found.add(rootDir);
  }

  recurse(rootDir);

  return Array.from(found);
}

export function detectRepoType(rootDir: string = process.cwd()): {
  type: 'monorepo' | 'single' | 'empty';
  packages: string[];
} {
  const pkgs = findPackages(rootDir);
  if (pkgs.length > 1) return { type: 'monorepo', packages: pkgs };
  if (pkgs.length === 1 && pkgs[0] === rootDir)
    return { type: 'single', packages: pkgs };
  return { type: 'empty', packages: [] };
}
