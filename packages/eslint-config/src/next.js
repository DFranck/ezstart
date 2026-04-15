import js from '@eslint/js'
import pluginNext from '@next/eslint-plugin-next'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import { config as baseConfig } from './base.js'

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const nextJsConfig = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // @ezstart app-web conventions (next.js only — these rules are scoped
      // internally to `apps/<app>/web/src/**`).
      // TODO: upgrade both to `error` once the current backlog is cleared:
      //   - `no-raw-fetch`: ~8 matches across 6 files (2 useExternalStats + 4 app files)
      //   - `no-raw-html`: ~46 matches across 22 files (mostly gacha-analyzer + cv-generator)
      '@ezstart/ezstart/no-raw-fetch': 'warn',
      '@ezstart/ezstart/no-raw-html': 'warn',
    },
  },
]
