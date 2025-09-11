// eslint.config.js
import { config as eslintConfigWorkspace } from '@ezstart/eslint-config/base';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: ['apps/**', 'packages/**'],
  },
  ...eslintConfigWorkspace,
];
