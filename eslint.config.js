// eslint.config.js
import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigWorkspace from '@workspace/eslint-config/library.js';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: ['apps/**', 'packages/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
    },
  },
  ...eslintConfigWorkspace,
];
