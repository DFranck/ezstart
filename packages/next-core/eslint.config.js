import { config } from "@ezstart/eslint-config/react-internal"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ignores: ["**/*.js"] // Ignore CommonJS files
  }
]