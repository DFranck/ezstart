// scripts/generate-apis-config.ts
import fs from 'fs';
import path from 'path';
import { DEFAULT_IGNORE_DIRS, findPackages } from './utils/findPackages';

const OUTPUT_FILE = path.join(process.cwd(), 'apis.config.md');

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    return null;
  }
}

function formatJson(title: string, json: any) {
  return `### ${title}\n\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n`;
}

function getRelativePath(file: string) {
  return path.relative(process.cwd(), file).replace(/\\/g, '/');
}

async function generateApisConfig() {
  const allPackages = findPackages(process.cwd(), {
    ignoreDirs: DEFAULT_IGNORE_DIRS,
  });

  const apiPackages = allPackages.filter((pkgPath) => {
    const pkgJson = readJson(path.join(pkgPath, 'package.json'));
    return pkgJson?.name?.startsWith?.('api-');
  });

  const markdown: string[] = ['# 📦 API Packages Configuration\n'];

  for (const pkgPath of apiPackages) {
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    const tsconfigPath = path.join(pkgPath, 'tsconfig.json');

    const pkgJson = readJson(pkgJsonPath);
    const tsconfig = readJson(tsconfigPath);

    markdown.push(`## 🗂️ \`${pkgJson?.name}\``);
    markdown.push(`📁 Path: \`${getRelativePath(pkgPath)}\`\n`);
    if (pkgJson) markdown.push(formatJson('package.json', pkgJson));
    if (tsconfig) markdown.push(formatJson('tsconfig.json', tsconfig));
  }

  // Ajout de @workspace/typescript-config
  const workspaceConfigPath = path.resolve('packages', 'typescript-config');
  const workspacePkg = readJson(path.join(workspaceConfigPath, 'package.json'));
  const workspaceTsconfig = readJson(
    path.join(workspaceConfigPath, 'tsconfig.json')
  );

  if (workspacePkg || workspaceTsconfig) {
    markdown.push(`\n# 📚 @workspace/typescript-config`);
    markdown.push(`📁 Path: \`${getRelativePath(workspaceConfigPath)}\`\n`);

    const jsonFiles = fs
      .readdirSync(workspaceConfigPath)
      .filter((f) => f.endsWith('.json'));

    for (const file of jsonFiles) {
      const filePath = path.join(workspaceConfigPath, file);
      const content = readJson(filePath);
      if (content) markdown.push(formatJson(file, content));
    }
  }
  // Ajout de @ezstart/api-core
  const apiCorePath = path.resolve('packages', 'api-core');

  if (fs.existsSync(apiCorePath)) {
    const jsonFiles = fs
      .readdirSync(apiCorePath)
      .filter((f) => f.endsWith('.json'))
      .sort();

    const apiCorePkg = readJson(path.join(apiCorePath, 'package.json'));
    const apiCoreName = apiCorePkg?.name || '@ezstart/api-core';

    markdown.push(`\n# ⚙️ ${apiCoreName}`);
    markdown.push(`📁 Path: \`${getRelativePath(apiCorePath)}\`\n`);

    for (const file of jsonFiles) {
      const filePath = path.join(apiCorePath, file);
      const content = readJson(filePath);
      if (content) markdown.push(formatJson(file, content));
    }

    if (apiCorePkg) markdown.push(formatJson('package.json', apiCorePkg));

    const apiCoreTsconfig = readJson(path.join(apiCorePath, 'tsconfig.json'));
    if (apiCoreTsconfig)
      markdown.push(formatJson('tsconfig.json', apiCoreTsconfig));
  }
  // Ajout de la racine du monorepo
  const rootPath = process.cwd();
  const rootPackageJson = readJson(path.join(rootPath, 'package.json'));
  const rootTsconfig = readJson(path.join(rootPath, 'tsconfig.json'));

  if (rootPackageJson || rootTsconfig) {
    markdown.push(`\n# 🏠 Monorepo Root`);
    markdown.push(`📁 Path: \`./\`\n`);

    if (rootPackageJson)
      markdown.push(formatJson('package.json', rootPackageJson));
    if (rootTsconfig) markdown.push(formatJson('tsconfig.json', rootTsconfig));
  }

  fs.writeFileSync(OUTPUT_FILE, markdown.join('\n'), 'utf-8');
  console.log(`✅ apis.config.md generated at ${OUTPUT_FILE}`);
}

generateApisConfig().catch((err) => {
  console.error('❌ Error:', err);
});
